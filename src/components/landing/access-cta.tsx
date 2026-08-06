import { getTranslations } from 'next-intl/server'
import { Button } from '@/components/ui/button'
import { Link } from '@/i18n/navigation'
import { Glow, Kicker } from './primitives'

// The design closed on an SSO pitch. There is no SSO here: accounts come from
// a single-use invite link (ADR 0002), and the public tier is the landing page
// plus the section listings. This section says that instead.
export async function AccessCta({ signedIn }: { signedIn: boolean }) {
  const t = await getTranslations('home')

  return (
    <section className="relative overflow-hidden border-t px-4 py-24 text-center sm:py-28">
      <Glow
        className="-bottom-55 left-1/2 h-100 w-[50rem] max-w-[130vw] -translate-x-1/2"
        color="oklch(0.62 0.19 25 / 0.18)"
      />
      <Kicker className="tracking-[0.14em]">{t('access.kicker')}</Kicker>
      <h2 className="mx-auto mt-5 max-w-2xl font-display text-[clamp(2.125rem,4.5vw,3.375rem)] leading-tight font-extrabold tracking-[-0.03em] text-balance">
        {t('access.title')}
      </h2>
      <p className="mx-auto mt-4.5 max-w-lg text-base leading-relaxed text-muted-foreground">
        {t('access.description')}
      </p>
      <Button asChild size="lg" className="mt-9 px-8 text-base">
        <Link href={signedIn ? '/tools' : '/sign-in'}>
          {signedIn ? t('ctaSecondary') : t('ctaPrimary')}
        </Link>
      </Button>
    </section>
  )
}
