# Roomsmith

**开源的 AI 室内设计 Agent。**

输入真实房间照片，输出比例平面图、墙面立面、轴测剖视图、照片级效果图和 PDF 设计方案；每一项改动都附带规格、设计理由和针对真实空间约束的验证。

[![License: MIT](https://img.shields.io/badge/License-MIT-black.svg)](LICENSE)
[![Python 3.9+](https://img.shields.io/badge/python-3.9%2B-black.svg)](https://www.python.org/)
[![No dependencies](https://img.shields.io/badge/dependencies-none-black.svg)](#运行要求)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-black.svg)](https://github.com/Rumeasiyan/roomsmith/blob/0e1c042cab0301d270e77575aa2dfbb028a5dab1/CONTRIBUTING.md)

![维多利亚式家庭办公室效果图，烟囱两侧设有嵌入式书架](https://raw.githubusercontent.com/Rumeasiyan/roomsmith/0e1c042cab0301d270e77575aa2dfbb028a5dab1/docs/media/hero-render.jpg)

同一房间模型生成的比例平面图、轴测剖视图和窗墙效果图彼此一致。

---

Roomsmith 是一套运行在 [Claude Code](https://claude.com/claude-code) 中的 AI 室内设计工具。它会读取真实房间照片，访谈客户、测绘空间、生成带比例和尺寸的平面图与墙面立面、输出照片级效果图，并整理成客户可交付的 PDF 报告。审批门禁确保未经人工确认，不会进行昂贵或难以撤销的操作。

它不是情绪板生成器。每个设计方向都是具有实测布局的空间命题；每项改动都有规格、理由和验证。

```bash
./bin/design init my-room
cp ~/photos/*.jpg projects/my-room/refs/
```

随后在 Claude Code 中运行：

```text
/interior-design
```

## 交付内容

每个设计方向包含：

| 输出 | 内容 |
|---|---|
| **平面图** | 带比例、尺寸、家具和通行动线的平面图 |
| **蓝图** | 同一房间的制图风格版本 |
| **墙面立面** | 每面墙的正视图，所有开口均标注尺寸 |
| **轴测图** | 展示空间内部关系的剖切模型 |
| **照片级效果图** | 每个相机视角一张，例如主视角、反向视角、坐姿视点和角落总览 |
| **有理由的改动** | 每项物品均包含规格、设计理由和约束验证 |

此外还会生成一份 PDF，包含测绘、完整图纸与效果图，以及证明各方向确实不同的对比矩阵。

## 为什么不直接提示图像模型？

普通图像模型容易画出无法落地改造的房间：

| 问题 | Roomsmith 的处理 |
|---|---|
| 生成原本不存在的门窗 | 门洞与窗洞清单以及“这些墙为实墙”的约束都由房间模型生成，并写入每个提示词 |
| 把小房间画得过于宽敞 | 以比例图纸作为图像参考；每个方向都用算术验证布局能否容纳 |
| 悄悄删除客户必须保留的家具 | 将 `must_appear` 物品固定写入每个提示词，再由对抗式审查 Agent 检查 |
| 五个方案只是同一种想法的变体 | 两个方向必须在 7 个维度的至少 4 个上不同，才算真正不同 |
| 效果像酒店大堂 | 将文化、地域和家庭语境写入 brief，而不是最后随意添加 |
| 发现问题前已经花费大量成本 | 先完整制作并审查一个方向，再渲染其余方向；花费上限按真实 API 成本执行 |

**几何绝不由图像模型生成。** 平面图、立面图和轴测图由代码从同一个房间模型绘制，再作为参考交给渲染器。图像模型只负责光线、材质和氛围，无权定义房间本身。

## 各部分如何协作

```text
Claude Code ── 六个 Agent：访谈、测绘、策略、撰写、评审、报告
     │
     ├── design CLI（Python）── 房间模型、比例图纸、提示词、报告（无 AI）
     │
     └── 图像后端 ── codex CLI（免费，有配额）
                    └─ OpenRouter（付费，约 $0.18/张）
                       两者默认使用同一模型
```

Claude 负责设计判断：读取照片、编写规格、审查结果。它不绘制平面图，也不生成图片。几何由代码计算；图像通过所选后端生成。

## Roomsmith 与直接提示图像模型

|  | 单独使用图像模型 | Roomsmith |
|---|---|---|
| 平面图 | 无 | 带比例和尺寸，由代码绘制 |
| 墙面立面 | 无 | 每面墙一张正视图 |
| 尊重房间尺寸 | 否 | 是，几何由代码计算而非生成 |
| 虚构门窗 | 经常发生 | 不会，开口清单由模型生成 |
| 保留不可移除家具 | 否 | 通过 `must_appear` 强制并审查 |
| 方案真正不同 | 通常只是同一想法的变体 | 执行 7 个维度中至少 4 个不同的规则 |
| 每项改动的理由 | 无 | 规格、理由和验证 |
| 客户报告 | 无 | 包含测绘、对比矩阵和完整方案的 PDF |
| 成本控制 | 无 | 按真实单图成本执行预算上限 |

## 六个 Agent

| Agent | 职责 |
|---|---|
| `design-intake` | 访谈客户，询问最常被忽略的问题：*这个房间里有什么东西绝对不能移走？* |
| `design-surveyor` | 阅读全部照片，明确清点开口数量，建立实测房间模型 |
| `design-strategist` | 规划整套方向，并证明每个方向确实不同 |
| `design-author` | 一次撰写一个方向：空间命题、实测布局和每项改动的理由 |
| `design-critic` | 只读审查，报告根因，而不手工修补单张图片 |
| `design-reporter` | 汇总报告，并回读生成的 PDF 以检查版面错误 |

## 审批门禁

未经客户决定，不会执行昂贵或不可逆的操作。工具会直接拒绝，而不是反复追问。

`brief` → `room-model` → `direction-set` → `pilot` → `spend` → `report`

```bash
./bin/design status
./bin/design approve room-model --note "measured on site"
```

## 完整案例

`projects/study-terrace/` 是仓库中保留的示例项目：一间 3.4 × 3.8 米的维多利亚式后卧室被改造成全职家庭办公室，并完整经过各道门禁。

**规划 6 个方向 · 完整撰写 2 个 · 35 项有理由的改动 · 包含烟囱凸出结构的 8 面墙模型 · 所有展示用门禁均有记录**

真实客户项目不进入仓库。[`docs/EXAMPLE.md`](docs/EXAMPLE.md) 讲解这一案例，并记录一次真实的 20 方向项目为达到质量所修正的七个错误，包括漏掉窗户、平面图镜像和自身算术无法成立的设计。

## 常见问题

<details>
<summary><b>运行需要什么？</b></summary>

Python 3.9+（不需要第三方库）、Chrome 或 Chromium，以及一个渲染后端。
</details>

<details>
<summary><b>成本是多少？</b></summary>

**默认报告可以免费生成。** `room` 模板为 6 个方向 × 3 个视角 = 18 张图，而一个 Codex 免费配额窗口约可生成 45 张，因此可在一次会话内完成。

OpenRouter 按图像计费，实测 29 张账单图片平均约 **$0.183/张**：

| 项目 | 图片数 | Codex 免费后端 | OpenRouter 付费 |
|---|---|---|---|
| 默认报告（6 × 3） | 18 | 一次会话 | 约 $3.30 |
| 一个方向（6 视角） | 6 | 一次会话 | 约 $1.10 |
| 大型方案（20 × 6） | 120 | 约 3 次会话，需要暂停等待 | 约 $22 |

`design render` 会在开始前显示所属区间。`render.max_spend_usd` 按 API 返回的真实单图成本执行硬上限。
</details>

<details>
<summary><b>如何在不消耗配额或费用的情况下测试？</b></summary>

可以运行 `./bin/design render --dry`。它会构建全部提示词、解析并验证参考图片，但不调用图像模型，也不写输出。它还能提前发现缺少图纸、配置中指定但实际不存在的照片、没有相机的视角，以及没有场景描述的规格。
</details>

<details>
<summary><b>一次免费会话能完成吗？</b></summary>

Codex 配额窗口通常可生成约 45–50 张图，然后暂停约 4–5 小时。内置模板需要 18 或 20 张图，可在同一个窗口内完成。超过约 45 张时会暂停；`./bin/design render --wait` 会等待重置并自动继续，已完成视角会被跳过。
</details>

<details>
<summary><b>适用于厨房、卧室、办公室或 L 形房间吗？</b></summary>

适用。房间模型支持矩形、带凹室的矩形，以及任意角度的多边形。仓库附带 `room` 和 `kitchen` 模板。
</details>

<details>
<summary><b>可以使用自己的图像模型吗？</b></summary>

可以。后端是 `engine/render.py` 中的一个函数。当前支持 Codex（免费，有配额）和 OpenRouter（付费）。两者默认使用同一模型，以免同一组图片的风格不一致。
</details>

<details>
<summary><b>房间数据是否私密？</b></summary>

是。客户照片和所有输出默认被 Git 忽略；仓库只提交 brief、测绘和设计规格，这些文件可以重新生成其余产物。
</details>

<details>
<summary><b>必须使用 Claude Code 吗？</b></summary>

Agent 工作流需要 Claude Code。如果愿意自行编写设计规格，`design` CLI 也可以独立用于图纸、提示词和报告。
</details>

## 适用对象

- 需要向客户提供多套可选方案的室内设计师和建筑师。
- 希望获得有尺寸依据的改造建议、而不是情绪板的业主。
- 需要从同一真实空间模型生成实测图纸和照片级视觉效果的团队。

**不适用的情况：** 只需要一张没有尺寸的快速风格图，通用图像模型更快。Roomsmith 也不是 CAD 软件，它输出展示图纸，不输出施工图；所有从照片推断的尺寸都必须现场复核。

## 文档

| 文档 | 内容 |
|---|---|
| [SETUP](docs/SETUP.md) | 安装和首次运行 |
| [USAGE](docs/USAGE.md) | 命令和操作配方 |
| [WORKFLOW](docs/WORKFLOW.md) | 按门禁组织的完整工作流 |
| [CONFIG](docs/CONFIG.md) | 全部 `project.yml` 配置项 |
| [AGENTS](docs/AGENTS.md) | Agent 团队与交接 |
| [ARCHITECTURE](docs/ARCHITECTURE.md) | 架构与设计理由 |
| [TROUBLESHOOTING](docs/TROUBLESHOOTING.md) | 故障处理 |
| [FAQ](docs/FAQ.md) | 常见问题 |
| [EXAMPLE](docs/EXAMPLE.md) | 完整案例 |

## 运行要求

Python 3.9+ · Chrome 或 Chromium · 一个渲染后端（[Codex CLI](https://github.com/openai/codex) 免费，或 [OpenRouter](https://openrouter.ai) API key）

## 贡献

欢迎贡献新的房间模板、渲染后端、图纸类型和验证规则。请阅读上游[贡献指南](https://github.com/Rumeasiyan/roomsmith/blob/0e1c042cab0301d270e77575aa2dfbb028a5dab1/CONTRIBUTING.md)。

## 许可

MIT，详见 [LICENSE](LICENSE)。

---

**Roomsmith** — AI 室内设计 Agent · AI 房间设计 · 平面图生成 · 从照片生成建筑图纸 · 室内设计自动化 · Claude Code Agents
