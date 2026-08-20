import { hasLocale } from 'next-intl'
import { getRequestConfig } from 'next-intl/server'
import type { MessageLoader } from '@/core/module/define'
import { loadModuleMessages } from '@/core/module/messages'
import { type Locale, routing } from './routing'

// One static import per locale, the same shape a module declares for its own
// bundle. An interpolated `import(`../../messages/${locale}.json`)` read more
// cheaply but relied on the bundler generating a context module, and a path
// assembled at runtime is a path no static check can follow — the boundary
// verifier treats every interpolated import as unresolvable for exactly that
// reason. Typed by `Locale`, so adding one is a compile error here rather
// than a 404 at request time.
const CORE_MESSAGES: Record<Locale, MessageLoader> = {
  en: () => import('../../messages/en.json'),
  zh: () => import('../../messages/zh.json'),
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale

  // Core namespaces plus one namespace per feature module, keyed by module
  // id. Module ids may not collide with a core namespace — asserted by
  // src/core/module/registry.test.ts.
  const [core, moduleMessages] = await Promise.all([
    CORE_MESSAGES[locale](),
    loadModuleMessages(locale),
  ])

  return {
    locale,
    messages: { ...core.default, ...moduleMessages },
  }
})
