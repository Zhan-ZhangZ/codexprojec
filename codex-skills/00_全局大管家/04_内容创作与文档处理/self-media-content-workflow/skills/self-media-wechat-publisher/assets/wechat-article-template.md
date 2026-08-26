# 公众号文章 frontmatter 模板

## 图文消息

```markdown
---
title: 文章标题（必填）
cover: ./assets/cover.png
author: 作者名
source_url: https://example.com/original
---

正文从这里开始。文内图片用本地路径或网络地址，发布时自动上传素材库。
```

- `cover` 缺省时自动取正文第一张图。
- `source_url` 为原文链接，可省略。

## 小绿书图片消息

```markdown
---
title: 图片消息标题
type: image
---

![](./1.png)
![](./2.png)
![](./3.png)
```

或手动指定顺序：

```markdown
---
title: 图片消息标题
image_list:
  - ./1.png
  - ./2.png
  - ./3.png
---
```

最多 20 张，首图即封面。
