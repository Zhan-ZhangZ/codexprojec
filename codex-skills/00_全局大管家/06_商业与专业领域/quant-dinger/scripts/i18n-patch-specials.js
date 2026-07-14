#!/usr/bin/env node
/**
 * 一次性补齐 AI 脚本无法处理的特殊 key:
 *   - 值为空字符串的 key (正则提取不到)
 *   - 值为嵌套对象的 key (本期脚本只处理 string)
 *   - 中文量词单字 (在西语/亚洲语言里通常留空)
 *
 * 用法: node scripts/i18n-patch-specials.js
 */
const fs = require('fs')
const path = require('path')
const LANG_DIR = path.join(__dirname, '..', 'QuantDinger-Vue-src', 'src', 'locales', 'lang')

// broker 名保留品牌拉丁写法,各语言小幅本地化
const BROKER_NAMES = {
  'ar-SA': {
    ibkr: 'إنتراكتيف بروكرز (Interactive Brokers)',
    mt5: 'MetaTrader 5 (MT5)',
    mt4: 'MetaTrader 4 (MT4)',
    futu: 'فوتو سيكيوريتيز (Futu)',
    tiger: 'تايجر بروكرز (Tiger Brokers)',
    td: 'TD Ameritrade',
    schwab: 'تشارلز شواب (Charles Schwab)'
  },
  'de-DE': {
    ibkr: 'Interactive Brokers (IBKR)',
    mt5: 'MetaTrader 5 (MT5)',
    mt4: 'MetaTrader 4 (MT4)',
    futu: 'Futu Securities',
    tiger: 'Tiger Brokers',
    td: 'TD Ameritrade',
    schwab: 'Charles Schwab'
  },
  'fr-FR': {
    ibkr: 'Interactive Brokers (IBKR)',
    mt5: 'MetaTrader 5 (MT5)',
    mt4: 'MetaTrader 4 (MT4)',
    futu: 'Futu Securities',
    tiger: 'Tiger Brokers',
    td: 'TD Ameritrade',
    schwab: 'Charles Schwab'
  },
  'ko-KR': {
    ibkr: '인터랙티브 브로커스 (Interactive Brokers)',
    mt5: 'MetaTrader 5 (MT5)',
    mt4: 'MetaTrader 4 (MT4)',
    futu: '푸투증권 (Futu)',
    tiger: '타이거증권 (Tiger Brokers)',
    td: 'TD Ameritrade',
    schwab: '찰스 슈왑 (Charles Schwab)'
  },
  'th-TH': {
    ibkr: 'Interactive Brokers (IBKR)',
    mt5: 'MetaTrader 5 (MT5)',
    mt4: 'MetaTrader 4 (MT4)',
    futu: 'Futu Securities',
    tiger: 'Tiger Brokers',
    td: 'TD Ameritrade',
    schwab: 'Charles Schwab'
  },
  'vi-VN': {
    ibkr: 'Interactive Brokers (IBKR)',
    mt5: 'MetaTrader 5 (MT5)',
    mt4: 'MetaTrader 4 (MT4)',
    futu: 'Futu Securities',
    tiger: 'Tiger Brokers',
    td: 'TD Ameritrade',
    schwab: 'Charles Schwab'
  }
}

// dashboard 量词单字:西语/亚洲语言一般不用量词,留空
const UNIT_TRADES = {
  'de-DE': '', 'fr-FR': '', 'ar-SA': '', 'ko-KR': '건', 'th-TH': '', 'vi-VN': ''
}
const UNIT_STRATEGIES = {
  'de-DE': '', 'fr-FR': '', 'ar-SA': '', 'ko-KR': '개', 'th-TH': '', 'vi-VN': ''
}

function formatBrokerObj (lang) {
  const b = BROKER_NAMES[lang]
  const lines = Object.entries(b).map(([k, v]) => `    '${k}': ${JSON.stringify(v)}`)
  return `  'trading-assistant.brokerNames': {\n${lines.join(',\n')}\n  }`
}

function patchFile (lang) {
  const filePath = path.join(LANG_DIR, `${lang}.js`)
  let src = fs.readFileSync(filePath, 'utf8')

  // 找到 locale 对象的结尾 `\n}\n\nexport default`
  const endMark = /\n}\s*\n\s*export default/
  if (!endMark.test(src)) {
    console.warn(`[!] ${lang}: cannot locate locale object end, skip`)
    return
  }

  const addLines = []

  // 1) trading-assistant.empty.path (空字符串)
  if (!/['"]trading-assistant\.empty\.path['"]\s*:/.test(src)) {
    addLines.push(`  'trading-assistant.empty.path': ''`)
  }

  // 2) trading-assistant.brokerNames (对象)
  if (!/['"]trading-assistant\.brokerNames['"]\s*:/.test(src)) {
    addLines.push(formatBrokerObj(lang))
  }

  // 3) dashboard.unit.trades (量词)
  if (!/['"]dashboard\.unit\.trades['"]\s*:/.test(src)) {
    const v = UNIT_TRADES[lang] !== undefined ? UNIT_TRADES[lang] : ''
    addLines.push(`  'dashboard.unit.trades': ${JSON.stringify(v)}`)
  }

  // 4) dashboard.unit.strategies (量词)
  if (!/['"]dashboard\.unit\.strategies['"]\s*:/.test(src)) {
    const v = UNIT_STRATEGIES[lang] !== undefined ? UNIT_STRATEGIES[lang] : ''
    addLines.push(`  'dashboard.unit.strategies': ${JSON.stringify(v)}`)
  }

  if (!addLines.length) {
    console.log(`[${lang}] nothing to patch`)
    return
  }

  // 插入到 `\n}\n\nexport default` 之前,并在前一行末加逗号
  const patched = src.replace(endMark, (match) => {
    return `,\n${addLines.join(',\n')}\n}\n\nexport default`
  })

  fs.writeFileSync(filePath, patched, 'utf8')
  console.log(`[${lang}] patched ${addLines.length} key(s)`)
}

const TARGETS = ['ar-SA', 'de-DE', 'fr-FR', 'ko-KR', 'th-TH', 'vi-VN']
for (const l of TARGETS) patchFile(l)
console.log('\nAll done. Verify with: node scripts/i18n-diff.js')
