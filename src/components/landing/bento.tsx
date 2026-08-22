import { getTranslations } from 'next-intl/server'
import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import type { HomeOverview, TranslatedResource } from '@/core/content/queries'
import {
  messageKey,
  metaFieldLabelKey,
  sectionTitleKey,
} from '@/core/module/derive'
import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'
import { Kicker } from './primitives'
import { packTiles, quoteFields, type SectionTile, sectionTiles } from './tiles'

const DOTS = [
  'oklch(0.75 0.15 155)',
  'oklch(0.7 0.14 200)',
  'oklch(0.72 0.16 55)',
]

// Static class strings, one per width: Tailwind scans source text, so a
// computed `lg:col-span-${n}` would never be generated. Six is the full row
// and so also spans both columns of the md layout.
const SPAN_CLASS: Record<number, string> = {
  1: 'lg:col-span-1',
  2: 'lg:col-span-2',
  3: 'lg:col-span-3',
  4: 'lg:col-span-4',
  5: 'lg:col-span-5',
  6: 'md:col-span-2 lg:col-span-6',
}

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
  // Never pass it for a tile whose body has its own links: the overlay is a
  // positioned pseudo-element and paints above static in-flow anchors, so it
  // would swallow every click meant for them.
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

type CoreTileId = 'bilingual' | 'search'

type BentoTile =
  | ({ variant: 'section' } & SectionTile)
  | { variant: 'core'; id: CoreTileId; span: number }

