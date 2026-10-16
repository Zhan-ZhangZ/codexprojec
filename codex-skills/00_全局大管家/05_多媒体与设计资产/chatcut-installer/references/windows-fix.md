# Windows node_repl 修复（浏览器控制发现失败时）

仅当 Windows 上浏览器控制发现失败时使用。典型症状：Codex 内置 Browser MCP 已装，但 `mcp__node_repl__js` 不暴露——`node_repl` MCP 已注册，`node_repl.exe` 却起不来。

## 1. 找到配置与运行时

```powershell
$codexHome = "$env:USERPROFILE\.codex"
$config = Join-Path $codexHome "config.toml"
Get-Content $config
```

找类似块（记下真实路径）：

```toml
[mcp_servers.node_repl]
command = 'C:\Users\<you>\AppData\Local\OpenAI\Codex\runtimes\cua_node\<runtime-id>\bin\node_repl.exe'

[mcp_servers.node_repl.env]
NODE_REPL_NODE_PATH = '...\bin\node.exe'
NODE_REPL_NODE_MODULE_DIRS = '...\bin\node_modules'
```

## 2. 验证 node_repl.exe 能否启动

```powershell
& "C:\Users\<you>\AppData\Local\OpenAI\Codex\runtimes\cua_node\<runtime-id>\bin\node_repl.exe" --help
Write-Output "LASTEXITCODE=$LASTEXITCODE"
```

- 打印帮助且 `LASTEXITCODE=0` → 二进制正常，问题在别处。
- 退出码 `-1073741515` → Windows 找不到必需 DLL（典型 VC 运行时缺失），继续第 3 步。

## 3. 定位内置 VC 运行时 DLL 并写入持久 PATH

```powershell
Get-ChildItem "$env:USERPROFILE\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\" `
  -File -Include "vcruntime140.dll","vcruntime140_1.dll","msvcp140.dll" | Select-Object FullName

# 通常可用目录：
$dir = "$env:USERPROFILE\.cache\codex-runtimes\codex-primary-runtime\dependencies\python"
$userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
if (($userPath -split ';') -notcontains $dir) {
    $newPath = if ([string]::IsNullOrWhiteSpace($userPath)) { $dir } else { "$userPath;$dir" }
    [Environment]::SetEnvironmentVariable('Path', $newPath, 'User')
}
[Environment]::GetEnvironmentVariable('Path', 'User') -split ';' | Where-Object { $_ -eq $dir }
```

要点：**单 shell 的 `$env:PATH = ...` 只影响当前 shell，必须写持久用户 PATH。** 改完后**完全退出并重开 Codex**——安装线程的工具列表在启动时已捕获，修复后它也不会获得 Browser MCP；必须开新线程。

## 4. 重开后的验证

新 PowerShell 会话应能看到持久路径：

```powershell
$env:Path -split ';' | Where-Object { $_ -like '*codex-primary-runtime*dependencies*python*' }
```

重开 Codex、新线程里让 Agent 重读 `browser:control-in-app-browser` 并重新发现浏览器控制。`mcp__node_repl__js` 暴露后，Browser 技能引导应可用：

```js
const { setupBrowserRuntime } =
  await import("C:/Users/<you>/.codex/plugins/cache/openai-bundled/browser/<version>/scripts/browser-client.mjs");
await setupBrowserRuntime({ globals: globalThis });
globalThis.browser = await agent.browsers.get("iab");
nodeRepl.write(await browser.documentation());
```

内置浏览器可见性：

```js
await (await browser.capabilities.get("visibility")).set(true);
```

## 注意

- 根因不是 ChatCut 也不是 Browser 插件，是 `node_repl.exe` 因 VC 运行时 DLL 目录缺失而起不来。
- 不要依赖已废弃的 `[features] js_repl = true` 配置；若加过，删掉。
- 若改过 Node.js 可见性或 PATH，创建首个剪辑会话前先完全退出并重开 Codex。
