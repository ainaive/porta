// Fails when the locale message files don't have identical key sets.
// Run with `bun run i18n:check`.
import en from '../messages/en.json'
import zh from '../messages/zh.json'

function flattenKeys(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null) return [prefix]
  return Object.entries(value).flatMap(([key, child]) =>
    flattenKeys(child, prefix ? `${prefix}.${key}` : key),
  )
}

const enKeys = new Set(flattenKeys(en))
const zhKeys = new Set(flattenKeys(zh))

const missingInZh = [...enKeys].filter((key) => !zhKeys.has(key))
const missingInEn = [...zhKeys].filter((key) => !enKeys.has(key))

if (missingInZh.length > 0 || missingInEn.length > 0) {
  if (missingInZh.length > 0) {
    console.error(`Missing in zh.json:\n  ${missingInZh.join('\n  ')}`)
  }
  if (missingInEn.length > 0) {
    console.error(`Missing in en.json:\n  ${missingInEn.join('\n  ')}`)
  }
  process.exit(1)
}

console.log(`Message keys in sync (${enKeys.size} keys)`)