export async function Bento({ overview }: { overview: HomeOverview }) {
  // `label` is unnamespaced: every tile quotes strings that live in the
  // module owning the section, under that module's own namespace.
  const [t, label, common] = await Promise.all([
    getTranslations('home'),
    getTranslations(),
    getTranslations('common'),
  ])
  const { sections: catalog, tags } = overview
  const fallbackExample = overview.latest.find((item) => item.isFallback)

  // The whole grid, derived: every section that declared a tile and has
  // something published, in registry order, then core's own two tiles. A new
  // module appears here by registering — there is no list to extend.
  const tiles: BentoTile[] = [
    ...sectionTiles((key) => catalog[key]?.count ?? 0).map(
      (tile): BentoTile => ({ variant: 'section', ...tile }),
    ),
    // Only shown when the catalog really is holding a resource open in the
    // other locale — a badge next to fully translated content would be
    // advertising something that isn't happening.
    ...(fallbackExample
      ? [{ variant: 'core', id: 'bilingual', span: 2 } as const]
      : []),
    { variant: 'core', id: 'search', span: 6 },
  ]

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-24 sm:py-32">
      <h2 className="font-display text-[clamp(2rem,4vw,2.875rem)] leading-tight font-extrabold tracking-[-0.03em] text-balance">
        {t('bento.title')}
      </h2>
      <p className="mt-3.5 max-w-xl text-base leading-relaxed text-muted-foreground">
        {t('bento.subtitle')}
      </p>

      <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        {packTiles(tiles).map((entry) => {
          if (entry.variant === 'core') {
            return (
              <Tile key={entry.id} className={SPAN_CLASS[entry.span]}>
                {entry.id === 'bilingual' ? (
                  <>
                    <TileHead
                      index={entry.index}
                      label={t('bento.bilingual.label')}
                      title={t('bento.bilingual.title')}
                      description={t('bento.bilingual.description')}
                    />
                    {fallbackExample ? (
                      <div className="mt-6 flex items-center gap-3 rounded-lg border bg-white/2 px-3.5 py-2.5">
                        <span className="min-w-0 truncate text-[13px] text-muted-foreground">
                          {fallbackExample.title}
                        </span>
                        <Badge
                          variant="outline"
                          className="ml-auto shrink-0 font-normal"
                        >
                          {common('untranslated')}
                        </Badge>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <>
                    <TileHead
                      index={entry.index}
                      label={t('bento.search.label')}
                      count={tags.length}
                      title={t('bento.search.title')}
                      description={t('bento.search.description')}
                      // Safe as a whole-tile link: the body is badges, not
                      // anchors, so there is nothing for the overlay to
                      // swallow (unlike a `list` tile).
                      href="/search"
                    />
                    {tags.length > 0 ? (
                      <div className="mt-6 flex flex-wrap gap-2">
                        {tags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="font-normal"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </>
                )}
              </Tile>
            )
          }

          const { section, tile } = entry
          const { count, items } = catalog[section.key]
          const newest = items[0]

          return (
            <Tile key={section.key} className={SPAN_CLASS[entry.span]}>
              <TileHead
                index={entry.index}
                label={label(sectionTitleKey(section.key))}
                // A `stat` tile puts the number in its body, so repeating it
                // in the kicker would say the same thing twice.
                count={tile.kind === 'stat' ? undefined : count}
                title={label(messageKey(section.moduleId, tile.titleKey))}
                description={label(
                  messageKey(section.moduleId, tile.descriptionKey),
                )}
                // A list tile links each resource individually; see TileHead.
                href={tile.kind === 'list' ? undefined : section.path}
              />
              <TileBody
                section={section}
                tile={tile}
                count={count}
                items={items}
                newest={newest}
                sectionLabel={label(sectionTitleKey(section.key))}
                fieldLabel={(name) => {
                  const field = section.metaFields.find((f) => f.name === name)
                  return field ? label(metaFieldLabelKey(section, field)) : name
                }}
              />
            </Tile>
          )
        })}
      </div>
    </section>
  )
}

function TileBody({
  section,
  tile,
  count,
  items,
  newest,
  sectionLabel,
  fieldLabel,
}: {
  section: SectionTile['section']
  tile: SectionTile['tile']
  count: number
  items: TranslatedResource[]
  newest: TranslatedResource | undefined
  sectionLabel: string
  fieldLabel: (name: string) => string
}) {
  if (tile.kind === 'list') {
    return (
      <div className="mt-6 flex flex-col gap-2">
        {items.map((item, index) => (
          <Link
            key={item.id}
            href={`${section.path}/${item.slug}`}
            className="flex items-center gap-3 rounded-lg border bg-white/2 px-3.5 py-2.5 transition-colors hover:border-white/20 hover:bg-white/5"
          >
            <span
              aria-hidden
              className="size-1.75 shrink-0 rounded-full"
              style={{ background: DOTS[index % DOTS.length] }}
            />
            <span className="min-w-0 truncate text-[13px]">{item.title}</span>
            {item.tags[0] ? (
              <span className="ml-auto shrink-0 font-mono text-[10px] text-muted-foreground/80 uppercase">
                {item.tags[0]}
              </span>
            ) : null}
          </Link>
        ))}
      </div>
    )
  }

  if (tile.kind === 'stat') {
    return (
      <div className="mt-6 flex items-end gap-6">
        <Stat value={count} label={sectionLabel} />
        {newest ? (
          <p className="min-w-0 truncate pb-1 text-[13px] text-muted-foreground">
            {newest.title}
          </p>
        ) : null}
      </div>
    )
  }

  // `fields`: quote the newest resource that carries all of them, so the panel
  // shows the real catalog rather than a plausible-looking invention.
  const quoted = quoteFields(items, tile.fields ?? [])
  if (!quoted) return null
  const names = tile.fields ?? []

  return (
    <dl className="mt-5 overflow-hidden rounded-xl border bg-background/70 p-4 font-mono text-[11.5px] leading-loose">
      {names.map((name, index) => (
        <div key={name} className="flex gap-2">
          <dt className="shrink-0 text-muted-foreground/70">
            {fieldLabel(name)}
          </dt>
          {/* Flex rather than an inline caret: inside a truncating box the
              caret gets pushed past the clip edge. */}
          <dd className="flex min-w-0 items-center gap-1 text-secondary-foreground">
            <span className="min-w-0 truncate">{quoted.values[name]}</span>
            {index === names.length - 1 ? (
              <span
                aria-hidden
                className="animate-caret h-3 w-1.5 shrink-0 bg-brand"
              />
            ) : null}
          </dd>
        </div>
      ))}
    </dl>
  )
}
