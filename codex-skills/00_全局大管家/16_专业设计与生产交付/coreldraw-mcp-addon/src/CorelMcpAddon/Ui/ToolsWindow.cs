using System.Collections.Generic;
using System.Windows;
using System.Windows.Controls;

namespace CorelMcp
{
    /// <summary>
    /// The dialog behind the docker's "Tools" button: every MCP tool with a tick box.
    /// Unticking a tool hides it from tools/list and makes tools/call reject it.
    /// </summary>
    public class ToolsWindow : Window
    {
        private readonly List<CheckBox> _boxes = new List<CheckBox>();

        public ToolsWindow(IEnumerable<string> toolNames, HashSet<string> disabled)
        {
            Title = "MCP tools";
            Width = 340;
            Height = 480;
            WindowStartupLocation = WindowStartupLocation.CenterOwner;

            var list = new StackPanel();
            foreach (var name in toolNames)
            {
                var box = new CheckBox
                {
                    Content = name,
                    IsChecked = !disabled.Contains(name),
                    Margin = new Thickness(0, 1, 0, 1)
                };
                _boxes.Add(box);
                list.Children.Add(box);
            }

            var scroll = new ScrollViewer
            {
                VerticalScrollBarVisibility = ScrollBarVisibility.Auto,
                Content = list
            };

            var all = new Button { Content = "Enable all", Width = 90, Margin = new Thickness(0, 0, 6, 0) };
            all.Click += (sender, e) => SetAll(true);

            var none = new Button { Content = "Disable all", Width = 90, Margin = new Thickness(0, 0, 6, 0) };
            none.Click += (sender, e) => SetAll(false);

            var ok = new Button { Content = "OK", Width = 70, IsDefault = true, Margin = new Thickness(0, 0, 6, 0) };
            ok.Click += (sender, e) => { DialogResult = true; };

            var cancel = new Button { Content = "Cancel", Width = 70, IsCancel = true };

            var buttons = new StackPanel { Orientation = Orientation.Horizontal, Margin = new Thickness(0, 8, 0, 0) };
            buttons.Children.Add(all);
            buttons.Children.Add(none);
            buttons.Children.Add(ok);
            buttons.Children.Add(cancel);

            var root = new DockPanel();
            DockPanel.SetDock(buttons, Dock.Bottom);
            root.Children.Add(buttons);
            root.Children.Add(scroll);
            Content = root;
        }

        /// <summary>Names of the tools the user left unticked.</summary>
        public List<string> DisabledNames()
        {
            var names = new List<string>();
            foreach (var box in _boxes)
            {
                if (box.IsChecked != true) names.Add((string)box.Content);
            }
            return names;
        }

        private void SetAll(bool enabled)
        {
            foreach (var box in _boxes) box.IsChecked = enabled;
        }
    }
}
