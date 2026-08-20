// Fails when the locale message files don't have identical key sets — for
// the core bundle and for every module bundle independently, so a module can
// only ever break its own parity.
// Run with `bun run i18n:check`.

import en from '../messages/en.json'
import zh from '../messages/zh.json'
import { modules } from '../src/core/module/registry'

function flattenKeys(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null) return [prefix]
  return Object.entries(value).flatMap(([key, child]) =>
    flattenKeys(child, prefix ? `${prefix}.${key}` : key),
  )
}

export function diffMessageKeys(
  a: object,
  b: object,
): { missingInB: string[]; missingInA: string[] } {
  const aKeys = new Set(flattenKeys(a))
  const bKeys = new Set(flattenKeys(b))
  return {
    missingInB: [...aKeys].filter((key) => !bKeys.has(key)),
    missingInA: [...bKeys].filter((key) => !aKeys.has(key)),
  }
}

export type Bundle = { name: string; en: object; zh: object }

/** The core bundle plus one per module, each checked on its own. */
export async function messageBundles(): Promise<Bundle[]> {
  const moduleBundles = await Promise.all(
    modules.map(async (feature) => ({
      name: `src/modules/${feature.id}/messages`,
      en: (await feature.messages.en()).default,
      zh: (await feature.messages.zh()).default,
    })),
  )
  return [{ name: 'messages', en, zh }, ...moduleBundles]
}

if (import.meta.main) {
  const bundles = await messageBundles()
  let failed = false
  let total = 0

  for (const bundle of bundles) {
    const { missingInB: missingInZh, missingInA: missingInEn } =
      diffMessageKeys(bundle.en, bundle.zh)
    total += flattenKeys(bundle.en).length

    if (missingInZh.length > 0) {
      failed = true
      console.error(
        `Missing in ${bundle.name}/zh.json:\n  ${missingInZh.join('\n  ')}`,
      )
    }
    if (missingInEn.length > 0) {
      failed = true
      console.error(
        `Missing in ${bundle.name}/en.json:\n  ${missingInEn.join('\n  ')}`,
      )
    }
  }

  if (failed) process.exit(1)
  console.log(
    `Message keys in sync (${total} keys across ${bundles.length} bundles)`,
  )
}
