# wenyan 安装与排障

## 安装

```bash
npm install -g @wenyan-md/cli
wenyan --version
```

wenyan 是 [caol64/wenyan-cli](https://github.com/caol64/wenyan-cli)（Apache-2.0）。除 CLI 外官方还提供 macOS 桌面版、跨平台桌面版和 MCP 版本，仓库内自带 publish-to-wechat 等官方 Skill，可用 `npx skills add caol64/wenyan-cli` 安装。

## 凭据配置

单账号使用环境变量：

- `WECHAT_APP_ID`：公众号 AppID。
- `WECHAT_APP_SECRET`：公众号 AppSecret。

也可通过 `--env-file=.env` 传入。多账号时删除上述环境变量，改用 `wenyan credential` 配置多套凭据，发布时用 `--app-id` 指定。

凭据安全：AppSecret 等同账号密码。不把凭据写入仓库内文件、任务卡或聊天记录；`.env` 文件必须在 `.gitignore` 中；协助用户排查时只确认变量是否存在，不回显值。

## IP 白名单

公众号 API 要求调用方 IP 在后台白名单内：公众号后台 → 设置与开发 → 基本配置 → IP 白名单。官方说明见 [yuzhi.tech/docs/wenyan/upload](https://yuzhi.tech/docs/wenyan/upload)。

本机 IP 频繁变动（家用宽带、移动办公）或团队共用时，改用 server 模式：把 Wenyan Server 部署到固定 IP 的服务器上，白名单只加服务器 IP，本地作为客户端调用：

```bash
wenyan publish -f article.md --server https://your-server --api-key-file ~/.config/wenyan/server-api-key
```

## 主题

```bash
wenyan theme -l          # 列出内置主题
wenyan render -f a.md -t orangeheart > preview.html   # 本地预览
```

内置主题：default、orangeheart、rainbow、lapis、pie、maize、purple、phycat。代码高亮默认 solarized-light，`--no-mac-style` 可关闭代码块的 Mac 窗口样式。自定义 CSS 用 `-c 路径` 加载。

## 常见错误

| 现象 | 原因与处理 |
|---|---|
| invalid ip 或 40164 | 当前出口 IP 不在白名单。加入白名单或改用 server 模式 |
| invalid appid / secret | 凭据错误或过期。让用户在公众号后台核对，不猜测重试 |
| 缺少 title 报错 | frontmatter 缺 `title` 字段，补全后重发 |
| 图片上传失败 | 检查路径是否存在、网络图片是否可访问、格式是否受支持 |
| access_token 频繁失效 | 多系统共用同一公众号凭据互相挤占。统一由一个系统管理 token，或按官方文档导入外部 AccessToken |

任何错误最多重试一次。连续失败时停止，把原始错误信息交给用户。
