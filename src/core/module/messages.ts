import type { Locale } from '@/i18n/routing'
import { modules } from './registry'

/** Each module's bundle, keyed by module id — the namespace it is merged
 *  under. Splitting the files this way is what stops three teams editing one
 *  `messages/*.json` and colliding on every change. */
export async function loadModuleMessages(
  locale: Locale,
): Promise<Record<string, Record<string, unknown>>> {
  const entries = await Promise.all(
    modules.map(
      async (feature) =>
        [feature.id, (await feature.messages[locale]()).default] as const,
    ),
  )
  return Object.fromEntries(entries)
}
