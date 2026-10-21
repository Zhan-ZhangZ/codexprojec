[English README](README.md) | 简体中文

<p align="center">
  <img src="https://img.shields.io/badge/After%20Effects-2024+-9999FF?style=for-the-badge&logo=adobe-after-effects&logoColor=white" alt="After Effects 2024+"/>
  <img src="https://img.shields.io/badge/MCP-Protocol-00D4AA?style=for-the-badge" alt="MCP Protocol"/>
  <img src="https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=nodejs&logoColor=white" alt="Node.js 18+"/>
  <img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge" alt="MIT License"/>
</p>

<h1 align="center">AE-MCP</h1>
<p align="center"><strong>After Effects Model Context Protocol Server</strong></p>
<p align="center">通过 70+ MCP 工具用 AI 自动化 Adobe After Effects</p>

## 概览

AE-MCP 让 AI 助手直接控制 Adobe After Effects，覆盖从创建合成到应用专业特效和表达式的完整动效工作流。

| 特性 | 说明 |
|---|---|
| 70+ 工具 | 完整覆盖 After Effects 自动化 |
| 动画预设 | 弹簧物理、弹跳、弹性、滑动、淡入淡出 |
| 表达式库 | 20+ 个 wiggle、循环和物理表达式 |
| 特效模板 | 电影感、VHS、霓虹等一键效果 |
| 动效模板 | 字幕条、片头卡、转场、Logo Reveal |
| 稳定架构 | 通过文件通信桥接 MCP 与 CEP 面板 |

## 环境要求

- Adobe After Effects 2024 或更高版本
- Node.js 18+
- macOS 或 Windows

## 安装

### 第 1 步：安装 MCP 服务

服务已发布到 npm，无需克隆或构建源码：

```bash
npx -y ae-mcp
```

### 第 2 步：安装 CEP 扩展

macOS：

```bash
./scripts/install-cep.sh
```

Windows：

```batch
scripts\install-cep.bat
```

### 第 3 步：配置 AI 助手

Claude Desktop 或 Claude Code 可使用：

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

其他支持 `mcpServers` 的客户端使用相同配置。本包同时保留上游 Agent Skill，详细规则见 [`SKILL/SKILL.md`](SKILL/SKILL.md)。

### 第 4 步：启动 After Effects

1. 启动 After Effects 2024+。
2. 打开 **Window > Extensions > AE-MCP**。
3. 面板启动后会监听 MCP 命令。

## 工具范围

### 项目与合成

`create_project` · `open_project` · `save_project` · `close_project` · `get_project_info` · `import_footage` · `create_composition` · `modify_composition` · `duplicate_composition` · `delete_composition` · `list_compositions` · `get_composition_info`

### 图层

`add_solid_layer` · `add_text_layer` · `add_text_layer_advanced` · `add_shape_layer` · `add_null_layer` · `add_adjustment_layer` · `add_camera_layer` · `add_light_layer` · `add_av_layer` · `precompose_layers` · `modify_layer` · `delete_layer`

### 动画与关键帧

`set_keyframe` · `set_keyframe_advanced` · `apply_easy_ease` · `set_temporal_ease` · `offset_keyframes` · `scale_keyframe_timing` · `reverse_keyframes` · `copy_keyframes` · `get_keyframes`

### 表达式

`set_expression` · `get_expression` · `remove_expression` · `enable_expression` · `add_expression_control` · `apply_expression_template` · `link_properties`

### 特效

`apply_effect` · `apply_effect_template` · `modify_effect_properties` · `remove_effect` · `reorder_effects` · `copy_effects` · `list_effects`

### 动效模板

| 工具 | 样式 |
|---|---|
| `create_lower_third` | modern、corporate、news、minimal、social |
| `create_title_card` | cinematic、documentary、social、minimal |
| `create_transition` | wipe、dissolve、push、slide、zoom |
| `create_logo_reveal` | fade、scale、slide、spin、glitch、particle |
| `create_text_animator` | typewriter、fadeIn、scaleIn、slideIn、randomize、wave |

### 素材、标记与时间线

`import_folder` · `replace_footage` · `organize_project_items` · `find_missing_footage` · `collect_files` · `reduce_project` · `add_composition_marker` · `add_layer_marker` · `get_markers` · `delete_marker` · `set_work_area`

## 快速示例

### 创建动态片头

```text
创建一个名为 Intro 的 1920x1080、30fps、5 秒合成。
添加居中的文字层“Welcome”。
应用 slideInUp 动画并开启 easy ease。
添加克制的 Glow 特效。
```

### 制作字幕条

```text
创建一个现代字幕条：
- 姓名：“Sarah Chen”
- 职位：“Lead Designer”
- 蓝色主色
- 带出入动画
- 时长 5 秒
```

### 添加物理运动

```text
给 Logo 层的位置添加 bounce 表达式：
amplitude 0.15，frequency 4，decay 6。
```

## 动画、表达式与特效预设

**弹簧物理：** `gentle`、`default`、`wobbly`、`stiff`、`slow`、`bouncy`、`snappy`

**运动预设：** 淡入淡出、八种滑入/滑出、缩放、bounce、elastic、overshoot、旋转进出。

**表达式模板：** wiggle、循环、bounce、inertia、springy、overshoot、属性链接、时间、时钟、倒计时和帧编号。

**特效模板：** 模糊、颜色、发光、投影、暗角、电影感、VHS、霓虹、胶片颗粒、色差和双色调。

## 架构

本技能包保留 Agent Skill、After Effects CEP 面板和面板安装脚本。stdio MCP 服务从已发布的 `ae-mcp` npm 包安装。

```text
AI Assistant
    ↓ stdio MCP
ae-mcp (npm)
    ↓ JSON 命令文件
CEP Extension 轮询 ~/Documents/ae-mcp-commands/
    ↓ ExtendScript
Adobe After Effects
```

## 故障排除

### 扩展未出现在 After Effects

1. 重新运行安装脚本，确认调试模式已开启。
2. 完全重启 After Effects。
3. 检查扩展是否安装到：
   - macOS：`~/Library/Application Support/Adobe/CEP/extensions/ae-mcp`
   - Windows：`%APPDATA%\\Adobe\\CEP\\extensions\\ae-mcp`

### 命令超时

1. 确认 AE-MCP 面板可见。
2. 检查 `~/Documents/ae-mcp-commands/` 中是否有命令文件。
3. 查看面板日志和 After Effects 中是否打开了模态对话框。

### 脚本错误

1. 使用 ExtendScript Toolkit 或 After Effects 控制台查看错误。
2. 确认合成与图层名称存在。
3. 注意 ExtendScript 只支持 ES3，不支持箭头函数和模板字符串。

## 更多规则

完整的属性路径、值格式、3D、粒子、渲染限制和分步示例见 [SKILL/SKILL.md](SKILL/SKILL.md) 与 [SKILL/examples.md](SKILL/examples.md)。

## 许可证

MIT。
