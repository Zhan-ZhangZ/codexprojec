---
name: gap-surfacer
description: >
  追踪开放的法律合规差距，标记差距状态和补救进展。
  摄入法规变化产生的差距，展示开放和逾期的项目，路由至负责人。
  依据中国法律监管框架变化进行合规差距管理。
user-invocable: true
argument-hint: "[--status | --close GAP-XXX | --accept GAP-XXX]"
---

# /gap-surfacer

追踪法律合规差距，直到其被关闭。差距被发现然后被遗忘——此技能持续追踪直到完成。

## 差距登记册

位于 `~/.claude/plugins/config/claude-for-legal/china-law/gap-tracker.yaml`：

```yaml
gaps:
  - id: GAP-001
    requirement: "[法规要求的内容]"
    regulation: "[法规名称+条文]"
    policy_affected: "[受影响的政策名称 或 '需要新政策']"
    gap_type: "partial"  # none | partial | full | new-policy | watch
    owner: "[负责人姓名]"
    opened: 2026-05-01
    due: 2026-08-01
    status_verified: true
    status: "open"  # open | in-progress | closed | risk-accepted
    resolution: ""  # 关闭时填写
```

**`gap_type` 语义：**

| 值 | 含义 |
|---|------|
| `none` | 政策已覆盖，仅保留审计轨迹 |
| `partial` | 政策涉及该主题但未完全覆盖新要求 |
| `full` | 政策与新要求相悖或有遗漏 |
| `new-policy` | 无现有政策覆盖 |
| `watch` | 前瞻性条目——建议稿/征求意见稿，尚无合规义务 |

## 模式

### 模式 1: 状态报告

```markdown
[工作成果标记]

## 开放差距 — [日期]

### 底限

[N项差距需在[日期]前采取行动 — 前3项: X, Y, Z]

### 🔴 逾期

| ID | 要求 | 政策 | 负责人 | 到期日 | 逾期天数 |

### 🟠 30天内到期

[同上]

### 🟡 开放

[同上]

### 👀 监控项（前瞻——尚未形成规则）

[尚未生效的法规草案、征求意见稿]

### 进行中

[同上]

### 最近关闭

[最近5项，附处理方式]

---
**最早开放的差距:** [ID], [N]天
**各项负责人差距分布:** [按负责人分列]
```

### 模式 2: 关闭差距

```
/china-law:gap-surfacer --close GAP-001
处理方式: "已更新政策v2.3，于[日期]批准"
```

### 模式 3: 风险接受

```
/china-law:gap-surfacer --accept GAP-002
理由: "要求仅适用于不符合的条件。如触发[条件]时重新审视。"
接受人: [有权限的姓名]
```

## 适用中国法注意事项

中国法律法规修订通常以修正案或修订案形式发布，需关注：
- 新法过渡期安排
- 行政法规和部门规章的配套修订时间差
- 地方法规和地方政府规章的差异性要求
- 司法解释的溯及力规定

**参考法律渊源:**
- 《中华人民共和国立法法》(2023修正) `[PKULaw]`
- 《法规规章备案规定》`[PKULaw]`
