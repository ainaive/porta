'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'

export function CopyLinkButton({ token }: { token: string }) {
  const t = useTranslations('admin')
  const locale = useLocale()
  const [copied, setCopied] = useState(false)

  async function copy() {
    const url = `${window.location.origin}/${locale}/sign-up?token=${token}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button type="button" size="sm" variant="outline" onClick={copy}>
      {copied ? t('copied') : t('copyLink')}
    </Button>
  )
}
