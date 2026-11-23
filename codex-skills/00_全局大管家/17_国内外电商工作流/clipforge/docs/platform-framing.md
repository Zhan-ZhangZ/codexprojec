# 可控构图与多平台导出

同一条成片可以分别输出抖音、快手、视频号、TikTok Shop、Reels、Shorts 的 9:16 版本，以及小红书的 3:4 版本。全程在本地处理，无需模型或 API Key，原成片保留。

## 网页使用

1. 打开项目的「导出」页，在「多平台导出」选择成片版本。预览和本批次的所有平台输出都固定使用该版本。
2. 选择构图方式：**模糊背景**保留完整画面并铺满背景；**黑边留白**完整保留原画面；**满屏裁切**铺满目标画幅，可调水平和垂直位置。
3. 播放原片到要检查的位置，点击「使用播放位置」，或输入秒数；选择预览平台后点击「预览构图」。预览是导出引擎生成的真实单帧，显示实际采样时间。
4. 勾选目标平台，点击「导出所选」。各平台依次处理，成功后可立即下载；失败可单独重试。

裁切位置表示超出画幅部分的偏移：0 为左／上，0.5 为居中，1 为右／下。没有超出目标画幅的方向不会移动。裁切位置整片固定，不跟随人物移动；已烧录的字幕和贴片也可能被裁掉，应检查不同时间点，或选择完整保留模式。

处理期间可以取消；已完成的文件仍可下载。失败或取消不会发布半成品。修改版本或构图后，旧预览和旧下载入口会清空，避免把旧参数的结果当作当前结果；磁盘上的已完成文件保留。

## CLI

```bash
# 固定版本，预览第 3 秒的右侧裁切；JSON 中 preview 是 JPEG data URL
node bin/clipforge.mjs export --project PROJECT_ID --composition COMPOSITION_ID \
  --platform douyin --framing crop --position-x 1 --position-y 0.5 \
  --preview --time 3 --json

# 使用相同版本和构图导出完整视频
node bin/clipforge.mjs export --project PROJECT_ID --composition COMPOSITION_ID \
  --platform douyin --framing crop --position-x 1 --position-y 0.5 --json
```

`--framing` 支持 `blur`（默认）、`fit`、`crop`。坐标取值 0–1。省略 `--composition` 时，后端选择最新成功成片，并返回实际 `compositionId`；自动化连续输出多个平台时，应复用该 ID。

## MCP / API

`clipforge_export_platform` 和 `POST /api/project/:id/export-platform` 共用参数：

```json
{
  "platform": "xiaohongshu",
  "compositionId": "COMPOSITION_ID",
  "framing": { "mode": "crop", "positionX": 0.5, "positionY": 0.3 },
  "preview": true,
  "previewTime": 3
}
```

MCP 额外传入 `projectId`，预览以原生图片内容返回。API 预览返回 `preview`（JPEG data URL）、`previewTime`、`duration`、`size`、`compositionId` 和规范化后的 `framing`；不写入图片文件。超出片长的预览时间自动收敛到片尾附近。

省略 `preview` 或设为 `false` 导出整片，返回下载 `url`、构图、源版本和实测码率 `report`。`report.withinCap` 仅说明符合当前编码预算，不能保证平台不重新编码。旧调用不传构图参数时仍使用模糊背景。

导出与其他本地合成任务共用并发限制，使用独立临时文件，验证输出尺寸和时长后才提供完整文件。音轨按源文件可选映射，源元数据随输出保留。
