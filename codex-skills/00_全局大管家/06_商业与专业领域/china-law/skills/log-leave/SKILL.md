---
name: log-leave
description: >
  向假期登记册添加新的员工假期记录，以启动期限追踪。
  在员工开始休假时使用，使leave-tracker能从第一天开始监控期限。
  覆盖年休假、产假、病假/医疗期、工伤假、婚假、育儿假。
user-invocable: true
argument-hint: "[描述假期 — 员工/岗位、假期类型、地点/省份、开始日期]"
---

# /log-leave

向 `~/.claude/plugins/config/claude-for-legal/china-law/leave-register.yaml` 添加新的假期条目，以启动期限追踪所需的最少信息。

## 指令

1. 读取 `~/.claude/plugins/config/claude-for-legal/china-law/CLAUDE.md` → 管辖覆盖范围。

2. 一次性询问所有以下问题——不要逐条滴灌：

   快速几个问题以设置假期追踪：

   - 员工姓名或岗位（可匿名）
   - 工作地点（省份——决定各地奖励假等差异规则）
   - 假期类型：年休假 / 病假(医疗期) / 产假 / 工伤停工留薪期 / 婚假 / 陪产假 / 育儿假 / 其他
   - 假期开始日期
   - 预计返岗日期（如已知——否则留空）
   - 累计工作年限？本单位工作年限？（关键——决定医疗期长度和年休假天数）
   - 是否多胞胎/难产？（如为产假）
   - 是否有工伤认定书？（如为工伤假）

3. 根据已知信息计算首个即将到来的关键期限：
   - 医疗期 → 根据工作年限确定届满日
   - 产假 → 根据生产情况计算98天+难产/多胞胎附加+地方奖励假
   - 年休假 → 跨年度截止日（下年度12月31日）
   - 工伤 → 12个月/24个月截止日

4. 将新条目写入 `~/.claude/plugins/config/claude-for-legal/china-law/leave-register.yaml`。如果文件不存在，创建它。

   ```yaml
   leaves:
     - id: L-001
       employee: "[姓名或岗位]"
       location: "[省份/直辖市]"
       type: "[年休假|病假|产假|工伤|婚假|陪产假|育儿假|其他]"
       start_date: YYYY-MM-DD
       expected_return: YYYY-MM-DD  # 如未知留空
       total_service_years: N
       company_service_years: N
       duration_days: N  # 法定期限
       first_deadline:
         type: "[届满|跨年度截止|返岗]"
         date: YYYY-MM-DD
       status: active
       notes: ""
   ```

5. 一行确认：
   > "已记录。[员工/岗位] — [假期类型] — [地点] — 自[日期]起。首个关键期限：[什么及何时]。leave-tracker 将自动预警。"

## 示例

```
/china-law:log-leave
张三（高级工程师，北京工作）今天开始请病假。累计工作年限8年，在本单位工作5年。
```

```
/china-law:log-leave
李四（产品经理，上海）预产期下月，计划从下周开始休产假，单胎。
```

**参考法律渊源:**
- 《企业职工患病或非因工负伤医疗期规定》`[PKULaw]`
- 《女职工劳动保护特别规定》第7条 `[PKULaw]`
- 《职工带薪年休假条例》`[PKULaw]`
- 《工伤保险条例》第33条 `[PKULaw]`
