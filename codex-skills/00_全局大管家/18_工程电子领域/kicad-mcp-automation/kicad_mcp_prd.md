# Product Requirements Document (PRD)

## Product Name

**KiCad MCP** — Modular Command Protocol (MCP) for Automated PCB Design

## Overview

KiCad MCP is an intelligent bridge between KiCad’s native CLI and modern AI/LLM-driven workflows. It enables automation of repetitive and complex PCB design tasks, from project creation to 3D export, using natural language or structured API calls.

## Goals

- Simplify commercial-scale PCB design through automation.
- Enable LLM-based interaction with KiCad for both educational and professional use.
- Integrate BOM generation, cost estimation, and 3D visualization into one pipeline.
- Prepare foundation for future SaaS offering.

## Key Features

| Feature             | Description                                                                 |
| ------------------- | --------------------------------------------------------------------------- |
| AI Project Creation | Generate a new KiCad project from a text prompt.                            |
| Auto-Fix Tools      | Run ERC/DRC checks, repair nets, and fix silkscreen overlaps automatically. |
| 3D Rendering        | Export fully textured 3D models in GLTF/STEP formats.                       |
| BOM Automation      | Generate BOM with OctoPart/JLCPCB data and supplier links.                  |
| Cost Estimation     | Calculate production and assembly costs.                                    |
| Batch Operations    | Execute tasks (fix, export, render) across all project directories.         |
| AI Command Endpoint | Execute free-form design instructions using natural language.               |

## CLI Commands

| Command            | Description                                              |
| ------------------ | -------------------------------------------------------- |
| `kicad-mcp init`   | Create new KiCad project template.                       |
| `kicad-mcp fix`    | Run all cleanup operations and design rule corrections.  |
| `kicad-mcp gen-3d` | Generate realistic 3D PCB model with component textures. |
| `kicad-mcp bom`    | Create BOM and include supplier prices.                  |
| `kicad-mcp route`  | Auto-route traces using AI assistance.                   |
| `kicad-mcp export` | Export Gerber, Pick&Place, and 3D files.                 |
| `kicad-mcp batch`  | Batch run all exports/fixes for multiple projects.       |

## API Endpoints

| Endpoint            | Method | Description                             |
| ------------------- | ------ | --------------------------------------- |
| `/project/create`   | POST   | Create a new KiCad project.             |
| `/project/fix`      | POST   | Perform automated project corrections.  |
| `/project/render3d` | POST   | Generate textured 3D render.            |
| `/project/bom`      | GET    | Retrieve BOM with pricing and metadata. |
| `/project/cost`     | GET    | Estimate PCB manufacturing cost.        |
| `/project/export`   | POST   | Export manufacturing-ready assets.      |
| `/ai/query`         | POST   | Execute LLM command for design tasks.   |

## Tech Stack

| Component    | Technology                                        |
| ------------ | ------------------------------------------------- |
| Language     | TypeScript (Node.js) or C# (ASP.NET Core)         |
| Core Tooling | KiCad CLI, FreeCAD, Python KiCad scripting bridge |
| APIs         | OctoPart, JLCPCB, PCBWay                          |
| Distribution | NPM package (CLI + local API)                     |
| Hosting      | Local or SaaS-integrated                          |

## Integration Targets

- Claude Desktop (MCP Host)
- Custom SaaS for student/enterprise PCB automation

## External API Costs

| Provider      | Purpose                  | Light Use      | Heavy Use       |
| ------------- | ------------------------ | -------------- | --------------- |
| OctoPart      | Component pricing        | Free–$50/month | $100–$300/month |
| JLCPCB        | Manufacturing quotes     | Free           | Free            |
| PCBWay        | Manufacturing quotes     | Free           | Free            |
| OpenAI/Claude | LLM-driven task handling | $20–$100/month | $300+/month     |

## Success Metrics

- ✅ Create and export full KiCad project via one command.
- ✅ Generate accurate 3D and BOM data automatically.
- ✅ Handle 10+ projects in batch under 1 minute.
- ✅ Fully operable via Claude MCP or SaaS API.

## Future Enhancements

- LLM-guided schematic capture using textual instructions.
- Version control and Git integration for collaborative workflows.
- Real-time 3D viewer and AR visualization for PCB previews.
