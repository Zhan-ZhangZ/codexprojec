---
name: altium-eda-agent
description: Altium Designer 深度自动化与智能协作 MCP。内置 300 多个开发工具，通过 DelphiScript 桥接与 Altium 交互，支持自然语言触发设计走线、器件网表分析与连接驱动的智能布局。
---

# altium-eda-agent — 电气与智能化设计 MCP 服务

- **项目主页**: https://github.com/salitronic/eda-agent
- **上游版本**: v0.5.0（集成自上游 main 分支 `1b60105`）

## 功能说明

Altium Designer 深度自动化与智能协作 MCP。内置 300 多个开发工具，通过 DelphiScript 桥接与 Altium 交互，支持自然语言触发设计走线、器件网表分析与连接驱动的智能布局。

相较上一版（v0.3.0 时代，约 300 工具），本次升级到上游 v0.5.0，能力面显著扩展：

- **多后端架构**：默认 Altium 后端约 400 个工具；新增 KiCad 9+（IPC API）与 EasyEDA Pro（配套浏览器扩展）后端，双后端注册时工具总数 480+。启动时通过 `EDA_AGENT_BACKEND` 选定后端。
- **通用原语与批量操作**：`obj_query` / `obj_modify` / `obj_create` / `obj_delete` / `run_process` 经晚绑定作用于几乎任意原理图/PCB 对象；`obj_batch_*`、`pcb_place_tracks`、`sch_place_wires`、`sch_place_components` 等批量原语把 N 轮 LLM 往返压缩为一次调用（多元素编辑典型提速 10-100 倍）。
- **设计审查**：`design_review_snapshot` 一次调用聚合 8-12 项审查读取（工程信息、元件、网络、规则、差异、消息、BOM 等）；`design_lint_report` 一轮 IPC 完成 31 项设计审计（参数可见性、悬浮端口、重复位号、离栅格、阻焊开窗比、走线近失端点、板边禁布等），每项检查亦单独暴露为 `audit_*` 工具。
- **规范电路块**：`design_add_circuit_block` 一调用折叠 12 种规范电路（去耦、上拉/下拉、分压、RC 低通/高通、LED 指示、晶振、π 滤波、高低边 MOSFET），自动分配位号并完成全部连线。
- **SPICE 仿真工作流**：`sim_get_readiness` → `sim_attach_primitives` / `sim_attach_model` → `sim_run`，内置“禁止伪造 SPICE 模型”护栏。
- **原理图 ↔ PCB 网表交叉比对**：`crossref_net` 对比同一网络两侧引脚/焊盘清单，捕获 ECO 漂移与幽灵网络。
- **GUI 自动化**：`app_click_menu`、`app_drive_dialogs`、`app_run_ui_command` 等经 Win32 可访问层驱动 Altium 菜单与对话框，在模态框阻塞脚本引擎时仍可工作。
- **双仪表盘**：Altium 内浮动状态窗（请求计数、命令耗时、Detach 按钮）+ 浏览器设计审查面板（`127.0.0.1:8766`，数据手册/MPN/封装覆盖率仪表、问题队列、一键交叉探测）。
- **智能布局**：Sugiyama/力导向基线 + Motif composer（VF2 子图同构识别规范子电路）+ 角色先验修正的三层放置策略；块内曼哈顿走线与电源轨合并。
- **自主设计执行器**：`design_session_*` 持久会话日志 + `design_next_action` 服务端 13 阶段状态机，驱动“规格书 → 板卡”的端到端自主设计，配套上游自带技能 [skills/autodesign](./skills/autodesign/SKILL.md)。
- **预检与运维**：`eda-agent health` / `eda-agent doctor` 离线与在线预检，`app_checkpoint` 内容寻址快照提供可回退性。

## 目录结构

- `src/eda_agent/` — Python MCP 服务器与各后端实现（Altium 桥接、KiCad、EasyEDA、设计引擎、离线文件解析）
- `scripts/altium/` — Altium 侧 DelphiScript 桥接源码（Pascal 单元、状态窗、构建与陷阱检查脚本）
- `extensions/easyeda/` — EasyEDA Pro 浏览器扩展
- `docs/` — 参考文档：[TOOL_REFERENCE.md](./docs/TOOL_REFERENCE.md)（全工具索引，自动生成）、[BACKENDS.md](./docs/BACKENDS.md)（后端说明）、[AUTONOMOUS_DESIGN.md](./docs/AUTONOMOUS_DESIGN.md)（自主设计协议）、[PART_SOURCING.md](./docs/PART_SOURCING.md)、[ui-automation.md](./docs/ui-automation.md)、`altium-delphiscript/`（DelphiScript API 系列参考）
- `skills/autodesign/` — 上游自带的全自主 PCB 设计技能（可复制进客户端技能目录）
- `scripts/train/` — 布局先验与质量模型训练脚本

## 安装与快速开始

```bash
git clone https://github.com/salitronic/eda-agent
cd eda-agent
pip install -e .            # KiCad 后端: pip install -e .[kicad]
```

以 stdio 方式向 MCP 客户端注册 `eda-agent`；Windows + Altium Designer（AD20+ 优先）下先运行 `eda-agent install-scripts` 安装桥接脚本。详见本目录 [README.md](./README.md)。

## 集成说明

按覆盖集成流程自上游 v0.5.0 整体同步；上游的测试套件、CI 配置及 EasyEDA 开发辅助脚本未随技能分发，相关引用已改写为指向上游仓库对应文件的链接。上游文档另有 3 处固有的相对引用缺失（运行期活动日志、部件查询 API 端点、工具元数据模块，均非随仓库分发的文件），按上游原貌保留。
