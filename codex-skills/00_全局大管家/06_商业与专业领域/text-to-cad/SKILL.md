---
name: text-to-cad
description: Build123d 引擎级拓扑 Python CAD 参数化建型编译器。跳过传统几何约束 GUI，直接利用 Python 脚本进行工业级实体渲染与装配。支持全自动导出 STEP/STL/GLB 及机器人专用的 URDF 工业图纸。Leading Words: Build123d引擎拓扑建模, Python CAD参数化脚本, URDF机器人图纸导出, 工业级STEP渲染
metadata:
  version: 0.4.28
  upstream: github.com/earthtojake/text-to-cad
---

# Text-to-CAD 📐

A library of agent skills for CAD, CAE and CAM — generating, inspecting,
sourcing, slicing, and handing off CAD and robot-description artifacts from
natural language prompts, using Python scripts and the `build123d` geometry
engine. STEP is the primary interchange output.

- **Upstream**: https://github.com/earthtojake/text-to-cad (v0.4.28, MIT)
- **Docs**: https://www.texttocad.dev
- **Layout**: twelve self-contained skills live under `skills/<skill-name>/`,
  each with its own `SKILL.md`, `references/`, and `scripts/`. Read the
  matching sub-skill's `SKILL.md` before running anything.

## Skill Suite

| Skill             | Entry                          | Use when the task involves...                                                          |
| ----------------- | ------------------------------ | -------------------------------------------------------------------------------------- |
| CAD               | `skills/cad/SKILL.md`          | Creating/editing CAD models from text or images; STEP main output, plus STL/3MF/GLB.   |
| CAD Viewer        | `skills/cad-viewer/SKILL.md`   | Local browser previews of `.step`/`.stl`/`.glb`/`.dxf`/URDF-family files.              |
| step.parts        | `skills/step-parts/SKILL.md`   | Sourcing off-the-shelf STEP parts (screws, bearings, motors, connectors).              |
| DXF               | `skills/dxf/SKILL.md`          | 2D DXF drawings: profiles, templates, gaskets, cut layouts.                            |
| URDF              | `skills/urdf/SKILL.md`         | Robot structure files: links, joints, limits, inertials, meshes.                       |
| SRDF              | `skills/srdf/SKILL.md`         | MoveIt planning groups, end effectors, poses, collision rules on top of a URDF.        |
| SDF               | `skills/sdf/SKILL.md`          | Simulator models and worlds: frames, physics, sensors, lights.                         |
| SendCutSend       | `skills/sendcutsend/SKILL.md`  | Pre-flight checks for DXF/STEP uploads to SendCutSend laser cutting.                   |
| DfAM Check        | `skills/dfam-check/SKILL.md`   | Printability per process: wall thickness, overhangs, support volume, orientation.      |
| G-code            | `skills/gcode/SKILL.md`        | Slicing meshes into validated, printer-profiled FDM `.gcode` with real slicer CLIs.    |
| Bambu Labs        | `skills/bambu-labs/SKILL.md`   | Dry-running, uploading, and cautiously starting Bambu Lab print jobs.                  |
| Implicit CAD      | `skills/implicit-cad/SKILL.md` | Browser-native implicit CAD via GLSL signed-distance fields (experimental).            |

## Usage Workflow (CAD as the example)

1. **Prompt & design** — accept a natural-language description of the part
   (e.g. "an L-bracket with 5mm screw holes").
2. **Code generation** — write a parametric Python model with `build123d`:

   ```python
   from build123d import *

   with BuildPart() as bracket:
       Box(50, 50, 10)
       # fillets, holes, pockets...
   ```

3. **Compile & validate** — run the script to build the solid and export the
   target format (typically `.step`, the main output).
4. **Review locally** — hand the artifact to the CAD Viewer skill for a browser
   preview, or continue down the chain (DfAM check → G-code → Bambu Labs).

## Environment

- Python 3.11+; per-skill dependencies are declared in each skill's own
  `requirements.txt` (e.g. `pip install -r skills/cad/requirements.txt`).
- The CAD Viewer skill ships its prebuilt bundle under
  `skills/cad-viewer/scripts/viewer/` and starts with
  `npm --prefix skills/cad-viewer/scripts/viewer run start`.
- Every sub-skill is self-contained at runtime: never import across sibling
  skills; shared runtime helpers are vendored inside each skill's `scripts/`.
