---
name: drawio-scientific-illustrator
description: 在可见的 draw.io 桌面画布中实时重绘、追踪、修改和导出科学插图与示意图的 Codex 插件。通过 draw.io 自身的图模型 API 逐步驱动绘图，支持 PNG/SVG/PDF 导出，不使用系统鼠标键盘自动化。Leading Words: draw.io科研插图重绘, 实时画布绘图MCP, 可编辑科学示意图, draw.io图元逐步构建
---

# Draw.io Scientific Illustrator（v1.5.4 集成副本）

> **执行前必读**：使用本技能前，请先用 `view_file` 阅读本目录下的 [`README.md`](./README.md)，获取完整的安装要求、三平台（Microsoft PowerPoint、WPS 演示、draw.io）使用方式、环境变量配置与提示词模板。

## 技能定位

本目录是上游 [icebird1998/scientific-illustrator](https://github.com/icebird1998/scientific-illustrator) **v1.5.4** 的覆盖集成副本（上游前身为 drawio-scientific-illustrator 项目，已升级整合为三软件科学插图插件）。三个 MCP 服务（drawio-live、drawio-file-utils、powerpoint-live）由 [`plugins/scientific-illustrator/.mcp.json`](plugins/scientific-illustrator/.mcp.json) 声明，六个子技能位于 `plugins/scientific-illustrator/skills/`，覆盖「设计—绘制—评审—修正」四角色（Designer、Drawer、Reviewer、Corrector）全流程：

| 子技能 | 职责 |
|---|---|
| `design-scientific-figure` | 无参考图时按需求设计新插图、图形摘要或机理示意图 |
| `recreate-scientific-figure` | 有参考图时的后端无关重绘总纲 |
| `recreate-scientific-figure-in-drawio` | 在可见 draw.io 画布中逐步重绘（本技能主入口） |
| `edit-powerpoint-live` | 连接 PowerPoint 或 WPS 演示进行实时编辑 |
| `audit-scientific-figure` | 评审现有插图的还原度与可编辑性 |
| `correct-scientific-figure` | 把评审发现转为最小化、对象级的修正指令 |

## v1.5.4 版本要点（作者署名统一）

- 作者、开发者及 Office 加载项提供方署名统一为「一个地质博士」；README、许可证、任务窗格与绘图完成后的交付署名同步更新。
- 删除全部旧署名并增加回归校验；插件、MCP 服务与 Office.js manifest 版本同步为 1.5.4。

## WPS 与跨平台可靠性（v1.5.3 起）

- 明确选择 WPS 时锁定 host_application 与后端，不再误连 Microsoft PowerPoint。
- 真实状态验证：区分 installed、running、open_dispatched、document_open_verified、refresh_verified 等状态；无法验证时如实返回未知，绝不伪报成功。
- 每个 MCP 进程独立隔离 OOXML 工作副本，并串行执行有状态请求，避免并发任务互相覆盖或丢失对象。
- 修复表格、图表、透明度、箭头、连接符、组合、重名对象、导出尺寸与文件扩展名问题。
- draw.io 遇到未知或未加载的图形名直接报错，不再静默替换为矩形；折线按精确端点走线，附着连接符保持正交直角。

## 核心法则（Golden Rules）

1. **只控制 draw.io 内部图模型 API**，严禁使用系统级鼠标、键盘或窗口自动化。
2. **严禁 XML-First 流程**：不能先生成 XML 再让 draw.io 打开。必须在可见画布中完成全部绘图后，才调用 `drawio_live_save_snapshot` 序列化 `.drawio`。
3. **截图仅用于检查 draw.io 渲染区域**，不用于通用计算机屏幕控制。
4. **未知图形名必须先查能力**：`drawio_live_get_capabilities` 暴露实时模板注册表，未注册的图形名会报错，不得臆造或退化为矩形。

## 执行轨迹（Execution Trajectory）

```
[启动]
  → drawio_live_launch（指定 step_delay_ms）
  → drawio_live_status（确认 graph_ready=true）
  → drawio_live_get_capabilities（确认图形名与可编辑对象能力）

[分解参考图]
  → 用视觉检查全部参考图（PNG/JPEG/SVG/PDF）
  → 拆解为：画布比例、面板、节点、文字、箭头、图例、颜色、字体

[逐步绘图]
  → drawio_live_add_shape / drawio_live_add_edge
  → drawio_live_add_table / drawio_live_add_chart（可编辑组合）
  → drawio_live_draw_sequence（step_delay_ms > 0）

[每逻辑区域检查]
  → drawio_live_screenshot → 与参考对比
  → drawio_live_inspect + drawio_live_update_cell（修正）
  → drawio_live_fit（保持进度可见）

[保存与交付]
  → drawio_live_save_snapshot（唯一序列化时机）
  → drawio_validate → 修正错误 → 再次保存
  → drawio_export（embed=false，width=2000 预览 PNG）
  → 用户确认后 → drawio_export（embed=true 最终交付）
```

## PowerPoint 与 WPS 使用要点

- 先用 `powerpoint_status` 查看真实连接状态与后端（Windows COM、Mac Office.js、OOXML 工作副本），再用 `powerpoint_get_capabilities` 确认可编辑对象范围。
- WPS：host_application 明确设为 wps；默认编辑可编辑 PPTX 工作副本并按检查点后台刷新，不反复抢占窗口；每个区域完成后检查刷新是否验证通过。
- Mac PowerPoint 实时逐对象绘制需 Office.js 任务窗格：`powerpoint_officejs_status` 显示 connected=true 才可声称连接当前窗口。
- 想全程观看绘制过程时，将 focus_policy 设为 foreground（`powerpoint_set_focus_policy`）。

## 异常处理

| 场景 | 处理方式 |
|---|---|
| `node` 未找到 | 提示安装 Node.js 22+ 或确认 Codex 运行环境 |
| draw.io 未找到 | 提示安装桌面版或设置 `DRAWIO_PATH` 环境变量 |
| WPS 状态未知 | 如实显示未知，不当作连接成功；按 README 验证指定文件是否真的由 WPS 打开 |
| 端口占用 | 不指定端口，由服务器自动选择；或修改 `DRAWIO_LIVE_PORT` |
| graph 未就绪 | 关闭旧 draw.io 窗口后重试 |
| 未知图形名报错 | 改用能力注册表中的图形名，或以可编辑组合方式构建 |
| 参考图分辨率过低 | 明确告知无法确定的标签或元素，不擅自编造 |
| 密集显微图、热图 | 仅将无法可靠绘制的最小必要区域作为图片插入，其余文字、箭头与边框保持可编辑，不静默降级为 XML-first |

## 推荐提示词

```text
使用 Draw.io Scientific Illustrator。启动实时 draw.io，以 100 ms 的步骤间隔重绘
这张参考图。必须直接控制 draw.io 画布，不要使用系统鼠标键盘控制，也不要先生成
XML。文字、箭头、分区和图例都要可编辑；完成后保存 .drawio 并导出 2000 px PNG。
```

```text
使用 Scientific Illustrator，在 WPS 演示中复刻我上传的参考图。请将 host_application
明确设为 wps，不要连接 Microsoft PowerPoint；先检查状态和可用能力。默认在后台按
检查点绘制，优先使用可编辑的文字、形状、连接线、表格和图表；每个区域完成后检查
刷新结果，有问题先修正。完成后做全图对比检查，保存 PPTX 并导出最终预览图。
```

## 上游与许可

- 上游仓库：<https://github.com/icebird1998/scientific-illustrator>（本副本钉版标签：<https://github.com/icebird1998/scientific-illustrator/releases/tag/v1.5.4>）
- 版本历史见 [`CHANGELOG.md`](./CHANGELOG.md)；许可为 [`LICENSE`](LICENSE)（MIT），隐私说明见 [`PRIVACY.md`](./PRIVACY.md)。
