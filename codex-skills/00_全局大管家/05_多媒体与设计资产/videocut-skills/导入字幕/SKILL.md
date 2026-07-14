---
name: videocut:导入字幕
description: 视频转录 + AI校对 → 一键生成带花字的剪映草稿（默认）/ 或导出 SRT 文件。触发词：导入字幕、导出字幕、生成剪映草稿、带花字字幕、生成SRT
---

<!--
input: 视频文件 (*.mp4)，可选原稿 (*.md)
output: 剪映草稿目录（默认）/ video.srt（可选）
pos: 剪辑完成后，把字幕导入剪映

架构守护者：一旦我被修改，请同步更新：
1. ../README.md 的 Skill 清单
2. /CLAUDE.md 路由表
-->

# 导入字幕

> 火山引擎转录 → AI 校对 → **默认**直接生成剪映草稿（带花字+动画）
> 可选输出 SRT 文件（老流程）

首次运行 `srt_to_draft.py` 会自动检测 capcut-mate 服务，没起就自己装+启，用户无感。

**首次使用前还需配一次火山 apikey**（转录用）——在 `.claude/skills/.env` 填 `VOLCENGINE_API_KEY=xxx`，详见 [安装/SKILL.md](安装/SKILL.md)。只配一次，之后所有视频复用。


## 开工前确认（必做）

向用户确认两件事：

1. **有没有口播原稿 或 错词字典？**（用于校对产品名/术语）
   - 有口播稿 → 要求用户给出原稿路径，准确率 99%
   - 有字典 → 要求用户给出字典路径（参考 [references/错词字典模板.md](references/错词字典模板.md)），准确率 95%+
   - 两样都没 → 按音频识别结果走，提醒用户专名可能不准（95%）
2. **花字 / 入场动画偏好？**（可选）
   - 默认不加
   - 常用清单见 [references/花字清单.md](references/花字清单.md) 和 [references/动画清单.md](references/动画清单.md)

## 快速使用

```
用户: 导入字幕 / 导出字幕          → 默认走草稿模式
用户: 生成剪映草稿                → 草稿模式
用户: 带花字字幕 火焰燃烧花字      → 草稿模式 + 花字
用户: 生成SRT / 出字幕文件         → SRT 模式（老流程）
```

## 流程总览

```
0. 查找视频 + 跟用户确认（原稿？花字/动画？）
    ↓
1. 字幕识别（提取音频 → 上传 → 火山引擎转录 → subtitles_with_time.json）
    ↓
2. 修正（AI 逐条校对，有原稿则对照）
    ↓
3. 推送剪映草稿（本 Skill 核心：一键下载环境 + 踩坑内置 + 默认预设）
    ↓
4. 输出 SRT 文件（3_输出/video.srt，老流程兼容）
    ↓
5. 给用户同时报两个位置（SRT 路径 + 草稿名）
```

SRT 文件永远会落到 `3_输出/video.srt`，同时默认调 `srt_to_draft.py` 推进剪映。
用户明确说"只要 SRT 别推草稿"才跳过推送。

## 输出目录

```
output/YYYY-MM-DD_视频名/字幕/
├── 1_转录/
│   ├── audio.mp3
│   └── volcengine_result.json
├── subtitles_with_time.json
└── 3_输出/
    └── video.srt          ← SRT 模式产物（可选）
```

草稿模式产物落在 `~/Movies/JianyingPro/User Data/Projects/com.lveditor.draft/{草稿名}/`。

---

## Step 0: 查找视频 + 确认原稿

优先级：用户传入 > `剪口播/3_审核/*_cut.mp4` > 原始视频

```bash
OUTPUT_DIR="output/YYYY-MM-DD_视频名"
CUT_VIDEO=$(find "$OUTPUT_DIR/剪口播/3_审核" -name "*_cut.mp4" -type f 2>/dev/null | head -1)
VIDEO_PATH="${CUT_VIDEO:-用户传入的路径}"
```

⚠️ 字幕必须基于**剪辑后视频**，不能用原始视频（时间戳不匹配）。

