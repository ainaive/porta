import { getTranslations } from 'next-intl/server'
import type { ReactNode } from 'react'
import { z } from 'zod'
import { Badge } from '@/components/ui/badge'
import { sectionTitleKey } from '@/core/module/derive'
import { Link } from '@/i18n/navigation'
import type { HomeOverview, TranslatedResource } from '@/lib/content'
import { cn } from '@/lib/utils'
import { Kicker } from './primitives'

const DOTS = [
  'oklch(0.75 0.15 155)',
  'oklch(0.7 0.14 200)',
  'oklch(0.72 0.16 55)',
]

function Tile({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        // `min-w-0`: a grid item's min width is its min-content by default, so
        // one long endpoint URL inside would widen the whole track.
        'relative min-w-0 rounded-2xl border bg-gradient-to-b from-white/4 to-white/1 p-7 transition hover:-translate-y-1 hover:border-white/18 sm:p-8',
        className,
      )}
    >
      {children}
    </div>
  )
}

function TileHead({
  index,
  label,
  count,
  title,
  description,
  href,
}: {
  index: string
  label: string
  count?: number
  title: string
  description: string
  // When present the whole tile becomes one click target for that section.
  href?: string
}) {
  return (
    <>
      <Kicker>
        {index} · {label}
        {count === undefined ? null : ` · ${count}`}
      </Kicker>
      <h3 className="mt-3.5 font-display text-[1.375rem] leading-tight font-bold">
        {href ? (
          <Link href={href} className="after:absolute after:inset-0">
            {title}
          </Link>
        ) : (
          title
        )}
      </h3>
      <p className="mt-2.5 max-w-md text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </>
  )
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div className="font-display text-3xl font-extrabold tracking-tight">
        {value}
      </div>
      <div className="mt-1 font-mono text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
        {label}
      </div>
    </div>
  )
}

// The landing reads the one meta field it quotes rather than importing the
// owning module's schema — core must not depend on a module.
const endpointMeta = z.object({
  endpoint: z.string().min(1),
  provider: z.string().optional(),
})

// Picks the first model API resource that actually carries an endpoint, so
// the panel quotes the catalog instead of inventing a plausible-looking one.
function firstEndpoint(items: TranslatedResource[]) {
  for (const item of items) {
    const parsed = endpointMeta.safeParse(item.meta)
    if (parsed.success) {
      return { item, meta: parsed.data }
    }
  }
  return null
}

