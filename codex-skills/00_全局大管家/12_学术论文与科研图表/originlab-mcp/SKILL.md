---
name: originlab-mcp
description: OriginLab/OriginPro MCP 服务器。基于 originpro 库和 COM 自动化技术，允许 AI 通过自然语言直接控制 Origin 进行数据导入、工作表操作、高阶数据分析（线性/非线性拟合）及高质量科研图表绘制和导出。当需要操作 Origin 软件自动处理数据和绘图时使用。Leading Words: OriginLab MCP, OriginPro自动化绘图, 科研数据处理拟合, COM接口控制, 论文配图生成
---

# OriginLab MCP 技能指南

## 🌟 核心法则 (Golden Rules)

1. **阅读原项目文档**：在尝试配置或使用前，**必须先阅读原项目的 README**（默认 `README.md` 已改为英文，中文文档为 `README.zh.md`），以获取完整的安装前置条件（如需 Windows 系统、Python 3.10+、已授权的 OriginPro）和参数知识。
2. **先读后写**：本次版本起确立"阅读优先"工作流——了解当前 Origin 项目状态时，优先调用 `read_origin_session` 工具或读取 `originlab://session` 资源（`session.py` / `resources.py` 提供，只读、不改动项目）；只有需要修改 Origin 状态时才使用导入、绘图、定制、分析、导出等写操作 tools（共 66 个）。
3. **环境受限认知**：该 MCP 强依赖于本地 Windows 环境及 COM 接口，当用户处于 macOS/Linux 系统时，需提醒用户该工具需在 Windows 下运行 Origin 客户端。
4. **保持 UI 线程警觉**：任何复杂的批量任务，需注意 Origin 程序的挂起和空闲超时策略（默认管理连接可能在空闲 5 分钟后断开）。MCP Server 关闭时默认只 detach，不会直接退出用户已打开的 Origin 实例。

## 🚀 轨迹驱动执行引擎 (Execution Trajectory)

### [STATE] 1: 初始化与状态检查
- **动作**：阅读并遵循 README 中的 Quick Start 进行环境检查。检查用户是否已经启动了 MCP 服务并接入了当前的智能体环境；也可引导用户运行 `scripts/install-and-open.ps1` 一键安装依赖并打开本地状态面板（`originlab-mcp-ui`，http://127.0.0.1:8765/ ）。
- **验证**：调用 `get_origin_info` 检查连接；服务 `originlab-mcp` 处于 running 状态即就绪。
- **流转**：服务可用则进入 [STATE 2]；不可用则指导用户安装 `uv` 及启动。

### [STATE] 2: 会话阅读与数据操作准备
- **动作**：先调用 `read_origin_session`（支持 `include_preview` / `max_preview_rows`）获取当前项目只读快照：工作表、图表、矩阵、Notes、活动对象与项目路径；客户端亦可通过 `resources/read` 读取 `originlab://session`、`originlab://worksheets`、`originlab://graphs`、`originlab://worksheet/{book}/{sheet}`、`originlab://graph/{name}`。随后按需求用数据工具（`data.py`）将 CSV/Excel 等载入工作表。
- **注意**：始终通过 manager 管理连接，确认所在的工作表名称和列数据状态；内存中的活动工作表/图表丢失时，manager 会尝试从当前 Origin 会话恢复。
- **流转**：数据就绪则进入 [STATE 3]。

### [STATE] 3: 制图与高阶定制
- **动作**：调用 `plot.py` 创建科研图表（散点、折线、多轴等），接着通过 `customize.py` 优化视觉呈现（科研标准颜色、坐标轴、字体、图例位置）。需要更换曲线类型时，`change_plot_type` 支持在原图表窗口和图层中**原位重建**（如点线图改柱状图），不产生新图表页。
- **验证**：必要时进行数据拟合或统计分析（`analysis.py`）。
- **流转**：图表成型则进入 [STATE 4]。

### [STATE] 4: 高清导出与资源释放
- **动作**：调用 `export.py` 将图表输出为 PDF/PNG/SVG 格式以供论文使用，并保存 Origin 项目文件。
- **终态**：告知用户文件导出路径；Server 退出时仅 detach Origin 进程，空闲超时后释放 COM。

## ⚠️ 异常处理模式 (Exception Handling Patterns)

- **[COM 拒绝访问 / Origin 卡死]**：如发生超时或无响应，建议用户在桌面手动检查 Origin 是否弹出了模态对话框阻塞了主线程，或者建议用户手动关闭并重启 Origin。
- **[系统不兼容]**：检测到非 Windows 系统尝试直接运行该 COM 服务器时，应当终止并明确告知这是系统架构限制，推荐在 Windows 虚拟机或主力机上部署。
- **[数据列维度不匹配]**：进行制图或拟合前，若返回 `Columns mismatch` 错误，需重新确认工作表的 X/Y/Error 列定义。
- **[OriginPro API 兼容]**：列标签与曲线获取已统一封装，兼容缺少 `WSheet.get_col()` / `GLayer.plot()` 的 originpro 版本；遇到相关报错可先提示用户核对 originpro 版本。

## 🧭 本地状态面板（ui.py）

`originlab-mcp-ui` 提供 Web 面板：启动/停止调试用 MCP Server 子进程、测试 Origin 连接、**阅读会话**（列出当前工作表与图表），并为 Antigravity / Gemini、Cursor、Codex、Trae、Claude Desktop 一键写入 `originlab` MCP 配置（覆盖已有文件前自动备份）。正常使用时仍建议让 AI 客户端按配置自动拉起 Server。
