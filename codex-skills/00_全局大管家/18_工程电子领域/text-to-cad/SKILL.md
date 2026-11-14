---
name: text-to-cad
description: "Text-to-CAD 工程设计与制造技能套件。用 Python/build123d 创建和修改参数化 CAD 零件、装配与 2D 轮廓，导出 STEP、STL、3MF、GLB、DXF，并支持制造可行性检查、FEA 应力分析、工程制图、KiCad PCB 设计与 ERC/DRC、3D 打印切片、SendCutSend 预检、Blender 渲染以及 URDF/SRDF/MJCF 机器人仿真。Leading Words: Text-to-CAD, CAD参数化建模, STEP/STL/3MF/GLB/DXF, PCB设计与KiCad, FEA应力仿真, 工程制图, 3D打印切片, 机器人URDF/SRDF/MJCF"
metadata:
  version: 0.11.10
  upstream: github.com/earthtojake/text-to-cad
---

# Text-to-CAD 工程设计与制造

本技能把自然语言工程需求落到可重建的 Python/build123d 模型、工程检查、制造文件和机器人描述。每个子技能自成一套 Agent 工作流；先按目标选择最窄入口，再只读取该入口明确指向的 references。

## 子技能路由

| 子技能 | 入口 | 适用任务 |
|---|---|---|
| `cad` | `skills/cad/SKILL.md` | 创建/修改参数化零件、装配、机构与 2D 轮廓；导出 STEP、STL、3MF、GLB、DXF；测量、检查、装配动画和制造可行性检查。 |
| `engineering-drawing` | `skills/engineering-drawing/SKILL.md` | 从模型几何投影生成带尺寸、孔标注、隐藏线和标题栏的 PDF 工程图。 |
| `fea` | `skills/fea/SKILL.md` | 对 STEP、xbf 或 text-to-cad 模型做线性静力 FEA：约束、载荷、应力、安全系数和变形。 |
| `pcb` | `skills/pcb/SKILL.md` | 创建、编辑、布局和审查 KiCad 原理图与 PCB，运行 ERC/DRC，导出制造文件、网表和 BOM。 |
| `print3d` | `skills/print3d/SKILL.md` | 用 OrcaSlicer 将网格切片为 3D 打印 G-code/3MF，并谨慎处理 Bambu Lab 打印任务。 |
| `render` | `skills/render/SKILL.md` | 用 Blender 生成产品静帧、转台、动作帧和视频，包括 EEVEE 草稿与 Cycles 成片。 |
| `robot-simulation` | `skills/robot-simulation/SKILL.md` | 生成或审查 ROS URDF、MoveIt SRDF、MuJoCo MJCF 与世界文件。 |
| `sendcutsend` | `skills/sendcutsend/SKILL.md` | 按 SendCutSend 官方资料预检 DXF/STEP 的上传、材料、工艺和可制造性。 |

## 执行顺序

1. 先按任务选择子技能。模型与普通制造流程从 `cad` 开始；PCB 从 `pcb` 开始；机器人描述从 `robot-simulation` 开始。
2. 完整读取命中的子技能 `SKILL.md`。不要根据本路由表猜命令参数。
3. 只加载子技能 `SKILL.md` 当前步骤要求的 `references/**`。这些文件是 Agent 的正式参考层，定义模型契约、导出选项、制造规则、KiCad API、FEA study、渲染场景和机器人格式。
4. 需要运行工具时使用安装后的 `cad` 命令；工具链来自 PyPI 的 `cad-server` / `cad-mcp`，不在本技能目录内重新实现。
5. 交付前执行子技能规定的检查，例如 `cad doctor --check`、模型重建/测量、DfM、ERC/DRC、FEA 结果复核或格式校验。

## 安装与接入

快速安装：

```bash
curl -fsSL https://texttocad.dev/install.sh | sh
```

Windows PowerShell：

```powershell
irm https://www.texttocad.dev/install.ps1 | iex
```

手工安装、各 Agent 接入与更新方式见 `docs/install.md`。Codex MCP 配置见 `codex.mcp.json`，当前固定 `cad-mcp==0.11.10`。

## 运行边界

- CAD 模型的源文件是 Python 脚本；导出文件不是模型源。
- 任何测量、制造判断和 FEA 结论都必须来自实际 `cad` 命令或子技能脚本，不从截图猜测。
- PCB 编辑必须保留 KiCad 原生文件中的未知记录、UUID、库表与伴随文件。
- 3D 打印发送、外部制造下单、覆盖文件或操作真实硬件前，按对应子技能要求取得用户确认。
- 本技能包保留全部 Agent references 与运行脚本，不包含上游的 apps、packages、models、tests 和开发脚本。

## 上游

- 仓库：https://github.com/earthtojake/text-to-cad
- 固定版本：`v0.11.10`
- 固定提交：`337ac4e3c820d37b14eff30f337f82fbf75343c6`
- 官网：https://www.texttocad.dev