export async function Bento({ overview }: { overview: HomeOverview }) {
  // `label` is unnamespaced: the tiles quote section titles that now live in
  // their owning modules' bundles. The landing still names specific sections
  // by hand — ADR 0008 holds its copy to shipped capability, so the tiles are
  // deliberate rather than derived.
  const [t, label, content, common] = await Promise.all([
    getTranslations('home'),
    getTranslations(),
    getTranslations('content'),
    getTranslations('common'),
  ])
  const { sections: catalog, tags, chapterCount } = overview
  const endpoint = firstEndpoint(catalog.model_api.items)
  const latestVideo = catalog.video.items[0]
  const fallbackExample = overview.latest.find((item) => item.isFallback)

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-24 sm:py-32">
      <h2 className="font-display text-[clamp(2rem,4vw,2.875rem)] leading-tight font-extrabold tracking-[-0.03em] text-balance">
        {t('bento.title')}
      </h2>
      <p className="mt-3.5 max-w-xl text-base leading-relaxed text-muted-foreground">
        {t('bento.subtitle')}
      </p>

      <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Tile className="lg:col-span-4">
          <TileHead
            index="01"
            label={label(sectionTitleKey('tool'))}
            count={catalog.tool.count}
            title={t('bento.tools.title')}
            description={t('bento.tools.description')}
          />
          {catalog.tool.items.length > 0 ? (
            <div className="mt-6 flex flex-col gap-2">
              {catalog.tool.items.map((tool, index) => (
                <Link
                  key={tool.id}
                  href={`/tools/${tool.slug}`}
                  className="flex items-center gap-3 rounded-lg border bg-white/2 px-3.5 py-2.5 transition-colors hover:border-white/20 hover:bg-white/5"
                >
                  <span
                    aria-hidden
                    className="size-1.75 shrink-0 rounded-full"
                    style={{ background: DOTS[index % DOTS.length] }}
                  />
                  <span className="min-w-0 truncate text-[13px]">
                    {tool.title}
                  </span>
                  {tool.tags[0] ? (
                    <span className="ml-auto shrink-0 font-mono text-[10px] text-muted-foreground/80 uppercase">
                      {tool.tags[0]}
                    </span>
                  ) : null}
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-6 text-sm text-muted-foreground">
              {content('empty')}
            </p>
          )}
        </Tile>

        <Tile className="lg:col-span-2">
          <TileHead
            index="02"
            label={label(sectionTitleKey('model_api'))}
            count={catalog.model_api.count}
            title={t('bento.models.title')}
            description={t('bento.models.description')}
            href="/models"
          />
          {endpoint ? (
            <dl className="mt-5 overflow-hidden rounded-xl border bg-background/70 p-4 font-mono text-[11.5px] leading-loose">
              <div className="flex gap-2">
                <dt className="shrink-0 text-muted-foreground/70">
                  {label('ai-eval.provider')}
                </dt>
                <dd className="min-w-0 truncate text-secondary-foreground">
                  {endpoint.meta.provider ?? endpoint.item.title}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="shrink-0 text-muted-foreground/70">
                  {label('ai-eval.endpoint')}
                </dt>
                {/* Flex rather than an inline caret: inside a truncating box
                    the caret gets pushed past the clip edge. */}
                <dd className="flex min-w-0 items-center gap-1 text-secondary-foreground">
                  <span className="min-w-0 truncate">
                    {endpoint.meta.endpoint}
                  </span>
                  <span
                    aria-hidden
                    className="animate-caret h-3 w-1.5 shrink-0 bg-brand"
                  />
                </dd>
              </div>
            </dl>
          ) : null}
        </Tile>

        <Tile className="lg:col-span-2">
          <TileHead
            index="03"
            label={label(sectionTitleKey('course'))}
            title={t('bento.courses.title')}
            description={t('bento.courses.description')}
            href="/courses"
          />
          <div className="mt-6 flex gap-10">
            <Stat
              value={catalog.course.count}
              label={label(sectionTitleKey('course'))}
            />
            <Stat value={chapterCount} label={label('help.chapters')} />
          </div>
        </Tile>

        <Tile className="lg:col-span-2">
          <TileHead
            index="04"
            label={label(sectionTitleKey('video'))}
            title={t('bento.videos.title')}
            description={t('bento.videos.description')}
            href="/videos"
          />
          <div className="mt-6 flex items-end gap-6">
            <Stat
              value={catalog.video.count}
              label={label(sectionTitleKey('video'))}
            />
            {latestVideo ? (
              <p className="min-w-0 truncate pb-1 text-[13px] text-muted-foreground">
                {latestVideo.title}
              </p>
            ) : null}
          </div>
        </Tile>

        <Tile className="lg:col-span-2">
          <TileHead
            index="05"
            label={t('bento.bilingual.label')}
            title={t('bento.bilingual.title')}
            description={t('bento.bilingual.description')}
          />
          {/* Only shown when the catalog really is holding a resource open in
              the other locale — a badge next to fully translated content
              would be advertising something that isn't happening. */}
          {fallbackExample ? (
            <div className="mt-6 flex items-center gap-3 rounded-lg border bg-white/2 px-3.5 py-2.5">
              <span className="min-w-0 truncate text-[13px] text-muted-foreground">
                {fallbackExample.title}
              </span>
              <Badge variant="outline" className="ml-auto shrink-0 font-normal">
                {common('untranslated')}
              </Badge>
            </div>
          ) : null}
        </Tile>

        <Tile className="md:col-span-2 lg:col-span-6">
          <TileHead
            index="06"
            label={t('bento.search.label')}
            count={tags.length}
            title={t('bento.search.title')}
            description={t('bento.search.description')}
          />
          {tags.length > 0 ? (
            <div className="mt-6 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="font-normal">
                  {tag}
                </Badge>
              ))}
            </div>
          ) : null}
        </Tile>
      </div>
    </section>
  )
}
