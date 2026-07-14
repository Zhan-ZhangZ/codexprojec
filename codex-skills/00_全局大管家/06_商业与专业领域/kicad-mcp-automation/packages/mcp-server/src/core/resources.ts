import { FastMCP } from "fastmcp";
import { KiCadService } from "./services/index.js";

/**
 * Register all resources with the MCP server
 *
 * @param server The FastMCP server instance
 */
export function registerResources(server: FastMCP) {
  // Current project resource
  server.addResourceTemplate({
    uriTemplate: "kicad://project/current",
    name: "Current KiCad Project",
    mimeType: "application/json",
    description: "Information about the currently open KiCad project",
    arguments: [],
    async load() {
      try {
        const client = KiCadService.getClient();
        const project = await client.getCurrentProject();

        if (!project) {
          return {
            text: JSON.stringify({
              error: "No project currently open"
            }, null, 2)
          };
        }

        return {
          text: JSON.stringify({
            name: project.name,
            path: project.path,
            schematicPath: project.schematicPath,
            pcbPath: project.pcbPath
          }, null, 2)
        };
      } catch (error) {
        return {
          text: JSON.stringify({
            error: error instanceof Error ? error.message : "Unknown error"
          }, null, 2)
        };
      }
    }
  });

  // Components list resource
  server.addResourceTemplate({
    uriTemplate: "kicad://components",
    name: "PCB Components List",
    mimeType: "application/json",
    description: "List of all components in the current PCB",
    arguments: [],
    async load() {
      try {
        await KiCadService.ensureConnected();
        const client = KiCadService.getClient();
        const components = await client.getComponents();

        return {
          text: JSON.stringify({
            count: components.length,
            components: components.map(c => ({
              reference: c.reference,
              value: c.value,
              footprint: c.footprint,
              position: c.position,
              rotation: c.rotation,
              layer: c.layer
            }))
          }, null, 2)
        };
      } catch (error) {
        return {
          text: JSON.stringify({
            error: error instanceof Error ? error.message : "Unknown error",
            count: 0,
            components: []
          }, null, 2)
        };
      }
    }
  });

  // Component by reference resource
  server.addResourceTemplate({
    uriTemplate: "kicad://component/{reference}",
    name: "PCB Component Details",
    mimeType: "application/json",
    description: "Detailed information about a specific component",
    arguments: [{
      name: "reference",
      description: "Component reference (e.g., R1, C1, U1)",
      required: true
    }],
    async load({ reference }: { reference: string }) {
      try {
        await KiCadService.ensureConnected();
        const client = KiCadService.getClient();
        const components = await client.getComponents();
        const component = components.find(c => c.reference === reference);

        if (!component) {
          return {
            text: JSON.stringify({
              error: `Component ${reference} not found`
            }, null, 2)
          };
        }

        return {
          text: JSON.stringify({
            reference: component.reference,
            value: component.value,
            footprint: component.footprint,
            position: component.position,
            rotation: component.rotation,
            layer: component.layer
          }, null, 2)
        };
      } catch (error) {
        return {
          text: JSON.stringify({
            error: error instanceof Error ? error.message : "Unknown error"
          }, null, 2)
        };
      }
    }
  });

  // DRC results resource
  server.addResourceTemplate({
    uriTemplate: "kicad://drc/results",
    name: "DRC Check Results",
    mimeType: "application/json",
    arguments: [],
    description: "Latest Design Rule Check results",
    async load() {
      try {
        await KiCadService.ensureConnected();
        const client = KiCadService.getClient();
        const result = await client.runDRC();

        return {
          text: JSON.stringify({
            passed: result.passed,
            errorCount: result.errors.length,
            warningCount: result.warnings.length,
            errors: result.errors,
            warnings: result.warnings
          }, null, 2)
        };
      } catch (error) {
        return {
          text: JSON.stringify({
            error: error instanceof Error ? error.message : "Unknown error"
          }, null, 2)
        };
      }
    }
  });

  // ERC results resource
  server.addResourceTemplate({
    uriTemplate: "kicad://erc/results",
    name: "ERC Check Results",
    mimeType: "application/json",
    description: "Latest Electrical Rule Check results",
    arguments: [],
    async load() {
      try {
        await KiCadService.ensureConnected();
        const client = KiCadService.getClient();
        const result = await client.runERC();

        return {
          text: JSON.stringify({
            passed: result.passed,
            errorCount: result.errors.length,
            warningCount: result.warnings.length,
            errors: result.errors,
            warnings: result.warnings
          }, null, 2)
        };
      } catch (error) {
        return {
          text: JSON.stringify({
            error: error instanceof Error ? error.message : "Unknown error"
          }, null, 2)
        };
      }
    }
  });
}
