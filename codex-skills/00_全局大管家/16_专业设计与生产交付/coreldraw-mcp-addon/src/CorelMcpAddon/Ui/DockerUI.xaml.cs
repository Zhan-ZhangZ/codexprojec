using System;
using System.Text;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using CorelMcp.Config;
using CorelMcp.Corel;
using CorelMcp.Mcp;
using corel = Corel.Interop.VGCore;

namespace CorelMcp
{
    /// <summary>
    /// The docker panel hosted in-process by CorelDRAW (declared as a "wpfhost" item in
    /// AppUI.xslt). Shows server status/log and lets the user start/stop the endpoint.
    /// CorelDRAW passes the live Application object to the constructor.
    /// </summary>
    public partial class DockerUI : UserControl
    {
        private readonly corel.Application _corelApp;

        public DockerUI(object app)
        {
            InitializeComponent();
            _corelApp = app as corel.Application;

            try
            {
                // Normally already initialised by the add-on entry point; this covers the
                // case where the docker is loaded without it.
                if (!CorelBridge.IsInitialized && _corelApp != null)
                    CorelBridge.Initialize(_corelApp);
            }
            catch (Exception ex)
            {
                Log.Error("DockerUI could not initialise the Corel bridge", ex);
            }

            try
            {
                // Make opening the docker sufficient to get a running endpoint, even if the
                // add-on entry point was never called.
                Log.Info("DockerUI constructor entered.");
                var config = AddonConfig.Load();
                if (config.AutoStart && McpServer.Instance == null)
                    McpServer.Start(config);
            }
            catch (Exception ex)
            {
                Log.Error("DockerUI could not auto-start the MCP server", ex);
            }

            Log.OnLog += OnLogLine;
            Unloaded += (s, e) => Log.OnLog -= OnLogLine;
            Loaded += (s, e) => { ReplayLog(); RefreshStatus(); };

            ReplayLog();
            RefreshStatus();
        }

        private void OnLogLine(string line)
        {
            // Log events can originate from HTTP worker threads; marshal onto the UI thread.
            try
            {
                Dispatcher.BeginInvoke((Action)(() => AppendLine(line)));
            }
            catch
            {
                // Dispatcher may already be shut down during app exit.
            }
        }

        private void ReplayLog()
        {
            LogList.Items.Clear();
            foreach (var line in Log.Snapshot()) AppendLine(line);
        }

        private void AppendLine(string line)
        {
            LogList.Items.Add(line);
            if (LogList.Items.Count > 500) LogList.Items.RemoveAt(0);
            LogList.ScrollIntoView(LogList.Items[LogList.Items.Count - 1]);
        }

        private void RefreshStatus()
        {
            var server = McpServer.Instance;
            if (server != null && server.IsRunning)
            {
                StatusText.Text = "running - " + server.StatusJson()["toolCount"] + " tools";
                StatusText.Foreground = new SolidColorBrush(Color.FromRgb(0x10, 0x7C, 0x10));
                EndpointText.Text = server.Endpoint;
            }
            else
            {
                StatusText.Text = "stopped";
                StatusText.Foreground = new SolidColorBrush(Color.FromRgb(0x8A, 0x8A, 0x8A));
                try { EndpointText.Text = AddonConfig.Load().HttpPrefix + "mcp"; }
                catch { EndpointText.Text = ""; }
            }
        }

        private void OnStart(object sender, RoutedEventArgs e)
        {
            try
            {
                McpServer.Start(AddonConfig.Load());
            }
            catch (Exception ex)
            {
                ReportFailure("Could not start the MCP server", ex);
            }
            RefreshStatus();
        }

        private void OnStop(object sender, RoutedEventArgs e)
        {
            McpServer.Stop();
            RefreshStatus();
        }

        /// <summary>
        /// Open the tool list so the user can enable or disable individual MCP tools.
        /// The choice is written to config.json and applied to the running server at once.
        /// </summary>
        private void OnTools(object sender, RoutedEventArgs e)
        {
            try
            {
                var config = AddonConfig.Load();
                var disabled = new System.Collections.Generic.HashSet<string>(
                    config.DisabledToolNames(), StringComparer.Ordinal);

                var names = new System.Collections.Generic.List<string>();
                foreach (var tool in ToolCatalog.Build().List()) names.Add(tool.Name);

                var window = new ToolsWindow(names, disabled);
                var owner = Window.GetWindow(this);
                if (owner != null) window.Owner = owner;
                if (window.ShowDialog() != true) return;

                var stillDisabled = window.DisabledNames();
                config.DisabledTools = string.Join(",", stillDisabled);
                config.Save();

                var server = McpServer.Instance;
                if (server != null) server.Protocol.SetDisabledTools(stillDisabled);
                Log.Info("MCP tool list updated: " + (names.Count - stillDisabled.Count) +
                         " of " + names.Count + " tool(s) enabled.");
                RefreshStatus();
            }
            catch (Exception ex)
            {
                ReportFailure("Could not change the MCP tool list", ex);
            }
        }

        private void OnCopyConfig(object sender, RoutedEventArgs e)
        {
            try
            {
                var snippet = new StringBuilder();
                snippet.AppendLine("{");
                snippet.AppendLine("  \"mcpServers\": {");
                snippet.AppendLine("    \"coreldraw\": {");
                snippet.AppendLine("      \"type\": \"http\",");
                snippet.AppendLine("      \"url\": \"" + EndpointText.Text + "\"");
                snippet.AppendLine("    }");
                snippet.AppendLine("  }");
                snippet.AppendLine("}");
                Clipboard.SetText(snippet.ToString());
                Log.Info("Client configuration copied to the clipboard.");
            }
            catch (Exception ex)
            {
                ReportFailure("Could not copy the client configuration", ex);
            }
        }

        /// <summary>Open the client-configuration reference in the default browser.</summary>
        private void OnDocs(object sender, RoutedEventArgs e)
        {
            try
            {
                var start = new System.Diagnostics.ProcessStartInfo(DocsUrl);
                start.UseShellExecute = true;
                System.Diagnostics.Process.Start(start);
                Log.Info("Opened the documentation at " + DocsUrl);
            }
            catch (Exception ex)
            {
                ReportFailure("Could not open the documentation (" + DocsUrl + ")", ex);
            }
        }

        private const string DocsUrl =
            "https://github.com/pefedotov/coreldraw_mcp/blob/main/docs/client-config.md";

        /// <summary>
        /// A panel action failed. The Log pane may not even be on screen, so say it where the user
        /// is looking - a MessageBox - and keep the details in the log for the bug report.
        /// </summary>
        private void ReportFailure(string summary, Exception exception)
        {
            Log.Error(summary, exception);
            MessageBox.Show(summary + ":\r\n\r\n" + exception.Message,
                "CorelDRAW MCP", MessageBoxButton.OK, MessageBoxImage.Warning);
        }
    }
}
