using System;
using CorelMcp;
using CorelMcp.Config;
using CorelMcp.Corel;
using CorelMcp.Mcp;
using corel = Corel.Interop.VGCore;

namespace CGS
{
    /// <summary>
    /// Add-on entry point. CorelDRAW instantiates this class (and hands it the live
    /// Application object) when it discovers the add-on in the Addons folder.
    /// This is where the in-process MCP server is started.
    /// </summary>
    public class Addon
    {
        public Addon(corel.Application Application)
        {
            try
            {
                CorelBridge.Initialize(Application);

                var config = AddonConfig.Load();
                Log.Info("CGS.Addon constructor entered; AutoStart=" + config.AutoStart + ".");
                if (config.AutoStart)
                {
                    McpServer.Start(config);
                }
                else
                {
                    Log.Info("AutoStart is disabled in config.json; open the Corel MCP docker to start the server.");
                }
            }
            catch (Exception ex)
            {
                // Never let a startup failure break CorelDRAW itself.
                Log.Error("MCP add-on startup failed", ex);
            }
        }
    }
}
