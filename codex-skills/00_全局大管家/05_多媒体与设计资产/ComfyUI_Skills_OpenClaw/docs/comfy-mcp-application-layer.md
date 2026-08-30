---
title: Official Local Comfy MCP Integration
description: Use ComfyUI Skills as the application layer over the fast workflow CLI and the official local Comfy MCP discovery and orchestration interface.
permalink: /comfy-mcp-application-layer/
---

# Official Local Comfy MCP Integration

This project supports two complementary interfaces under one Agent Skill:

```text
Agent request
  -> ComfyUI Skill application layer
      -> comfyui-skill CLI for known workflows and repeated execution
      -> official local Comfy MCP for live discovery, validation, and orchestration
```

The CLI remains the primary path for workflows already imported into this project. It exposes a stable business parameter schema and has low overhead for chat execution, scripts, and batch jobs.

The official local Comfy MCP is used when the Agent needs current ecosystem knowledge: finding templates, inspecting installed nodes and models, validating a raw workflow, adapting template slots, managing a submitted job, or operating the local ComfyUI lifecycle.

## Connect The Official MCP

Register the server using Comfy's [local MCP connection guide](https://docs.comfy.org/agent-tools/mcp#local-comfy-mcp-connection). When the Agent host exposes the MCP tools, the Skill calls them directly.

Shell-only Agent hosts can use the repository bridge:

```bash
python ./scripts/comfy_mcp.py probe
python ./scripts/comfy_mcp.py tools
python ./scripts/comfy_mcp.py call search_templates --arguments '{"query":"background removal"}'
```

The bridge launches the official `comfy-mcp` stdio server. It does not duplicate or replace official MCP behavior.

## Routing Rules

| Request | Route |
| --- | --- |
| Run an existing `<server>/<workflow>` | `comfyui-skill` CLI |
| Repeat or batch a stable workflow | `comfyui-skill` CLI |
| Discover a current template, node, or model | Official MCP |
| Validate or adapt a raw workflow | Official MCP |
| Poll an MCP-submitted job and fetch its files | Official MCP |
| Install, update, restart, switch versions, or spend credits | Official MCP after explicit confirmation |

For long MCP work, use `run_workflow(wait=false)` or `run_template(wait=false)`, then `job`, then `fetch_outputs`. Once a route returns a `prompt_id`, stay on that route so one user request cannot accidentally generate twice.

The detailed Agent contract lives in [`references/comfy-mcp.md`](https://github.com/HuangYuChuh/ComfyUI_Skills_OpenClaw/blob/main/references/comfy-mcp.md).
