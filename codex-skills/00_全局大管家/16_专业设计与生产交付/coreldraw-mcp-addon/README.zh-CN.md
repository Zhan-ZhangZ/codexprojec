# CorelDRAW MCP Add-on

**英文版：[README.md](README.md) · 俄文版：[README.ru.md](README.ru.md)**

[![文档检查](https://github.com/pefedotov/coreldraw_mcp/actions/workflows/docs.yml/badge.svg)](https://github.com/pefedotov/coreldraw_mcp/actions/workflows/docs.yml)

让 AI Agent 在当前已经打开的 CorelDRAW 文档中绘图，并直接看到结果。这个 Add-on 会把正在运行的
CorelDRAW Graphics Suite 变成 **Model Context Protocol（MCP）服务器**，让 MiMoCode、
Claude Desktop、Cursor、OpenCode 或其他 MCP 客户端操作真实对象模型：图形、文字、填色、
轮廓、特效、图层、页面和导出。

```text
MCP 客户端  ──HTTP（本机回环）──▶  CorelDRAW.exe（Add-on）  ──VGCore COM──▶  绘图
                               http://127.0.0.1:8765/mcp
```

## 可以让它做什么

连接后只需要用自然语言描述任务，Agent 会自行选择工具：

> 创建一张 A6 传单：一个 148 × 105 mm、带金色渐变填充的矩形，在顶部添加 36 pt 的艺术字标题
> “Autumn Sale”，并在文档旁导出 200 dpi PNG。

> 焊接当前选中的三个图形，将结果设置为 #C9A227、2 mm 轮廓，再和 Logo 编组。

> 将本文档所有页面中的文字 “2025” 替换为 “2026”，并把标题转换为曲线。

所有操作都发生在当前打开的文档中，并进入 CorelDRAW 自己的撤销历史。Add-on 调用的是应用的
对象模型，而不是模拟鼠标点击。

## 快速开始（约 60 秒）

1. **安装 Add-on。** 从
   [Releases](https://github.com/pefedotov/coreldraw_mcp/releases/latest)
   下载适用于 CorelDRAW 2026 的 `CorelMcpAddon-27.msi`，或适用于 CorelDRAW 2025 的
   `CorelMcpAddon-26.msi` 并运行；带 `-ru` 的构建包含俄文对话框。

   Windows 会提示两次：SmartScreen（未识别发布者时选择“更多信息 → 仍要运行”）和 UAC
   （Add-on 按机器安装）。两者都是预期行为；详细说明见
   [`docs/installing.md`](docs/installing.md#what-you-will-see-before-the-installer-starts)。
   如果尚未发布安装包，或希望自行构建，见[构建](#构建)。
2. **启动 CorelDRAW**，打开 **Window ▸ Dockers ▸ Corel MCP**（或
   **Tools ▸ Corel MCP**）。这里的 “docker” 是 CorelDRAW 对停靠面板的称呼，与容器运行时
   无关。面板必须显示 `running`；打开面板才会启动服务器。
3. **让客户端连接端点。** 大多数客户端只需要 URL：

   ```json
   {
     "mcpServers": {
       "coreldraw": { "url": "http://127.0.0.1:8765/mcp" }
     }
   }
   ```

   Claude Desktop、Cursor、MiMoCode、OpenCode 和通用 Streamable HTTP 客户端的可复制配置在
   [`docs/client-config.md`](docs/client-config.md)。
4. **提出绘图任务。**

端点为 `http://127.0.0.1:8765/mcp`，`GET /health` 会返回 `ok`。如果客户端无法连接，日志会
指出服务器停在哪一步；见[出现问题时](#出现问题时)。

## 适用范围

| 项目 | 要求 |
|---|---|
| 应用 | CorelDRAW Graphics Suite **2025（26）** 或 **2026（27）** |
| 操作系统 | Windows |
| 权限 | 安装时需要管理员权限；Add-on 位于 `Program Files` |
| 客户端 | 支持 MCP Streamable HTTP 的客户端，或可通过 stdio 桥接 |

以下情况**不可用**：

- CorelDRAW 低于 2025。两个受支持版本使用不同的 interop 程序集，Add-on 必须针对对应版本编译。
- 使用 macOS 或网页版。
- 没有管理员权限，无法安装到 `Program Files`。CorelDRAW 不扫描用户级 Add-on 目录
  （`%APPDATA%`、`%LOCALAPPDATA%`、`%ProgramData%` 都不在扫描范围内）。
- MCP 客户端既不支持 HTTP transport，也没有 stdio 桥接。

## 使用路径

**设计师：** 先看[可以让它做什么](#可以让它做什么)。在把真实文件交给 Agent 前，需要了解：

- AI 操作的是当前 CorelDRAW 中打开的文档；未保存内容的风险与手动拖动图形一致。`Ctrl+Z`
  可以像普通编辑一样撤销。
- 按对象寻址的工具使用活动图层上从 1 开始的索引、对象名称或当前选择。调用会插入对象的
  工具（例如投影）后，索引会变化；需要重新读取 `list_shapes`。
- 新创建的基本图形会保留 CorelDRAW 默认的发丝轮廓。若只需要填色，请明确要求“无轮廓”。
- 刀、橡皮擦、网格填充、智能绘图等部分工具箱功能无法编程驱动，只能使用鼠标。完整列表和
  原因见 [`docs/tools.md`](docs/tools.md)。
- 面板中的 **Tools** 按钮可以取消不希望 Agent 调用的工具。修改会立即生效，并在重启后保留。
- 端点只监听本机 `127.0.0.1`，无法从网络访问。

**开发者：** Add-on 是加载进 `CorelDRAW.exe` 的单个 `net48` 程序集；MCP 协议和 JSON 层
均为内置实现，没有第三方运行时依赖。协议层是建立在 JSON-RPC 2.0 上的 Streamable HTTP。
后续章节包括[工具](#工具)、[仓库结构](#仓库结构)、[构建](#构建)、
[已知行为](#已知行为)和[安全](#安全)。

## 工具

`tools/list` 是当前构建能力的权威清单。可以让 Agent 调用，或调用 `server_status` 查看
`toolCount` 与 `enabledToolCount`。能力分组如下：

| 分组 | 覆盖范围 |
|---|---|
| 文档与页面 | 新建/打开/保存/关闭，页面尺寸、方向、单位和活动页面 |
| 图形 | 矩形、椭圆、线段、多边形、星形、螺旋、网格纸、曲线、图片和 SVG 导入 |
| 文字 | 艺术文字与段落文字、读取/替换、转曲、沿路径、置于图形内部 |
| 颜色与填色 | 均匀、渐变、图案、纹理和 PostScript 填色；轮廓颜色与宽度；透明 |
| 变换 | 位置、尺寸、缩放、移动、旋转、倾斜、复制、克隆、顺序、对齐、编组、锁定 |
| 选择 | 按索引、索引列表、名称、类型或图层全部对象选择 |
| 布尔与整形 | 合并、拆分、焊接、修剪、相交、圆角、倒角、扇贝边 |
| 特效 | 调和、轮廓图、投影、封套、立体化、透镜、变形、颜色调整、展平 |
| 符号与 PowerClip | 转为符号和还原、置入和提取 |
| 图层、布局与导航 | 图层、辅助线、网格、缩放和平移 |
| 导出 | 所有受支持格式，以及 `export_pdf`、`export_png`、`export_svg`、`export_dxf` |
| 服务器 | `server_status`、`server_log`（最近调用、参数和耗时） |

按分组排列的规范完整清单见
[`docs/client-config.md`](docs/client-config.md#tools)；工具箱覆盖表和对象模型无法访问的
项目见 [`docs/tools.md`](docs/tools.md)。

## 配置

`config.json` 与 `CorelMcp.dll` 同目录，路径为
`<CorelDRAW>\Programs64\Addons\CorelMcp\`：

| 字段 | 默认值 | 含义 |
|---|---|---|
| `Port` | `8765` | 端点 TCP 端口 |
| `BindAddress` | `127.0.0.1` | 仅本机回环；没有 `AuthToken` 时不要扩大绑定范围 |
| `AutoStart` | `true` | Add-on 加载时自动启动服务器 |
| `AuthToken` | `""` | 设置后，请求必须携带 `Authorization: Bearer <token>` |
| `MaxBodyBytes` | `4194304` | 拒绝更大的请求体 |
| `AllowedRoots` | `""` | 文件路径参数允许访问的目录；空值表示不限制 |
| `DisabledTools` | `""` | 从 `tools/list` 隐藏且由 `tools/call` 拒绝的工具名 |

**Tools** 按钮会修改 `DisabledTools`，并对运行中的服务器立即生效。其他字段在下次启动服务器时
生效（点击 **Stop/Start** 或重启 CorelDRAW）。完整细节和各客户端配置见
[`docs/client-config.md`](docs/client-config.md)。

## 仓库结构

```text
src/CorelMcpAddon/          Add-on
  Addon.cs                  CorelDRAW Add-on 钩子入口
  ToolCatalog.cs            构建工具注册表
  Tools/                    按能力分组的工具、注册表与 schema 构建器
  Mcp/                      Streamable HTTP 服务器、MCP / JSON-RPC 2.0 协议层
  Json/                     手写 JSON 层（无第三方程序集）
  Corel/                    VGCore 对象模型 COM 桥
  Config/                   config.json 模型
  Ui/                       停靠面板
skills/                     三个 Agent 技能（setup、drawing、export）
docs/                       安装、客户端配置、工具箱覆盖和文档检查
installer/                  WiX 定义、构建与签名脚本、EULA、version.txt
deploy/install.ps1          开发部署脚本
LICENSE                     MIT
CHANGELOG.md                版本记录
```

**Release** 构建会生成 `addon/`（手动安装需要复制的五个文件）；
`installer\build-msi.ps1` 会生成 `dist/`（MSI 输出）。新克隆的仓库不包含这两个目录；见
[构建](#构建)。

本技能包不包含上游测试项目，因为测试不属于运行时文件；这不改变 Add-on 的构建流程。

## 构建

需要能够构建 `net48` 的 .NET SDK（上游使用 .NET 10 验证）、本地 CorelDRAW 提供的
`Corel.Interop.VGCore.dll`，以及作为本地 dotnet tool 还原的 WiX Toolset v5。

```powershell
dotnet build src\CorelMcpAddon\CorelMcpAddon.csproj -c Release -p:CorelDrawVersion=27
.\installer\build-msi.ps1                    # -> dist\CorelMcpAddon-27.msi
.\installer\build-msi.ps1 -Thumbprint <hex>  # 分发前签名
```

`CorelDrawVersion` 同时决定编译时使用的 interop 程序集和安装目录：
`26` 表示 CorelDRAW 2025，`27` 表示 CorelDRAW 2026（默认）。

部署有三种方式：MSI、用于开发环境的 `deploy\install.ps1` 和手工复制文件夹。三者都需要
管理员权限，详见 [`docs/installing.md`](docs/installing.md)。

上游没有托管构建：`src/CorelMcpAddon/Tools` 下所有文件都依赖只随 CorelDRAW 提供的
`Corel.Interop.VGCore.dll`，因此构建机必须是安装了有效 CorelDRAW 的 Windows 机器。上游贡献
规则与固定提交中的 CI 说明见
[上游贡献指南](https://github.com/pefedotov/coreldraw_mcp/blob/67c0be3faf44e8a4dbe5e5e90327b44df42f6618/.github/CONTRIBUTING.md)。

## 已知行为

编写自动化脚本前需要了解以下规则；原因和完整列表见
[`docs/client-config.md`](docs/client-config.md#tool-behaviour-worth-knowing)：

- **坐标使用文档单位，Y 轴从页面左下角向上增长。**
  `get_document_info` 返回的 `referencePoint` 是标尺显示设置，不会改变原点。
- **`create_*` 创建的基本图形保留 CorelDRAW 默认发丝轮廓。**
  需要纯填色时调用 `set_outline_none`。
- **图形索引会变化。** `drop_shadow` 会插入一个组图形，并让所有更低的索引偏移一位；
  任何会插入对象的调用后都要重新读取 `list_shapes`。

## 出现问题时

| 现象 | 处理 |
|---|---|
| 面板或菜单缺失 | CorelDRAW 缓存了工作区。关闭后按住 **F8** 启动以重置工作区；操作前先备份 `%AppData%\Corel\…\Workspace`。 |
| 无法连接，但面板显示 `running` | 检查 `config.json` 的 `Port`，然后请求 `GET http://127.0.0.1:8765/health`。 |
| `Failed to bind to address` | 端口已被占用；修改 `Port` 后重启服务器。 |
| 工具返回 `no active document` | 先新建或打开文档。 |
| 其他问题 | 读取日志。目录可写时日志位于 Add-on 旁的 `corelmcp.log`；否则回退到 `%LOCALAPPDATA%\CorelMcp\corelmcp.log`。MSI 安装通常使用回退位置，因为非管理员运行的 CorelDRAW 无法写入 `Program Files`。`server_status` 的 `logPath` 会给出实际路径，面板 **Log** 页显示相同内容。 |

更多故障排查：
[`docs/client-config.md`](docs/client-config.md#troubleshooting) 和
[`docs/installing.md`](docs/installing.md)。

## 安全

所有内容都留在本机。端点绑定 `127.0.0.1`，无法从网络访问，Add-on 也不会联系外部服务。

任何**能够访问该端点的人**都可以使用 CorelDRAW 进程的完整权限操作会话，包括通过文档与导出
工具读写文件。默认设置假定机器只有你一个用户：`AuthToken` 为空，`AllowedRoots` 不限制。

如果确实需要从回环地址以外访问，必须同时完成三件事：设置 `AuthToken`、收窄
`AllowedRoots`，并将服务器放在自己控制的隧道后。只修改 `BindAddress` 等于把 CorelDRAW 的
管理员级控制权交给网络上的任何人。漏洞报告方式见
[上游安全策略](https://github.com/pefedotov/coreldraw_mcp/blob/67c0be3faf44e8a4dbe5e5e90327b44df42f6618/.github/SECURITY.md)。

## 文档

- [`docs/installing.md`](docs/installing.md)：MSI、SmartScreen、UAC、部署和打包内部流程
- [`docs/client-config.md`](docs/client-config.md)：客户端接入、`config.json`、工具分组和排障
- [`docs/tools.md`](docs/tools.md)：工具箱覆盖表（`[x]` 已实现，`[~]` 对象模型无法访问）
- [`skills/`](skills/)：面向 Agent 的连接、绘图、导出与格式规则
- [`CHANGELOG.md`](CHANGELOG.md)：版本记录
- [上游贡献指南](https://github.com/pefedotov/coreldraw_mcp/blob/67c0be3faf44e8a4dbe5e5e90327b44df42f6618/.github/CONTRIBUTING.md)：构建、测试和添加工具

详细文档保留英文原文；本文件、英文 README 和俄文 README 共同提供入口说明。

## 许可

MIT，见 [`LICENSE`](LICENSE)。MSI 会显示 `installer/EULA.rtf` 中的相同条款，并附带商标声明：
CorelDRAW 是 Corel Corporation 的商标，本 Add-on 与 Corel 无隶属关系，也未获得 Corel 的
认可或赞助。

维护者：[`@pefedotov`](https://github.com/pefedotov)。问题和反馈请提交到
[上游 Issue](https://github.com/pefedotov/coreldraw_mcp/issues)。
