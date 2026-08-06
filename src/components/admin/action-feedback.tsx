'use client'

import { useTranslations } from 'next-intl'
import type { ActionState } from '@/lib/admin-actions'

export function ActionFeedback({ state }: { state: ActionState }) {
  const t = useTranslations('admin')
  if (state.error) {
    return (
      <p className="text-sm text-destructive">
        {t(`errors.${state.error}`, { detail: state.detail ?? '' })}
      </p>
    )
  }
  if (state.ok) {
    return <p className="text-sm text-muted-foreground">{t('saved')}</p>
  }
  return null
}
