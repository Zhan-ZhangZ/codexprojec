# chengfeng-videocut Codex Plugin

`chengfeng-videocut` 是安装和 Plugin 群组名称，不是一个同名的业务 Skill。

```text
[Plugin: chengfeng-videocut]
       |
       +-- 剪口播 ----> chengfeng-cut
       +-- 字幕 ------> chengfeng-subtitle
       +-- 画面 ------> chengfeng-visual
       +-- 导出 ------> chengfeng-export
       +-- 上报 Bug --> chengfeng-report-bug
       +-- 检查更新 --> chengfeng-check-updates
       |
       +-- references/（内部合同，不注册为 Skill）
```

Plugin 根入口不被同名 router 或公共说明 Skill 覆盖。每个用户可执行能力都有一个不同的、完整的公开 ID：

```text
$chengfeng-videocut:chengfeng-cut
$chengfeng-videocut:chengfeng-report-bug
$chengfeng-videocut:chengfeng-check-updates
```

静态元数据、`agents/openai.yaml`、Plugin 首页 starter prompt 和 CLI 的 `$plugin:skill` 调用，不能单独证明 Desktop Slash/Plugin 群组已经在界面中展示；那一项必须由实际 Desktop UI 单独验收。

六个 raw Skill 都保留 `user-invocable: true`，以兼容已知 host 的手动选择 metadata；它不是群组显示、排序或可见性的公开保证。

## 能力边界

```text
剪口播      -> 已复核的删词账本（不产媒体）
画面        -> visuals.json + HTML 模块（风格库在 chengfeng-visual/animation-styles/）
导出        -> 成片.mp4（剪辑+推近+字幕+画面层一次烧成）
字幕        -> subtitles.json（按账本算时间，不再发布 SRT）
上报 Bug    -> 脱敏草稿 -> 用户确认 -> GitHub Issue URL
检查更新    -> 官方 Marketplace 快照 -> 来源证明 -> 用户确认 -> 复读版本
```

共同边界只存在于 `references/runtime-and-product-contract.md` 与 `references/business-workflow-contract.md`。普通 reference 没有 `SKILL.md`、公开 ID 或 UI 卡片，不占用用户入口。

业务 Skill 共用 `scripts/ensure-runtime.cjs`、`scripts/ensure-running.cjs` 和 `runtime-requirements.json`。Plugin package `0.10.8` 消费 Runtime compatibility contract `0.4.8`：只接受 Runtime 0.4.8+ 与声明的 EDL、常驻 service 能力；缺失时从精确的 `v0.4.8` Release 获取 `install.cjs` 和校验清单。安装器只消费 stable Runtime portable `chengfeng-videocut-portable.tar.gz`；清单必须同时声明该资产和版本化 `chengfeng-videocut-0.4.8-portable.tar.gz`，不下载 Desktop DMG/EXE。校验后安装并执行 doctor。已有低版本 Runtime 只有在用户明确确认升级时才原子替换程序目录，项目数据不动。随后由 Product `service ensure --json` 幂等安装或恢复 macOS launchd / Windows Task Scheduler 用户服务；Plugin 不直接使用操作系统进程管理命令或 foreground 后台进程。Release 不存在、资产不完整或服务身份不匹配时安全停止。Studio 只在人工审核状态且通过 `ensure-studio.cjs` 顶层视图能力门禁后打开。

桌面 App 与纯 CLI 不是两套 Runtime。App 首次启动把随包 Runtime、Bun、FFmpeg 和
FFprobe 安装到 `~/.chengfeng-videocut` 的版本化目录，并由同一个稳定 launcher
执行 `service ensure`；所有业务 Skill 只认这个稳定入口。桌面来源在只读检查中标为
`desktop-managed`，不需要系统 PATH 里的 Bun/FFmpeg。Plugin 不搜索 Electron
资源目录，也不接受 foreground 进程冒充正式服务。`chengfeng-report-bug` 即使看到
桌面来源也仍保持只读。

`chengfeng-report-bug` 不安装 Runtime、不启动 Studio，也不改项目。它只生成脱敏 Issue 草稿，用户确认同一份正文后才调用 GitHub CLI；没有明确 Issue URL 就不宣称上报成功。

