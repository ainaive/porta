import { hasLocale } from 'next-intl'
import { getRequestConfig } from 'next-intl/server'
import { loadModuleMessages } from '@/core/module/messages'
import { routing } from './routing'

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale

  // Core namespaces plus one namespace per feature module, keyed by module
  // id. Module ids may not collide with a core namespace — asserted by
  // src/core/module/registry.test.ts.
  const [core, moduleMessages] = await Promise.all([
    import(`../../messages/${locale}.json`),
    loadModuleMessages(locale),
  ])

  return {
    locale,
    messages: { ...core.default, ...moduleMessages },
  }
})
