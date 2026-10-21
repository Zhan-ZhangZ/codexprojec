<p align="center">
  <img src="https://img.shields.io/badge/After%20Effects-2024+-9999FF?style=for-the-badge&logo=adobe-after-effects&logoColor=white" alt="After Effects 2024+"/>
  <img src="https://img.shields.io/badge/MCP-Protocol-00D4AA?style=for-the-badge" alt="MCP Protocol"/>
  <img src="https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js 18+"/>
  <img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge" alt="MIT License"/>
</p>

<h1 align="center">AE-MCP</h1>
<p align="center"><strong>After Effects Model Context Protocol Server</strong></p>
<p align="center">Automate Adobe After Effects with AI through 70+ MCP tools</p>

---

## Overview

AE-MCP is a comprehensive MCP server that enables AI assistants like Claude to directly control Adobe After Effects. It provides **70+ tools** covering the full motion graphics workflow — from creating compositions to applying professional effects and expressions.

### Key Features

| Feature | Description |
|---------|-------------|
| **70+ Tools** | Complete After Effects automation |
| **Animation Presets** | Spring physics, bounce, elastic, slide, fade |
| **Expression Library** | 20+ pre-built expressions (wiggle, loop, physics) |
| **Effect Templates** | One-click professional looks (cinematic, VHS, neon) |
| **Motion Graphics** | Lower thirds, title cards, transitions, logo reveals |
| **Reliable Architecture** | File-based communication for stability |

---

## Requirements

- **Adobe After Effects 2024** or later
- **Node.js 18+**
- **macOS** or **Windows**

---

## Installation

### Step 1: Install the MCP Server

The server is published on npm as `ae-mcp`; no source clone or build is required.

```bash
npx -y ae-mcp
```

### Step 2: Install the CEP Extension

**macOS:**
```bash
./scripts/install-cep.sh
```

**Windows:**
```batch
scripts\install-cep.bat
```

### Step 3: Configure Your AI Assistant

<details>
<summary><strong>Claude Desktop</strong></summary>

Add to your config file:
- **macOS:** the Claude Desktop config directory under the user Library
- **Windows:** the Claude Desktop config directory under the user AppData

```json
{
  "mcpServers": {
    "ae-mcp": {
      "command": "npx",
      "args": ["-y", "ae-mcp"]
    }
  }
}
```
</details>

<details>
<summary><strong>Claude Code (CLI)</strong></summary>

Add to your MCP settings (`~/.claude/settings.json`):

```json
{
  "mcpServers": {
    "ae-mcp": {
      "command": "npx",
      "args": ["-y", "ae-mcp"]
    }
  }
}
```

**Bonus:** This package includes the upstream **Agent Skill** for enhanced After Effects automation. Read [`SKILL/SKILL.md`](SKILL/SKILL.md) for workflow rules, property formats and worked examples.
</details>

### Step 4: Launch After Effects

1. Start **After Effects 2024+**
2. Open **Window > Extensions > AE-MCP**
3. The panel will auto-start and begin listening for commands

---

## Tool Categories

### Project & Composition
`create_project` · `open_project` · `save_project` · `close_project` · `get_project_info` · `import_footage` · `create_composition` · `modify_composition` · `duplicate_composition` · `delete_composition` · `list_compositions` · `get_composition_info`

### Layer Creation
`add_solid_layer` · `add_text_layer` · `add_text_layer_advanced` · `add_shape_layer` · `add_null_layer` · `add_adjustment_layer` · `add_camera_layer` · `add_light_layer` · `add_av_layer` · `precompose_layers` · `modify_layer` · `delete_layer`

### Animation & Keyframing
`set_keyframe` · `set_keyframe_advanced` · `apply_easy_ease` · `set_temporal_ease` · `offset_keyframes` · `scale_keyframe_timing` · `reverse_keyframes` · `copy_keyframes` · `get_keyframes`

### Expressions
`set_expression` · `get_expression` · `remove_expression` · `enable_expression` · `add_expression_control` · `apply_expression_template` · `link_properties`

### Effects
`apply_effect` · `apply_effect_template` · `modify_effect_properties` · `remove_effect` · `reorder_effects` · `copy_effects` · `list_effects`

### Motion Graphics Templates
| Tool | Styles |
|------|--------|
| `create_lower_third` | modern, corporate, news, minimal, social |
| `create_title_card` | cinematic, documentary, social, minimal |
| `create_transition` | wipe, dissolve, push, slide, zoom |
| `create_logo_reveal` | fade, scale, slide, spin, glitch, particle |
| `create_text_animator` | typewriter, fadeIn, scaleIn, slideIn, randomize, wave |