`chengfeng-check-updates` 把“发现候选”与“改变用户安装”分成两个事务。`--inspect`
与普通检查都直接读取当前 Plugin cache；检查阶段不会以用户 `CODEX_HOME` 调用任何
`codex` 命令，也不会写用户的 Marketplace、配置或 cache。联网发现只在一次性临时
`CODEX_HOME` 中把官方 `stable` 解析为发布快照 `snapshotRevision`（40-hex，记作
B）；包内 provenance 再把该快照绑定到内容提交 `contentRevision`（40-hex，记作
A）和可重算的 `publisherChecksum`。只有 version + B + A + SHA-256 四项一致才会
展示候选；`stable` 只是临时候选发现入口，不是用户安装的持久引用。

候选还必须通过 Git 来源证明：临时 Marketplace 的 origin 必须是官方仓库，HEAD
必须等于 B，A 必须是 B 可达的提交，且 A 到 B 的 Plugin 子树只能新增 provenance；
工作树必须干净，清单摘要也必须等于 `publisherChecksum`。当前安装则必须来自同一
exact pinned Marketplace 的官方 Git 工作树，所选 cache 与该快照中的 Plugin 字节
完全一致。cache 中允许保留更低版本目录，但活跃项必须是唯一的最高 strict semver；
若两个目录具有相同的最高 semver 优先级，则以 `installed_identity_untrusted`
停止，不能猜测该用哪个。

用户确认所见四项后，脚本会重新隔离 stage；候选未漂移才进入写事务。用户
Marketplace 始终固定到 exact B。写入前再以 CAS 复读 Marketplace 与 cache；状态
变化就返回 `activation_state_changed`，不开始激活。状态未变才通过官方命令执行
remove → add `--ref B` → upgrade，再直接复读 cache 验证 version + B + A +
SHA-256。命令失败但安装仍与旧状态完全相同时返回
`activation_failed_no_change`，不做多余回滚；已经发生变化时才尝试恢复更新前的
exact snapshot revision。只有完整恢复才返回
`activation_failed_rolled_back`（cache 锁冲突为
`activation_cache_locked_rolled_back`），恢复不完整返回
`activation_failed_rollback_incomplete` 并明确报告实际状态。历史 0.10.5 安装没有
完整 provenance 时仍可作为一次性迁移源：检查结果带
`legacyInstalledIdentity=true`，继续使用同一个
`update_available_confirmation_required` 确认门，无需用户先做 Marketplace ref
变更；旧 revision、cache 版本、manifest 或清单互相矛盾时返回
`installed_identity_untrusted`。更新失败或回滚都不安装、不替换 Runtime，也不改
项目或媒体。

Windows 上，更新脚本与 GitHub npm bootstrap 都按 `PATHEXT` 优先解析原生可执行
扩展名，再回退无扩展名文件；`.cmd` / `.bat` 始终由 `ComSpec` 包装执行。因此 pnpm
目录同时存在 Unix `codex` shim 与 `codex.cmd` 时，会选择可在 Windows 启动的
`codex.cmd`。

首次 GitHub npm bootstrap 与日后更新是两条独立事务。bootstrap 预检无同名
Marketplace/Plugin 后，先以 manifest 的 exact 40-hex ref 执行 Marketplace add；
紧接着、在 upgrade 之前读取 available inventory。若这一步暴露出 add 前不可见的
历史 orphan Plugin，它会拒绝激活，只移除本次新加的 Marketplace 并保留 orphan，
不会调用 Plugin remove。通过该门禁后才执行 upgrade、Git/metadata 身份复读和
Plugin add；后续失败则按本次实际创建的状态执行 Plugin remove → Marketplace
remove，并再次复读确认。

Plugin 是独立的 `0.10.8` 版本；`runtime-requirements.json` 要求 Product Runtime `0.4.8`。两者不能互相替代。

## 开发验证

Plugin 脚本与 MCP server 的依赖基线是 Node.js ≥ 20。

```bash
npm install
npm run build
npm test
```

发布目录需要 `dist/server.mjs` 与 `public/`，不包含 `node_modules/`。
