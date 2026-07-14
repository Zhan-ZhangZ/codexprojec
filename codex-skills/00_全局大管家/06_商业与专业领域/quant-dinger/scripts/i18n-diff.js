#!/usr/bin/env node
/**
 * i18n 缺失 key 分析工具
 * 用法:
 *   node scripts/i18n-diff.js              # 概览
 *   node scripts/i18n-diff.js --detail     # 列出前 50 条缺失
 *   node scripts/i18n-diff.js --lang=ja-JP # 列出指定语言全部缺失
 */
const fs = require('fs')
const path = require('path')

const LANG_DIR = path.join(__dirname, '..', 'QuantDinger-Vue-src', 'src', 'locales', 'lang')
const BASE = 'zh-CN'

function extractKeys (filePath) {
  const src = fs.readFileSync(filePath, 'utf8')
  const keys = new Set()
  const re = /^\s*['"]([\w\-.]+)['"]\s*:/gm
  let m
  while ((m = re.exec(src)) !== null) {
    keys.add(m[1])
  }
  return keys
}

function main () {
  const args = Object.fromEntries(process.argv.slice(2).map(a => {
    if (a.startsWith('--')) {
      const [k, v] = a.slice(2).split('=')
      return [k, v === undefined ? true : v]
    }
    return [a, true]
  }))
  const files = fs.readdirSync(LANG_DIR).filter(f => f.endsWith('.js'))
  const baseKeys = extractKeys(path.join(LANG_DIR, BASE + '.js'))
  console.log(`[base] ${BASE}.js  keys=${baseKeys.size}`)
  console.log('='.repeat(70))

  const report = {}
  for (const f of files) {
    const lang = f.replace('.js', '')
    if (lang === BASE) continue
    const keys = extractKeys(path.join(LANG_DIR, f))
    const missing = [...baseKeys].filter(k => !keys.has(k))
    const extra = [...keys].filter(k => !baseKeys.has(k))
    report[lang] = { total: keys.size, missing, extra }
    console.log(`${lang.padEnd(7)}  keys=${String(keys.size).padStart(4)}  missing=${String(missing.length).padStart(4)}  extra=${extra.length}`)
  }

  if (args.lang) {
    const info = report[args.lang]
    if (info) {
      console.log(`\n=== ${args.lang} missing keys (${info.missing.length}) ===`)
      info.missing.forEach(k => console.log('  ' + k))
    }
    return
  }

  if (args.detail) {
    console.log('\n=== Missing keys per language ===')
    for (const [lang, info] of Object.entries(report)) {
      if (!info.missing.length) continue
      console.log(`\n-- ${lang} (${info.missing.length} missing) --`)
      info.missing.slice(0, 50).forEach(k => console.log('  ' + k))
      if (info.missing.length > 50) console.log(`  ... and ${info.missing.length - 50} more`)
    }
  }
}

main()
