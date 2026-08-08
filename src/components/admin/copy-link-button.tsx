'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

// navigator.clipboard is undefined outside a secure context — which the
// self-hosted target over plain HTTP is — so the modern API is tried first
// and a hidden-textarea + execCommand path covers the insecure case. Only a
// genuine double failure surfaces a toast.
async function writeToClipboard(text: string): Promise<boolean> {
  try {
    if (window.isSecureContext && navigator.clipboard) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // fall through to the legacy path
  }
  try {
    const area = document.createElement('textarea')
    area.value = text
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(area)
    return ok
  } catch {
    return false
  }
}

export function CopyLinkButton({ token }: { token: string }) {
  const t = useTranslations('admin')
  const locale = useLocale()
  const [copied, setCopied] = useState(false)

  async function copy() {
    const url = `${window.location.origin}/${locale}/sign-up?token=${token}`
    if (await writeToClipboard(url)) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } else {
      toast.error(t('copyFailed'))
    }
  }

  return (
    <Button type="button" size="sm" variant="outline" onClick={copy}>
      {copied ? t('copied') : t('copyLink')}
    </Button>
  )
}
