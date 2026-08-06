import { getTranslations } from 'next-intl/server'

export default async function HomePage() {
  const t = await getTranslations('home')

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center gap-4 px-4 py-16">
      <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-balance">
        {t('title')}
      </h1>
      <p className="max-w-xl text-lg text-muted-foreground">{t('subtitle')}</p>
    </main>
  )
}
