# 本地集成说明

- 上游：<https://github.com/pefedotov/coreldraw_mcp>
- 集成提交：`67c0be3faf44e8a4dbe5e5e90327b44df42f6618`（2026-10-19）
- 许可：MIT

## 集成时改动

- 上游只提供三个嵌套 `SKILL.md`，没有顶层入口；新增本目录的薄路由 `SKILL.md`。
- 新增 `README.zh-CN.md`，完整翻译上游英文 README，并保留原 `README.md`、`README.ru.md`。
- 将 README 中的 CI 徽章、Release、贡献与安全文档链接固定到上述上游提交，避免剔除
  `.github/` 后形成本地死链。
- 英文与俄文 README 已说明测试项目不随技能包发布，并补上中文 README 的双语导航；客户端配置
  文档只描述目标文件，不把宿主应用的外部配置文件名当作包内文件链接。
- 剔除 `.git`、`.gitignore`、`.gitattributes`、`.github/`、解决方案文件、测试项目、文档检查
  脚本和图标生成脚本。它们只服务于上游开发、CI 或发布验证，不参与 Agent 运行。
- 保留 Add-on 源码、三份子技能、安装器、部署脚本、客户端配置、安装说明、工具边界文档、
  WiX 定义、EULA、版本记录和 MIT 许可。

## 已知边界

- 仅支持 Windows 与 CorelDRAW 2025/2026；macOS 和网页版不可用。
- 编译 Release 包需要 .NET SDK 与本地 CorelDRAW 提供的
  `Corel.Interop.VGCore.dll`；运行编译后的 Add-on 本身不需要 .NET SDK。
- 上游未随仓库提供已签名的 MSI。README 中的 Release 下载入口以 GitHub 实际发布状态为准。
