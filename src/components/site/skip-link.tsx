import { getTranslations } from 'next-intl/server'

/** The single main landmark, opened by the root layout so no page has to
 *  remember to carry it — and so the skip link below always has a target. */
export const MAIN_CONTENT_ID = 'main-content'

// The first focusable element on every page. Below it sit the phone menu, the
// brand link, every section link, search, the locale toggle and the user menu:
// without this a keyboard or screen-reader user tabs through the whole of the
// chrome again after every navigation.
//
// A plain <a>, not the locale-aware Link: this is a fragment on the current
// page, and prefixing it with a locale would navigate instead of skipping.
export async function SkipLink() {
  const t = await getTranslations('common')
  return (
    <a
      href={`#${MAIN_CONTENT_ID}`}
      className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:ring-2 focus:ring-ring focus:shadow-lg"
    >
      {t('skipToContent')}
    </a>
  )
}
