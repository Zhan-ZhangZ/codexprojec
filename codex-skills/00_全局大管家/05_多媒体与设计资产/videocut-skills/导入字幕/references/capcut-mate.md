# capcut-mate API 速查

本地服务：`http://localhost:30000/openapi/capcut-mate/v1/`
文档：`http://localhost:30000/docs`（FastAPI Swagger）
源码：<https://github.com/Hommy-master/capcut-mate>

## 工作流

```
create_draft  → draft_id
    ↓
add_captions / add_videos / add_images / add_effects / add_filters / add_masks / add_sticker
    ↓
save_draft    → 写入 ~/Movies/JianyingPro/User Data/Projects/com.lveditor.draft/{draft_id}/
    ↓
（可选）重命名目录为友好名字 + 同步修正 JSON 内部路径引用
    ↓
重启剪映 → 首页可见
```

## 关键接口

### POST /create_draft
```json
{ "width": 1080, "height": 1920 }
```
返回 `{"draft_url": "...draft_id=xxx"}`。

### POST /add_captions
```json
{
  "draft_url": "...",
  "captions": "[{...}, {...}]",        // ⚠️ JSON 字符串，不是数组
  "font_size": 15,
  "bold": true,
  "has_shadow": true
}
```

单条 caption：
```json
{
  "start": 0,                  // 微秒
  "end": 2000000,
  "text": "字幕内容",
  "text_effect": "火焰燃烧花字", // 可选，花字名
  "in_animation": "冲屏位移"    // 可选，文字入场
}
```

⚠️ **上游 bug**（`setup.sh` 已自动打补丁）：`add_captions.py` 的 `processed_item`
漏了 `text_effect` 字段，导致花字参数被静默吞掉。

### POST /add_videos / /add_images
同样要求 `video_infos` / `image_infos` 传 JSON 字符串。图片必须显式传 `width`/`height`。

### POST /save_draft
把 `DRAFT_CACHE` 里的内存状态落到磁盘。

## 资源清单命名规律

- 花字 → `metadata/text_effect.py`（1673 个）
- 文字入场/出场/循环 → `metadata/text_animation*.py`
- 视频入场/出场/组合 → `metadata/video_animation*.py`
- 滤镜 → `metadata/filter.py`
- 特效 → `metadata/effect.py`
- 转场 → `metadata/transition.py`

名称必须和这些文件里的常量精确匹配，否则静默失败。常用名在
`references/花字清单.md` / `references/动画清单.md`。
