import type { Metadata } from 'next'
import {
  Geist,
  Geist_Mono,
  JetBrains_Mono,
  Noto_Sans_SC,
  Sora,
} from 'next/font/google'
import { notFound } from 'next/navigation'
import { hasLocale, NextIntlClientProvider } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import { ChromeShell } from '@/components/site/chrome-shell'
import { SiteFooter } from '@/components/site/footer'
import { SiteHeader } from '@/components/site/header'
import { MAIN_CONTENT_ID, SkipLink } from '@/components/site/skip-link'
import { Toaster } from '@/components/ui/sonner'
import { routing } from '@/i18n/routing'
import '../globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

// Display face for the landing page. Latin-only upstream, so Chinese
// headings fall through to Noto Sans SC (see --font-display-stack).
const sora = Sora({
  variable: '--font-sora',
  subsets: ['latin'],
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
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
      className={`${geistSans.variable} ${geistMono.variable} ${sora.variable} ${jetbrainsMono.variable} ${notoSansSC.variable} h-full antialiased`}
    >
      <body className="flex min-h-svh flex-col">
        <NextIntlClientProvider>
          <ChromeShell>
            <SkipLink />
            <SiteHeader />
            {/* The app's one `main` landmark. Pages render their own boxes
                inside it rather than a `main` each: nesting the landmark
                would break the skip link's target and give assistive tech
                two answers to "where does the content start?".

                `tabIndex={-1}` so following the skip link actually moves
                focus here and not just the scroll position; `outline-none`
                because a ring around the entire page is not useful feedback
                — the skip link itself is what shows focus. */}
            <main
              id={MAIN_CONTENT_ID}
              tabIndex={-1}
              className="flex flex-1 flex-col focus:outline-none"
            >
              {children}
            </main>
            <SiteFooter />
          </ChromeShell>
          <Toaster />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
