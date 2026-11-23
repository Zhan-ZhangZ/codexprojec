const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

/** 安装包必须自行确保媒体工具可执行，不能依赖可选依赖的安装脚本。 */
function prepareBundledMediaTools(resourcesDir, platform, arch) {
  const modules = path.join(resourcesDir, "app.asar.unpacked", "node_modules");
  const suffix = platform === "win32" ? ".exe" : "";
  const tools = [
    path.join(modules, "ffmpeg-static", `ffmpeg${suffix}`),
    path.join(modules, "@ffprobe-installer", `${platform}-${arch}`, `ffprobe${suffix}`),
  ];
  for (const file of tools) {
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) throw new Error(`[afterPack] 缺少媒体工具: ${file}`);
    if (platform !== "win32") fs.chmodSync(file, 0o755);
    // 跨平台构建只检查文件；当前系统和架构则实际执行，失败即阻止出包。
    if (platform === process.platform && arch === process.arch) {
      execFileSync(file, ["-version"], { timeout: 30_000, maxBuffer: 1024 * 1024, windowsHide: true });
    }
  }
  return tools;
}

module.exports = { prepareBundledMediaTools };
