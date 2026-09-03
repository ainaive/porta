import type { Metadata } from 'next'
import { Libre_Franklin, Noto_Sans_SC, Roboto_Mono } from 'next/font/google'
import { notFound } from 'next/navigation'
import { hasLocale, NextIntlClientProvider } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import { SiteFooter } from '@/components/site/footer'
import { SiteHeader } from '@/components/site/header'
import { Toaster } from '@/components/ui/sonner'
import { routing } from '@/i18n/routing'
import '../globals.css'

// Two families carry the whole design. There is no third: the design sets
// headings in the sans, so the display token points at it too.
const libreFranklin = Libre_Franklin({
  variable: '--font-libre-franklin',
  subsets: ['latin'],
  display: 'swap',
})

// Load-bearing, not decoration: kickers, section headings, stat values, table
// column heads, install commands and every micro-label are mono.
const robotoMono = Roboto_Mono({
  variable: '--font-roboto-mono',
  subsets: ['latin'],
  display: 'swap',
})

// Google publishes no named CJK subset for this family — the Han glyphs
// arrive as ~100 unicode-range chunks — so `subsets` has nothing useful to
// name and preloading would pull megabytes for a page that may show no
// Chinese at all. `preload: false` lets the browser fetch only the ranges a
// page actually renders.
const notoSansSC = Noto_Sans_SC({
  variable: '--font-noto-sans-sc',
  display: 'swap',
  preload: false,
})

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const [t, common] = await Promise.all([
    getTranslations({ locale, namespace: 'home' }),
    getTranslations({ locale, namespace: 'common' }),
  ])
  const appName = common('appName')
  return {
    title: { default: appName, template: `%s · ${appName}` },
    description: t('subtitle'),
  }
}

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<'/[locale]'>) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  return (
    <html
      lang={locale}
      className={`${libreFranklin.variable} ${robotoMono.variable} ${notoSansSC.variable} h-full antialiased`}
    >
      <body className="flex min-h-svh flex-col">
        <NextIntlClientProvider>
          <SiteHeader />
          <div className="flex flex-1 flex-col">{children}</div>
          <SiteFooter />
          <Toaster />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