### Asset Management
`import_folder` · `replace_footage` · `organize_project_items` · `find_missing_footage` · `collect_files` · `reduce_project`

### Markers & Timeline
`add_composition_marker` · `add_layer_marker` · `get_markers` · `delete_marker` · `set_work_area`

---

## Quick Examples

### Create an animated intro

```
Create a 1920x1080 composition called "Intro" at 30fps, 5 seconds.
Add a text layer saying "Welcome" centered on screen.
Apply a slideInUp animation with easy ease.
Add a subtle glow effect.
```

### Build a lower third

```
Create a modern lower third:
- Name: "Sarah Chen"
- Title: "Lead Designer"
- Blue primary color
- Animate in and out
- 5 second duration
```

### Add physics-based motion

```
Add a bounce expression to the position of "Logo" layer.
Set amplitude to 0.15, frequency to 4, decay to 6.
```

---

## Animation Presets

### Spring Physics (Remotion-inspired)
| Preset | Description |
|--------|-------------|
| `gentle` | Subtle, smooth animations |
| `default` | Balanced spring motion |
| `wobbly` | Playful, bouncy animations |
| `stiff` | Quick, responsive animations |
| `slow` | Heavy, deliberate motion |
| `bouncy` | High energy bounces |
| `snappy` | Instant, responsive feel |

### Motion Presets
**Fade:** `fadeIn` · `fadeOut`
**Slide:** `slideInLeft` · `slideInRight` · `slideInUp` · `slideInDown` · `slideOutLeft` · `slideOutRight` · `slideOutUp` · `slideOutDown`
**Scale:** `scaleIn` · `scaleOut` · `scaleInBounce`
**Physics:** `bounce` · `elastic` · `overshoot`
**Rotate:** `spinIn` · `spinOut`

---

## Expression Templates

| Category | Templates |
|----------|-----------|
| **Wiggle** | `wiggle` · `wiggleSmooth` · `wiggleFadeIn` · `wiggleFadeOut` |
| **Loop** | `loopCycle` · `loopPingpong` · `loopOffset` · `loopContinue` |
| **Physics** | `bounce` · `inertia` · `springy` · `overshoot` |
| **Linking** | `matchPosition` · `offsetPosition` · `followWithDelay` · `inverseRotation` |
| **Time** | `time` · `clock` · `countdown` · `frameNumber` |

---

## Effect Templates

| Category | Effects |
|----------|---------|
| **Blur** | `gaussianBlur` · `directionalBlur` · `glassBlur` |
| **Color** | `curves` · `colorBalance` · `brightnessContrast` · `vibrance` |
| **Stylistic** | `glow` · `dropShadow` · `vignette` |
| **Creative** | `cinematicLook` · `vhsRetro` · `neonGlow` · `filmGrain` · `chromaticAberration` · `duotone` |

---

## Architecture

This package keeps the Agent Skill, CEP panel and local panel installer. The stdio MCP server itself is installed from the published `ae-mcp` npm package.

### Communication Flow

```
AI Assistant (Claude)
        ↓
   MCP Server (Node.js)
        ↓ Write JSON command
   ~/Documents/ae-mcp-commands/
        ↓ Poll every 100ms
   CEP Extension
        ↓ Execute script
   After Effects DOM
        ↓ Write response
   *.json.response
```

---

## Troubleshooting

<details>
<summary><strong>Extension not appearing in After Effects</strong></summary>

1. Verify debug mode is enabled (the install script does this automatically)
2. Restart After Effects completely
3. Check extension location:
   - **macOS:** `~/Library/Application Support/Adobe/CEP/extensions/ae-mcp`
   - **Windows:** `%APPDATA%\Adobe\CEP\extensions\ae-mcp`
</details>

<details>
<summary><strong>Commands timing out</strong></summary>

1. Ensure the AE-MCP panel is **visible** in After Effects
2. Check `~/Documents/ae-mcp-commands/` for command files
3. Look at the panel's log for errors
</details>

<details>
<summary><strong>Script errors</strong></summary>

1. Open the ExtendScript Toolkit or console in After Effects
2. Verify composition/layer references exist
3. Check for ES3 compatibility issues (no arrow functions, template literals, etc.)
</details>

---

## Contributing

Contributions are welcome in the [upstream repository](https://github.com/ishu86/after-effects-mcp).

## License

MIT

---

<p align="center">
  <sub>Built for motion designers who want to work faster with AI</sub>
</p>
