import { getTranslations } from 'next-intl/server'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Link } from '@/i18n/navigation'
import { Glow } from './primitives'

export async function Hero({
  signedIn,
  children,
}: {
  signedIn: boolean
  children?: ReactNode
}) {
  const t = await getTranslations('home')

  return (
    <header className="relative px-4 pt-20 text-center sm:pt-28">
      <Glow
        className="-top-70 left-1/2 h-140 w-[56rem] max-w-[130vw] -translate-x-1/2"
        color="oklch(0.62 0.19 25 / 0.22)"
      />
      <Glow
        className="top-155 -right-50 size-160 max-w-[130vw]"
        color="oklch(0.55 0.12 280 / 0.12)"
      />

      <p className="animate-fade-up inline-flex items-center gap-2.5 rounded-full border border-white/12 bg-white/4 px-4 py-1.5 font-mono text-xs tracking-[0.1em] text-secondary-foreground">
        <span
          aria-hidden
          className="size-1.5 rounded-full bg-brand shadow-[0_0_10px] shadow-brand"
        />
        {t('kicker')}
      </p>

      {/* One h1, two lines: the accessible name still reads as one headline. */}
      <h1 className="mx-auto mt-8 max-w-4xl font-display text-[clamp(2.75rem,7vw,5.75rem)] leading-[1.06] font-extrabold tracking-[-0.04em] text-balance">
        <span className="animate-fade-up block [animation-delay:80ms]">
          {t('heroLine1')}
        </span>
        <span className="animate-fade-up block bg-gradient-to-r from-brand via-brand-2 to-brand-3 bg-clip-text text-transparent [animation-delay:160ms]">
          {t('heroLine2')}
        </span>
      </h1>

      <p className="animate-fade-up mx-auto mt-7 max-w-xl text-lg leading-relaxed text-muted-foreground [animation-delay:240ms]">
        {t('heroSub')}
      </p>

      <div className="animate-fade-up mt-10 flex flex-wrap justify-center gap-3.5 [animation-delay:320ms]">
        {signedIn ? (
          <Button asChild size="lg" className="px-7 text-[15px]">
            <Link href="/tools">{t('ctaSecondary')}</Link>
          </Button>
        ) : (
          <>
            <Button asChild size="lg" className="px-7 text-[15px]">
              <Link href="/sign-in">{t('ctaPrimary')}</Link>
            </Button>
            <Button asChild size="lg" variant="secondary" className="px-7">
              <Link href="/tools">{t('ctaSecondary')}</Link>
            </Button>
          </>
        )}
      </div>

      {children}
    </header>
  )
}