### 跟用户确认原稿

```
你: 开始前先问一下——
   1. 有没有口播原稿？（有的话请给路径，没有的话产品名/术语可能不准）
   2. 要不要加花字和入场动画？（可选，默认不加）
```

**用户没回复原稿这一项，就等用户明确回复再继续**，不要自己假设"没有"。

## Step 1: 字幕识别（转录）

```bash
cd 字幕/1_转录
ffmpeg -i "file:$VIDEO_PATH" -vn -acodec libmp3lame -y audio.mp3
curl -s -F "files[]=@audio.mp3" https://uguu.se/upload
SKILL_DIR="/Volumes/成峰/代码/剪辑Agent/.claude/skills/剪口播"
bash "$SKILL_DIR/scripts/volcengine_transcribe.sh" "https://xxx.mp3"
```

### 生成 subtitles_with_time.json

```javascript
const result = JSON.parse(fs.readFileSync('volcengine_result.json'));
const subtitles = result.utterances.map((u, i) => ({
  id: i + 1,
  text: u.text,
  start: u.start_time / 1000,
  end: u.end_time / 1000
}));
fs.writeFileSync('subtitles_with_time.json', JSON.stringify(subtitles, null, 2));
```

## Step 2: 修正（AI 校对）

**逐条阅读全部字幕，手动校对。**

1. **只改不加**：只修正识别错误，不添加视频没说的话
2. **产品名准确**：对照原稿确认产品名、人名拼写（无原稿则根据上下文推断，标注不确定的地方）
3. **碎片合并**：被拆成两条的短句合并
4. **句尾无标点**

### 常见误识别

| 误识别 | 正确 |
|--------|------|
| CE/ce/c | C1（或具体产品名） |
| 正特/整特/IT | Agent |
| cloud code | Claude Code |
| 成风/乘风 | 成峰 |
| 艺人 | 一人 |

### 有原稿时

- 对照原稿验证产品名、术语
- **原稿没有的 = 删除**（剪口播已剪掉）
- **不从原稿往字幕补内容**

---

## Step 3: 推送剪映草稿

```bash
python3 scripts/srt_to_draft.py output/*/字幕/3_输出/video.srt \
    --name 我的视频 \
    --effect 火焰燃烧花字 \
    --anim 渐显
```

- `--name` 草稿名
- `--effect` 花字（可选，见 [references/花字清单.md](references/花字清单.md)）
- `--anim` 入场动画（可选，见 [references/动画清单.md](references/动画清单.md)）
- 其余样式参数（字号/画布/颜色/描边/位置）走默认预设，想改查代码或传参覆盖

关闭服务：`bash scripts/stop.sh`

---

## Step 4: 输出 SRT 文件

### 生成 SRT

```javascript
function toSRT(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const ms = Math.round((sec % 1) * 1000);
  return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')},${ms.toString().padStart(3,'0')}`;
}
let srt = '';
subtitles.forEach((s, i) => {
  srt += (i + 1) + '\n' + toSRT(s.start) + ' --> ' + toSRT(s.end) + '\n'
       + s.text.replace(/[。！？]+$/g, '') + '\n\n';
});
fs.writeFileSync('3_输出/video.srt', srt.trim());
```

---

## Step 5: 给用户同时报两个位置

```
✅ 搞定，两个产物都给你：

📄 SRT 文件
   output/YYYY-MM-DD_视频名/字幕/3_输出/video.srt
   （如果你已经在剪映里剪过这条视频，直接把这个 .srt 拖进时间线即可）

🎬 剪映草稿
   Cmd+Q 退出剪映 → 重开 → 首页找「我的视频-xxxxxxxx」
```

SRT 路径必须明确告知。很多时候用户已经在剪映里剪好了视频，新草稿对他没用，
他要的就是那个 SRT 文件自己拖进现有草稿。

---

## 字幕规范

| 规则 | 说明 |
|------|------|
| 一屏一行 | 不换行 |
| 句尾无标点 | `你好` 不是 `你好。` |
| 句中保留标点 | `先点这里，再点那里` |
