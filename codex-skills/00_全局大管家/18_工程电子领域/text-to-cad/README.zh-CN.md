<div align="center">

<img src="https://raw.githubusercontent.com/earthtojake/text-to-cad/337ac4e3c820d37b14eff30f337f82fbf75343c6/apps/docs/public/brand/logo-texttocad-animated.svg" alt="text-to-cad" width="800">

用 AI 设计实体产品。

[官网](https://www.texttocad.dev)

</div>

# text-to-cad

## 快速开始

macOS / Linux：

```bash
curl -fsSL https://texttocad.dev/install.sh | sh
```

Windows PowerShell：

```powershell
irm https://www.texttocad.dev/install.ps1 | iex
```

安装脚本会在缺少 uv 时先安装 uv，然后按各 Agent 自己的方式配置 text-to-cad：支持插件的应用会得到技能与 CAD MCP 服务器；没有插件机制的应用只安装技能。脚本还会注册 `cad` 命令，并让 CAD 服务器切到新版本。再次运行即可更新。更新后会列出需要重启的应用。

之后可以直接要求 Agent 设计一个零件或装配。Agent 会把模型写成 Python 脚本、运行脚本构建模型，并在 CAD Viewer 中显示。

手工安装、逐应用配置和更新说明见 [docs/install.md](docs/install.md)。

## 功能

text-to-cad 为 Agent 提供本地工程设计工作流，可生成 STEP、GLB、STL、3MF，执行制造检查、生成工程图，并连接 3D 打印、钣金与 CNC 加工流程。

- [**零件与装配**](skills/cad/SKILL.md)：使用 [build123d](https://github.com/gumyr/build123d) 与 [OpenCASCADE](https://github.com/Open-Cascade-SAS/OCCT) 编写参数化 Python 模型，导出 STEP、STL、3MF、GLB，以及用于激光/水刀切割的 [DXF 轮廓与展开图](skills/cad/references/2d-profiles-and-dxf.md)；支持机构关节和动画。
- [**电路板**](skills/pcb/SKILL.md)：设计、编辑、布局和审查 KiCad 原理图与 PCB，运行 ERC/DRC，在订购前复核并导出制造文件。
- [**制造检查**](skills/cad/SKILL.md#can-it-be-made)：按 CNC、钣金、注塑和 3D 打印规则判断零件能否制造，并指出需要修改的部位。
- [**应力检查**](skills/fea/SKILL.md)：用 CalculiX 对零件或粘结装配执行线性静力 FEA，给出峰值应力、屈服安全系数和位移。
- [**工程制图**](skills/engineering-drawing/SKILL.md)：从零件几何投影生成带三视图、隐藏线、中心线、孔标注和标题栏的 PDF 工程图。
- [**渲染**](skills/render/SKILL.md)：用 Blender 生成产品静帧、转台和视频；先用 EEVEE 出草稿，再用 Cycles/GPU 出成片。
- [**制造服务**](skills/sendcutsend/SKILL.md)：按 SendCutSend 官方指南检查 DXF/STEP 上传与订单要求；[3D 打印切片](skills/print3d/SKILL.md)使用 OrcaSlicer，并可交给 Bambu Connect 或 Bambu Studio。
- [**机器人仿真**](skills/robot-simulation/SKILL.md)：生成或审查 ROS URDF、MoveIt SRDF 和 MuJoCo MJCF 机器人/世界描述。

## 参考层

Agent 的详细参考全部保留在各子技能的 `references/` 目录中，包括 CAD 模型契约、build123d、导出、测量、制造规则、工程图、FEA、KiCad API/布局/审查、Blender 场景、MuJoCo 与 SendCutSend 规则。执行任务时应先读取对应子技能的 `SKILL.md`，再按其中指引加载必要参考。

## 参与贡献

text-to-cad 使用 MIT 许可证并公开开发。

- **Bug 与插件请求**：提交 [Issue](https://github.com/earthtojake/text-to-cad/issues/new)。附带模型脚本和 `cad doctor --check` 输出最便于定位。安全问题请按 [SECURITY.md](https://github.com/earthtojake/text-to-cad/blob/337ac4e3c820d37b14eff30f337f82fbf75343c6/SECURITY.md) 私下报告。
- **问题、想法与作品**：加入 [Discord](https://discord.gg/5FGB9DwJYU)。
- **代码、技能与示例模型**：开发入口见 [CONTRIBUTING.md](https://github.com/earthtojake/text-to-cad/blob/337ac4e3c820d37b14eff30f337f82fbf75343c6/CONTRIBUTING.md) 和 [AGENTS.md](https://github.com/earthtojake/text-to-cad/blob/337ac4e3c820d37b14eff30f337f82fbf75343c6/AGENTS.md)。

默认情况下，text-to-cad 会上报使用统计与崩溃报告，并附带随机 ID；不会包含文件、路径或提示词。关闭方式和完整说明见[隐私政策](https://www.texttocad.dev/privacy-policy)。

本仓库集成固定上游 `v0.11.10`（`337ac4e3c820d37b14eff30f337f82fbf75343c6`）。本地裁剪与链接适配见 `LOCAL-PATCHES.md`。
