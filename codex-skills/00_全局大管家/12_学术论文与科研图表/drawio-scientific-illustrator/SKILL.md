---
name: drawio-scientific-illustrator
description: 在可见的 draw.io 桌面画布中实时重绘、追踪、修改和导出科学插图与示意图的 Codex 插件。通过 draw.io 自身的图模型 API 逐步驱动绘图，支持 PNG/SVG/PDF 导出，不使用系统鼠标键盘自动化。Leading Words: draw.io科研插图重绘, 实时画布绘图MCP, 可编辑科学示意图, draw.io图元逐步构建
---

# Draw.io Scientific Illustrator

> **执行前必读**：使用本技能前，请先用 `view_file` 阅读本目录下的 [`README.md`](./README.md)，获取完整的安装要求、环境变量配置与工具工作流说明。

## 核心法则（Golden Rules）

1. **只控制 draw.io 内部图模型 API**，严禁使用系统级鼠标、键盘或窗口自动化。
2. **严禁 XML-First 流程**：不能先生成 XML 再让 draw.io 打开。必须在可见画布中完成全部绘图后，才调用 `drawio_live_save_snapshot` 序列化 `.drawio`。
3. **截图仅用于检查 draw.io 渲染区域**，不用于通用计算机屏幕控制。

## 执行轨迹（Execution Trajectory）

```
[启动]
  → drawio_live_launch（指定 step_delay_ms）
  → drawio_live_status（确认 graph_ready=true）

[分解参考图]
  → 用视觉检查全部参考图（PNG/JPEG/SVG/PDF）
  → 拆解为：画布比例、面板、节点、文字、箭头、图例、颜色、字体

[逐步绘图]
  → drawio_live_add_shape / drawio_live_add_edge
  → drawio_live_draw_sequence（step_delay_ms > 0）

[每逻辑区域检查]
  → drawio_live_screenshot → 与参考对比
  → drawio_live_inspect + drawio_live_update_cell（修正）
  → drawio_live_fit（保持进度可见）

[保存与交付]
  → drawio_live_save_snapshot（唯一序列化时机）
  → drawio_validate → 修正错误 → 再次保存
  → drawio_export（embed=false, width=2000 预览 PNG）
  → 用户确认后 → drawio_export（embed=true 最终交付）
```

## 异常处理

| 场景 | 处理方式 |
|---|---|
| `node` 未找到 | 提示安装 Node.js 22+ 或确认 Codex 运行环境 |
| draw.io 未找到 | 提示安装桌面版或设置 `DRAWIO_PATH` 环境变量 |
| 端口占用 | 不指定端口，由服务器自动选择；或修改 `DRAWIO_LIVE_PORT` |
| graph 未就绪 | 关闭旧 draw.io 窗口后重试 |
| 参考图分辨率过低 | 明确告知无法确定的标签/元素，不擅自编造 |
| 密集显微图/热图 | 说明当前 live API 以可编辑图元为主，暂不支持混合光栅图，不静默降级为 XML-first |

## 推荐提示词

```text
使用 Draw.io Scientific Illustrator。启动实时 draw.io，以 100 ms 的步骤间隔重绘
这张参考图。必须直接控制 draw.io 画布，不要使用系统鼠标键盘控制，也不要先生成
XML。文字、箭头、分区和图例都要可编辑；完成后保存 .drawio 并导出 2000 px PNG。
```
