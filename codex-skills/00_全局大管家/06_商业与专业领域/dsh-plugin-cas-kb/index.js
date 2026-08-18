import { readFileSync } from 'node:fs'

/**
 * dsh-plugin-cas-kb 的 glue 插件：注册配套的查证纪律 skill。
 *
 * 工具本身由同一份 patch 里的 `@deepseek-ai/dsh-mcp-client` 行提供，本插件不碰工具
 * 注册表 —— 它只负责把「怎么用这些工具才不会编造条款」交给模型。裸挂工具的失败模式
 * 是模型拿着真原文给出没有锚的结论，那等于用知识库的可信度给幻觉背书。
 */
export const name = 'dsh-plugin-cas-kb'

export const inject = ['skills']

const SKILL_BODY = readFileSync(
  new URL('./skill/china-accounting-standards.md', import.meta.url),
  'utf8',
)

/**
 * 挂载插件：向 `ctx.skills` 注册一个 runtime skill。
 * @param ctx - Cordis 上下文，注入了 `skills` 服务。
 * @param config - 组合配置行的 `config`；`serverName` 必须与同一 patch 里
 *   mcp-client 行的 `serverName` 一致，否则 skill 正文写出的工具名不存在。
 */
export function apply(ctx, config = {}) {
  const serverName = config.serverName ?? 'quaesto_kb'

  ctx.skills.register({
    name: 'china-accounting-standards',
    description:
      '查中国大陆会计准则（企业会计准则 / 小企业会计准则）、中国注册会计师执业准则'
      + '（审计准则 / 质量管理准则 / 职业道德守则及其应用指南）与税法的原文条款、'
      + '判断决策程序、适用性判定与税会差异。回答中国会计、审计或税务问题前先读它。',
    whenToUse:
      '问题涉及中国大陆的会计处理、科目与计量判断、该执行哪套会计准则、企业所得税税前扣除、'
      + '增值税税率与进项抵扣、同一事项的税会差异时使用；也适用于注册会计师审计实务 —— '
      + '风险评估与重大错报风险、内部控制、审计证据与函证、审计抽样、审计报告与意见类型、'
      + '书面声明、持续经营、集团审计、期后事项、职业道德与独立性等。'
      + '与中国口径无关的一般财务问题不需要。',
    source: 'runtime',
    // 工具名由 mcp-client 的 serverName 决定，正文里的占位符在这里补齐，
    // 避免用户改了 serverName 之后 skill 教模型去调一个不存在的工具。
    content: SKILL_BODY.replaceAll('{{server}}', serverName),
    resourceBase: { kind: 'url', url: 'https://open.accountingllm.site/' },
  })
}
