import { getTranslations } from 'next-intl/server'
import { navEntries, sectionTitleKey } from '@/core/module/derive'
import type { Locale } from '@/i18n/routing'
import type { TranslatedResource } from '@/lib/content'
import type { ResourceType } from '@/lib/resource-meta'
import { Glow } from './primitives'

// Straight from the design: brand hue, violet, amber, cyan, green, brand tint.
const TINTS = [
  'oklch(0.62 0.19 25 / 0.5)',
  'oklch(0.65 0.14 300 / 0.5)',
  'oklch(0.72 0.16 55 / 0.5)',
  'oklch(0.7 0.14 200 / 0.5)',
  'oklch(0.75 0.15 155 / 0.5)',
  'oklch(0.62 0.19 25 / 0.35)',
]

// A still of the real product, drawn from real published resources rather
// than invented ones. The address bar shows the app's own path because no
// hostname can be assumed — the same image ships to Vercel and to Docker.
export async function PreviewMock({
  locale,
  items,
}: {
  locale: Locale
  items: TranslatedResource[]
}) {
  // The mock sidebar mirrors the real nav, so it can never advertise a
  // section the site does not have.
  const [t, label, content, common] = await Promise.all([
    getTranslations('home'),
    getTranslations(),
    getTranslations('content'),
    getTranslations('common'),
  ])

  return (
    <div className="animate-fade-up relative mx-auto mt-16 w-full max-w-5xl [animation-delay:420ms] sm:mt-20">
      <Glow
        className="inset-x-[-3.75rem] -top-10 h-75"
        color="oklch(0.62 0.19 25 / 0.18)"
      />
      <div className="relative overflow-hidden rounded-2xl border bg-card text-left shadow-[0_40px_120px_rgba(0,0,0,0.6)]">
        <div className="flex items-center gap-2 border-b bg-background/60 px-4 py-3">
          {[0, 1, 2].map((dot) => (
            <span
              key={dot}
              aria-hidden
              className="size-2.5 rounded-full bg-white/12"
            />
          ))}
          <span className="mx-auto rounded-md bg-white/4 px-3.5 py-1 font-mono text-[11px] text-muted-foreground">
            /{locale}/tools
          </span>
          <span aria-hidden className="w-14" />
        </div>

        <div className="grid min-h-72 sm:grid-cols-[12.5rem_1fr]">
          <div className="hidden flex-col gap-1 border-r bg-background/60 p-3.5 sm:flex">
            <div className="px-2.5 py-1.5 font-mono text-[10px] tracking-[0.12em] text-muted-foreground/70 uppercase">
              {common('appName')}
            </div>
            {navEntries.map((entry, index) => (
              <div
                key={entry.href}
                className={
                  index === 0
                    ? 'flex items-center gap-2 rounded-md bg-white/7 px-2.5 py-2 text-[13px]'
                    : 'px-2.5 py-2 text-[13px] text-muted-foreground'
                }
              >
                {index === 0 ? (
                  <span
                    aria-hidden
                    className="size-1.5 rounded-full bg-brand"
                  />
                ) : null}
                {label(entry.labelKey)}
              </div>
            ))}
          </div>

          <div className="min-w-0 p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="font-display text-base font-bold">
                {t('preview.title')}
              </div>
              <div className="ml-auto rounded-md border px-3 py-1.5 font-mono text-[11px] text-muted-foreground max-sm:hidden">
                {t('preview.search')}
              </div>
            </div>

            {items.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((item, index) => (
                  <div
                    key={item.id}
                    className="min-w-0 rounded-xl border bg-white/2 p-3.5"
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <span
                        aria-hidden
                        className="inline-block size-5.5 rounded-md"
                        style={{
                          background: TINTS[index % TINTS.length],
                        }}
                      />
                      <span className="min-w-0 truncate text-[13px] font-medium">
                        {item.title}
                      </span>
                    </div>
                    <div className="truncate font-mono text-[10px] text-muted-foreground/80">
                      {item.tags[0] ??
                        label(sectionTitleKey(item.type as ResourceType))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {content('empty')}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
