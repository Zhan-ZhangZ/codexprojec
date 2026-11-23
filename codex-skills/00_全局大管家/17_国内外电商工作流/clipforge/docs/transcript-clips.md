# 片段工作台

把一条已转写的长素材整理成可预览、可剪辑的短片段。片段查找在本地使用已有逐词稿，无需新模型或 API Key。

## 网页操作

1. 进入项目的「素材 → 按文字剪视频」，导入原片并完成本地转写。
2. 在「片段工作台」输入原话关键词，或留空查看建议；选择 15 / 30 / 60 / 90 秒目标时长。
3. 查看真实原话、原片时间范围和句末/停顿依据，点击「预览原片」试听。预览到片段末尾自动暂停。
4. 点击「只保留这段」，或展开「手动指定时间范围」输入开始/结束秒数。区间内已有删词设置保留，仍可去静音、撤销、重做或取消区间限制。
5. 点击「预演剪辑」，核对时长、字幕和删除摘要，再生成新的剪辑版本。原片与旧版本继续保留。

目标时长允许随附近句子边界调整。关键词按字面匹配原话，支持中英文、大小写和全角字符归一化；建议由逐词时间、句末和停顿规则产生，适合先定位再人工试听。没有匹配时可缩短关键词或手动指定范围。

## CLI

```sh
node bin/clipforge.mjs clips --project PROJECT_ID --media MEDIA_ID --query 不漏水 --seconds 30 --limit 6
```

返回 `latestRevision` 和 `candidates`。每个候选包含 `text`、`sourceRange`、`duration`、`firstWordId`、`lastWordId`、`reasons`、`plan`。`speechRatio` 表示逐词时间覆盖占比。候选查询只读，不渲染、不创建版本。

将所选候选的 `plan` 和查询返回的 `latestRevision` 保存为剪辑计划文件：

```json
{
  "baseRevision": 0,
  "plan": {
    "version": 1,
    "removedWordIds": [],
    "removeSilence": false,
    "silencePaddingMs": 120,
    "wordPaddingMs": 25,
    "burnSubtitles": true,
    "sourceRange": { "start": 12.5, "end": 39.2 }
  }
}
```

示例秒数需要替换为候选实际范围，`baseRevision` 需要替换为查询结果。

```sh
# 预演，核对返回的 diff 和实际预计时长
node bin/clipforge.mjs transcript-edit --project PROJECT_ID --media MEDIA_ID --plan clip.json --operation clip-edit-001
# 确认采用后，以相同计划和 operation 提交新版本
node bin/clipforge.mjs transcript-edit --project PROJECT_ID --media MEDIA_ID --plan clip.json --operation clip-edit-001 --apply
```

## MCP / API

`clipforge_find_clips` 接受 `projectId`、`mediaId`，以及可选 `query`、`targetSeconds`、`limit`。将选定的 `plan` 交给 `clipforge_transcript_edit` 预演；`baseRevision` 使用 `latestRevision`。如需保留当前草稿删词设置，先 inspect 获取完整计划，仅替换其 `sourceRange`。

HTTP 查询：`GET /api/project/{projectId}/media/{mediaId}/clips?query=...&targetSeconds=30&limit=6`。关键词最多 160 字，目标时长 5–120 秒，数量 1–12；未完成转写返回 409，无效参数返回 400。

`sourceRange` 使用原片秒数，先限制整体区间，再应用删词和静音处理。未提供此字段的旧计划继续使用完整原片。无效、倒置、非有限值或超出原片的区间返回 422。版本过期继续返回 409，重复操作沿用原有幂等处理。

网页即时预览、新版本渲染、SRT / VTT 字幕及 OTIO / EDL / CSV 时间线共用保留区间。字幕重新从输出时间起点计算，时间线仍指向原片中的真实位置。

多选批量输出、字幕词组校对、任务取消和恢复见[队列与校对说明](transcript-reliability.md)。
