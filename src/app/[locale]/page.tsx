import { Boxes, GraduationCap, PlayCircle, Wrench } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { ResourceCard } from '@/components/resource/card'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { listLatest } from '@/lib/content'

export const dynamic = 'force-dynamic'

const SECTIONS = [
  { href: '/tools', key: 'tools', icon: Wrench },
  { href: '/courses', key: 'courses', icon: GraduationCap },
  { href: '/videos', key: 'videos', icon: PlayCircle },
  { href: '/models', key: 'models', icon: Boxes },
] as const

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: Locale }>
}) {
  const { locale } = await params
  const [t, latest] = await Promise.all([
    getTranslations(),
    listLatest(locale, 6),
  ])

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12">
      <div className="max-w-2xl">
        <h1 className="text-4xl font-semibold tracking-tight text-balance">
          {t('home.title')}
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          {t('home.subtitle')}
        </p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SECTIONS.map((section) => (
          <Link key={section.key} href={section.href} className="group">
            <Card className="h-full transition-colors group-hover:border-foreground/20">
              <CardHeader>
                <section.icon className="size-6 text-muted-foreground" />
                <CardTitle className="mt-2">
                  {t(`sections.${section.key}.title`)}
                </CardTitle>
                <CardDescription>
                  {t(`sections.${section.key}.description`)}
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      {latest.length > 0 ? (
        <>
          <h2 className="mt-14 text-lg font-semibold">
            {t('sections.latest')}
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {latest.map((resource) => (
              <ResourceCard key={resource.id} resource={resource} />
            ))}
          </div>
        </>
      ) : null}
    </main>
  )
}
