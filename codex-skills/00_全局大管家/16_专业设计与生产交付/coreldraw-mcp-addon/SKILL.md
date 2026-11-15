---
name: coreldraw-mcp-addon
description: CorelDRAW 内置 MCP Add-on 技能集合。用于在 Windows 版 CorelDRAW 2025/2026 中连接本机 Add-on，随后完成文档绘制、图形与文字编辑、图层/特效/布尔运算以及 PNG、PDF、SVG、EPS、AI、DXF 等导入导出。适用于要求操作真实打开文档、复用 CorelDRAW 对象模型与撤销历史的自动化设计任务。
---

# CorelDRAW MCP Add-on

这是一个集合入口。Add-on 运行在 `CorelDRAW.exe` 内部，通过本机 Streamable HTTP MCP
端点驱动当前打开的文档；它不是可脱离 CorelDRAW 独立运行的绘图库。

## 适用条件

- Windows 上的 CorelDRAW Graphics Suite 2025（26）或 2026（27）。
- CorelDRAW 已启动，且 `Window ▸ Dockers ▸ Corel MCP` 或 `Tools ▸ Corel MCP`
  面板显示 `running`。
- MCP 客户端支持 Streamable HTTP，或可以通过 stdio 桥接。
- 默认端点为 `http://127.0.0.1:8765/mcp`；健康检查为 `/health`。

先阅读项目根目录的 `README.zh-CN.md`。安装、客户端配置和完整工具边界分别在
`docs/installing.md`、`docs/client-config.md` 与 `docs/tools.md`。

## 选择子技能

| 任务 | 读取入口 |
|---|---|
| 安装 Add-on、连接客户端、处理 401/403、端口、日志或面板问题 | `skills/coreldraw-mcp-setup/SKILL.md` |
| 新建或修改文档中的图形、曲线、文字、填色、轮廓、特效、图层和页面 | `skills/coreldraw-mcp-drawing/SKILL.md` |
| 导入素材，或导出 PNG/JPEG/TIFF、PDF/SVG/EPS/AI/DXF | `skills/coreldraw-mcp-export/SKILL.md` |

## 最短执行流程

1. 连接或排障时先读 setup 子技能，并调用 `server_status`；不要先猜客户端配置。
2. 编辑前读取 `get_document_info`、`list_layers` 和 `list_shapes`。坐标以文档单位表示，
   Y 轴向上，形状索引是活动图层上从 1 开始的动态索引。
3. 绘制、变形或组合形状时按 drawing 子技能的坐标、选择器和索引规则执行；新建基本图形
   默认带发丝轮廓，需要纯填色时显式调用 `set_outline_none`。
4. 导入或导出时按 export 子技能确认范围、路径和栅格尺寸，并在完成后检查文件确实写入。
5. 对真实文档的修改进入 CorelDRAW 自身的撤销历史；破坏性操作前说明影响，避免在用户
   未保存时擅自重启 CorelDRAW。

## 安全边界

默认只监听 `127.0.0.1`。能够访问该端点的人可以以 CorelDRAW 的权限读写文档和文件；
不要在没有 `AuthToken` 的情况下扩大 `BindAddress`。需要跨机器访问时，同时配置认证、
限制 `AllowedRoots`，并通过受控隧道暴露端点。

## 已知限制

刀、橡皮擦、网格填充、智能绘图等操作没有可用的 VGCore 编程接口；不要伪造结果。完整覆盖
清单和替代方案见 `docs/tools.md` 与 drawing 子技能。
