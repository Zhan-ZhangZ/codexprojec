---
name: text-to-cad
description: "Build123d 引擎级拓扑 Python CAD 参数化建型编译器。跳过传统几何约束 GUI，直接利用 Python 脚本进行工业级实体渲染与装配。支持全自动导出 STEP/STL/GLB 及机器人专用的 URDF 工业图纸。Leading Words: Build123d引擎拓扑建模, Python CAD参数化脚本, URDF机器人图纸导出, 工业级STEP渲染"
metadata:
  version: 0.7.22
  upstream: github.com/earthtojake/text-to-cad
---

# Text-to-CAD 📐

A library of agent skills for CAD, CAE and CAM — generating, inspecting,
sourcing, checking manufacturability, drawing, slicing, and handing off CAD
and robot-description artifacts from natural language prompts. Models are
parametric Python scripts driven by the `build123d` geometry engine through
the `cadgen` CLI; STEP is the primary interchange output.

- **Upstream**: https://github.com/earthtojake/text-to-cad (v0.7.22, MIT)
- **Docs**: https://www.texttocad.dev
- **Layout**: twelve self-contained skills live under `skills/<skill-name>/`,
  each with its own `SKILL.md`, `references/`, and (where needed) `scripts/`
  and `requirements.txt`. Read the matching sub-skill's `SKILL.md` before
  running anything.

## Skill Suite

| Skill                | Entry                                | Use when the task involves...                                                       |
| -------------------- | ------------------------------------ | ----------------------------------------------------------------------------------- |
| CAD                  | `skills/cad/SKILL.md`                | Creating/editing parametric CAD models; STEP main output, plus STL/3MF/GLB; inspecting and measuring geometry. |
| step.parts           | `skills/step-parts/SKILL.md`         | Sourcing off-the-shelf STEP parts (screws, bearings, motors, connectors).           |
| DXF                  | `skills/dxf/SKILL.md`                | 2D DXF drawings: profiles, templates, gaskets, panels, cut layouts.                 |
| Engineering Drawing  | `skills/engineering-drawing/SKILL.md`| PDF orthographic drawings with dimensions, hole callouts and title blocks, projected from the part's geometry. |
| DfM                  | `skills/dfm/SKILL.md`                | Design-for-manufacturing review: sheet metal, CNC machining, injection molding.     |
| DfAM Check           | `skills/dfam-check/SKILL.md`         | Printability per process (FDM/SLS/SLA/PBF/MJF): wall thickness, overhangs, orientation. |
| G-code               | `skills/gcode/SKILL.md`              | Slicing meshes into printer-profiled FDM `.gcode` with OrcaSlicer.                  |
| Bambu Labs           | `skills/bambu-labs/SKILL.md`         | Dry-running, uploading, and cautiously starting Bambu Lab print jobs.               |
| SendCutSend          | `skills/sendcutsend/SKILL.md`        | Pre-flight checks for DXF/STEP uploads to SendCutSend laser cutting.                |
| URDF                 | `skills/urdf/SKILL.md`               | Robot structure files: links, joints, limits, inertials, meshes.                    |
| SRDF                 | `skills/srdf/SKILL.md`               | MoveIt planning groups, end effectors, poses, collision rules on top of a URDF.     |
| SDF                  | `skills/sdf/SKILL.md`                | Simulator models and worlds: frames, physics, sensors, lights.                      |

## Usage Workflow (CAD as the example)

1. **Prompt & design** — accept a natural-language description of the part
   (e.g. "an L-bracket with 5mm screw holes").
2. **Code generation** — write a parametric model as a plain Python script
   with a decorated function returning a `build123d` shape:

   ```python
   from cadgen import build123d as bd
   from cadgen import step

   @step(out="../STEP/bracket.step")
   def bracket():
       return bd.Box(40, 20, 6)

   if __name__ == "__main__":
       bracket()
   ```

3. **Compile & validate** — run the model script and export the target
   format (typically `.step`, the main output); use `cadgen` subcommands for
   one-off exports, snapshots and reference resolution.
4. **Review locally** — start the CAD Viewer with
   `cadgen viewer --host 127.0.0.1 --json --detach`, read `url` from its JSON
   line, and open each artifact as `url?file=<URL-encoded absolute path>`;
   or continue down the chain (DfM/DfAM check → G-code → Bambu Labs).

## Environment

- Runtime engine comes from PyPI, not this repo: `cadgen` and `python` below
  mean `uvx --no-config --managed-python --python 3.13 --from cadgen==0.7.22 <cmd>`
  (requires [uv](https://docs.astral.sh/uv/); first run downloads it).
- `cadgen doctor <skill-dir>` verifies the pinned installation and CAD kernel.
- Standalone analysis tools inside sub-skills (e.g. `dfam-check`, `dfm`)
  declare their own `requirements.txt` next to their `scripts/`.
- Every sub-skill is self-contained at runtime: never import across sibling
  skills; shared runtime helpers live inside each skill's own tree.
