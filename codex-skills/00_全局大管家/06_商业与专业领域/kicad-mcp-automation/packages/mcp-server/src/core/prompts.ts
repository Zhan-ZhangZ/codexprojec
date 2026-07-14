import { FastMCP } from "fastmcp";

/**
 * Register all prompts with the MCP server
 *
 * @param server The FastMCP server instance
 */
export function registerPrompts(server: FastMCP) {
  // PCB design assistance prompt
  server.addPrompt({
    name: "pcb_design_help",
    description: "Get help with PCB design tasks",
    arguments: [
      {
        name: "task",
        description: "The PCB design task you need help with",
        required: true
      }
    ],
    load: async (args: Record<string, unknown>) => {
      const task = args.task as string;
      return `I'll help you with your PCB design task: ${task}

I have access to the following KiCad automation tools:
- Project initialization and management
- Component placement and management
- DRC (Design Rule Check) and ERC (Electrical Rule Check)
- PCB export to multiple formats (Gerber, PDF, STEP, etc.)
- BOM generation
- 3D model generation
- Auto-routing

What specific assistance do you need with this task?`;
    }
  });

  // DRC/ERC analysis prompt
  server.addPrompt({
    name: "analyze_design_rules",
    description: "Analyze and fix design rule violations",
    arguments: [
      {
        name: "projectPath",
        description: "Path to the KiCad project",
        required: false
      }
    ],
    load: async (args: Record<string, unknown>) => {
      const projectPath = args.projectPath as string | undefined;
      const projectInfo = projectPath ? `for project at ${projectPath}` : "for the current project";
      return `I'll analyze the design rules ${projectInfo} and help fix any violations.

I will:
1. Run DRC (Design Rule Check) to identify layout issues
2. Run ERC (Electrical Rule Check) to identify schematic issues
3. Provide detailed information about any errors or warnings
4. Suggest fixes for common issues

Would you like me to proceed with the analysis?`;
    }
  });

  // Component placement prompt
  server.addPrompt({
    name: "place_components",
    description: "Guide for placing components on PCB",
    arguments: [
      {
        name: "componentType",
        description: "Type of components to place (e.g., resistors, capacitors, ICs)",
        required: false
      }
    ],
    load: async (args: Record<string, unknown>) => {
      const componentType = args.componentType as string | undefined;
      const typeInfo = componentType ? ` for ${componentType}` : "";
      return `I'll help you place components${typeInfo} on your PCB.

I can assist with:
- Adding components with specific footprints and values
- Positioning components at specific coordinates
- Setting component rotation and layer placement
- Getting a list of all current components
- Organizing components for optimal layout

What components would you like to place, and where?`;
    }
  });

  // Export and manufacturing prompt
  server.addPrompt({
    name: "prepare_manufacturing",
    description: "Prepare PCB files for manufacturing",
    arguments: [
      {
        name: "manufacturer",
        description: "Target manufacturer (e.g., JLCPCB, PCBWay)",
        required: false
      }
    ],
    load: async (args: Record<string, unknown>) => {
      const manufacturer = args.manufacturer as string | undefined;
      const mfgInfo = manufacturer ? ` for ${manufacturer}` : "";
      return `I'll help you prepare manufacturing files${mfgInfo}.

I can generate:
- Gerber files (standard PCB fabrication format)
- Drill files (for hole drilling)
- Bill of Materials (BOM) in CSV, XML, or JSON
- 3D models (STEP, VRML, STL) for mechanical verification
- Assembly drawings and documentation

Which files do you need, and in what format?`;
    }
  });

  // Auto-routing assistance prompt
  server.addPrompt({
    name: "auto_route_pcb",
    description: "Help with PCB auto-routing",
    arguments: [],
    load: async () => {
      return `I'll help you auto-route traces on your PCB.

Auto-routing can:
- Automatically connect components based on schematic nets
- Route power and signal traces
- Optimize trace paths for manufacturability
- Respect design rules and clearances

Important considerations:
- Manual review is recommended after auto-routing
- Critical signals may need manual routing
- Design rule compliance should be verified with DRC

Would you like me to proceed with auto-routing?`;
    }
  });

  // Project creation prompt
  server.addPrompt({
    name: "create_kicad_project",
    description: "Guide for creating a new KiCad project",
    arguments: [
      {
        name: "projectType",
        description: "Type of project (e.g., Arduino shield, ESP32 board, power supply)",
        required: false
      }
    ],
    load: async (args: Record<string, unknown>) => {
      const projectType = args.projectType as string | undefined;
      const typeInfo = projectType ? ` for a ${projectType}` : "";
      return `I'll help you create a new KiCad project${typeInfo}.

To get started, I need:
- Project name
- Project location (optional, defaults to current directory)
- Any specific requirements or templates

What would you like to name your project?`;
    }
  });
}
