import { FastMCP } from "fastmcp";
import { z } from "zod";
import { KiCadService, ProjectCreationService } from "./services/index.js";

/**
 * Register all tools with the MCP server
 *
 * @param server The FastMCP server instance
 */
export function registerTools(server: FastMCP) {
  // Project initialization tool with advanced features
  server.addTool({
    name: "kicad_init_project",
    description: "Initialize a new KiCad project with optional template selection and natural language prompt support",
    parameters: z.object({
      name: z.string().describe("Project name"),
      path: z.string().optional().describe("Project path (defaults to current directory)"),
      template: z.string().optional().describe("Template ID (basic, esp32-dev, arduino-shield, power-supply)"),
      prompt: z.string().optional().describe("Natural language description of the project to create"),
      metadata: z.object({
        author: z.string().optional(),
        description: z.string().optional(),
        tags: z.array(z.string()).optional(),
        version: z.string().optional()
      }).optional().describe("Project metadata")
    }),
    execute: async (params) => {
      const projectService = new ProjectCreationService();

      // Validate parameters
      const validation = projectService.validateParams({
        name: params.name,
        path: params.path || '.',
        template: params.template,
        metadata: params.metadata,
        prompt: params.prompt
      });

      if (!validation.valid) {
        return JSON.stringify({
          success: false,
          errors: validation.errors,
          message: `Validation failed: ${validation.errors.join(', ')}`
        }, null, 2);
      }

      // Create project
      const result = await projectService.createProject({
        name: params.name,
        path: params.path || '.',
        template: params.template,
        metadata: params.metadata,
        prompt: params.prompt
      });

      return JSON.stringify(result, null, 2);
    }
  });

  // List available project templates
  server.addTool({
    name: "kicad_list_templates",
    description: "List all available project templates",
    parameters: z.object({}),
    execute: async () => {
      const projectService = new ProjectCreationService();
      const templates = projectService.getTemplates();

      return JSON.stringify({
        success: true,
        count: templates.length,
        templates: templates.map(t => ({
          id: t.id,
          name: t.name,
          description: t.description,
          layers: t.layers,
          boardSize: t.boardSize
        })),
        message: `Found ${templates.length} available template(s)`
      }, null, 2);
    }
  });

  // Open existing project tool
  server.addTool({
    name: "kicad_open_project",
    description: "Open an existing KiCad project",
    parameters: z.object({
      path: z.string().describe("Path to the KiCad project file (.kicad_pro)")
    }),
    execute: async (params) => {
      await KiCadService.ensureConnected();
      const client = KiCadService.getClient();

      const project = await client.openProject(params.path);

      return JSON.stringify({
        success: true,
        project: {
          name: project.name,
          path: project.path,
          schematicPath: project.schematicPath,
          pcbPath: project.pcbPath
        },
        message: `Successfully opened project "${project.name}"`
      }, null, 2);
    }
  });

  // Run DRC checks tool
  server.addTool({
    name: "kicad_run_drc",
    description: "Run Design Rule Check (DRC) on the current PCB",
    parameters: z.object({
      project: z.string().optional().describe("Project path (uses current project if not specified)")
    }),
    execute: async (params) => {
      await KiCadService.ensureConnected();
      const client = KiCadService.getClient();

      if (params.project) {
        await client.openProject(params.project);
      }

      const result = await client.runDRC();

      return JSON.stringify({
        success: true,
        drc: {
          passed: result.passed,
          errorCount: result.errors.length,
          warningCount: result.warnings.length,
          errors: result.errors,
          warnings: result.warnings
        },
        message: result.passed
          ? "DRC check passed successfully!"
          : `DRC check failed with ${result.errors.length} error(s) and ${result.warnings.length} warning(s)`
      }, null, 2);
    }
  });

  // Run ERC checks tool
  server.addTool({
    name: "kicad_run_erc",
    description: "Run Electrical Rule Check (ERC) on the schematic",
    parameters: z.object({
      project: z.string().optional().describe("Project path (uses current project if not specified)")
    }),
    execute: async (params) => {
      await KiCadService.ensureConnected();
      const client = KiCadService.getClient();

      if (params.project) {
        await client.openProject(params.project);
      }

      const result = await client.runERC();

      return JSON.stringify({
        success: true,
        erc: {
          passed: result.passed,
          errorCount: result.errors.length,
          warningCount: result.warnings.length,
          errors: result.errors,
          warnings: result.warnings
        },
        message: result.passed
          ? "ERC check passed successfully!"
          : `ERC check failed with ${result.errors.length} error(s) and ${result.warnings.length} warning(s)`
      }, null, 2);
    }
  });

  // Add component tool
  server.addTool({
    name: "kicad_add_component",
    description: "Add a component to the PCB",
    parameters: z.object({
      reference: z.string().describe("Component reference (e.g., R1, C1, U1)"),
      value: z.string().describe("Component value"),
      footprint: z.string().describe("Footprint name"),
      x: z.number().describe("X position in mm"),
      y: z.number().describe("Y position in mm"),
      rotation: z.number().optional().default(0).describe("Rotation in degrees"),
      layer: z.enum(["front", "back"]).optional().default("front").describe("Board layer")
    }),
    execute: async (params) => {
      await KiCadService.ensureConnected();
      const client = KiCadService.getClient();

      const component = await client.addComponent({
        value: params.value,
        footprint: params.footprint,
        position: { x: params.x, y: params.y },
        rotation: params.rotation,
        layer: params.layer
      });

      return JSON.stringify({
        success: true,
        component: {
          reference: component.reference,
          value: component.value,
          footprint: component.footprint,
          position: component.position,
          rotation: component.rotation,
          layer: component.layer
        },
        message: `Successfully added component ${component.reference} (${component.value})`
      }, null, 2);
    }
  });

  // Get components tool
  server.addTool({
    name: "kicad_get_components",
    description: "Get all components from the current PCB",
    parameters: z.object({
      project: z.string().optional().describe("Project path (uses current project if not specified)")
    }),
    execute: async (params) => {
      await KiCadService.ensureConnected();
      const client = KiCadService.getClient();

      if (params.project) {
        await client.openProject(params.project);
      }

      const components = await client.getComponents();

      return JSON.stringify({
        success: true,
        count: components.length,
        components: components.map((c: any) => ({
          reference: c.reference,
          value: c.value,
          footprint: c.footprint,
          position: c.position,
          rotation: c.rotation,
          layer: c.layer
        })),
        message: `Found ${components.length} component(s)`
      }, null, 2);
    }
  });

  // Export tool
  server.addTool({
    name: "kicad_export",
    description: "Export PCB to various formats (gerber, drill, pdf, svg, step, vrml)",
    parameters: z.object({
      format: z.enum(["gerber", "drill", "pdf", "svg", "step", "vrml"]).describe("Export format"),
      outputPath: z.string().describe("Output path for exported files"),
      project: z.string().optional().describe("Project path (uses current project if not specified)")
    }),
    execute: async (params) => {
      await KiCadService.ensureConnected();
      const client = KiCadService.getClient();

      if (params.project) {
        await client.openProject(params.project);
      }

      const files = await client.export({
        format: params.format,
        outputDir: params.outputPath
      });

      return JSON.stringify({
        success: true,
        format: params.format,
        outputPath: params.outputPath,
        files: files,
        message: `Successfully exported ${files.length} file(s) in ${params.format} format`
      }, null, 2);
    }
  });

  // Generate BOM tool
  server.addTool({
    name: "kicad_generate_bom",
    description: "Generate Bill of Materials (BOM) for the project",
    parameters: z.object({
      format: z.enum(["csv", "xml", "json"]).optional().default("csv").describe("BOM format"),
      outputPath: z.string().describe("Output path for BOM file"),
      project: z.string().optional().describe("Project path (uses current project if not specified)")
    }),
    execute: async (params) => {
      await KiCadService.ensureConnected();
      const client = KiCadService.getClient();

      if (params.project) {
        await client.openProject(params.project);
      }

      const bomPath = await client.generateBOM(params.outputPath);

      return JSON.stringify({
        success: true,
        format: params.format,
        outputPath: bomPath,
        message: `Successfully generated BOM at ${bomPath}`
      }, null, 2);
    }
  });

  // Generate 3D model tool
  server.addTool({
    name: "kicad_generate_3d",
    description: "Generate 3D model of the PCB",
    parameters: z.object({
      format: z.enum(["step", "vrml", "stl"]).optional().default("step").describe("3D model format"),
      outputPath: z.string().describe("Output path for 3D model"),
      project: z.string().optional().describe("Project path (uses current project if not specified)")
    }),
    execute: async (params) => {
      await KiCadService.ensureConnected();
      const client = KiCadService.getClient();

      if (params.project) {
        await client.openProject(params.project);
      }

      const modelPath = await client.generate3D(params.outputPath, params.format as 'step' | 'vrml');

      return JSON.stringify({
        success: true,
        format: params.format,
        outputPath: modelPath,
        message: `Successfully generated 3D model at ${modelPath}`
      }, null, 2);
    }
  });

  // Auto-route tool
  server.addTool({
    name: "kicad_auto_route",
    description: "Automatically route PCB traces",
    parameters: z.object({
      project: z.string().optional().describe("Project path (uses current project if not specified)")
    }),
    execute: async (params) => {
      await KiCadService.ensureConnected();
      const client = KiCadService.getClient();

      if (params.project) {
        await client.openProject(params.project);
      }

      await client.autoRoute();

      return JSON.stringify({
        success: true,
        message: `Auto-routing completed successfully`
      }, null, 2);
    }
  });
}
