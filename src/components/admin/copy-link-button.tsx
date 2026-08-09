'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

// navigator.clipboard is undefined outside a secure context — which the
// self-hosted target over plain HTTP is — so the modern API is tried first
// and a hidden-textarea + execCommand path covers the insecure case. Only a
// genuine double failure falls through to the caller.
async function writeToClipboard(text: string): Promise<boolean> {
  try {
    if (window.isSecureContext && navigator.clipboard) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // fall through to the legacy path
  }
  let area: HTMLTextAreaElement | null = null
  try {
    area = document.createElement('textarea')
    area.value = text
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    return document.execCommand('copy')
  } catch {
    return false
  } finally {
    // finally, so a throw in select()/execCommand can't leak the node.
    area?.remove()
  }
}

export function CopyLinkButton({ token }: { token: string }) {
  const t = useTranslations('admin')
  const locale = useLocale()
  const [copied, setCopied] = useState(false)
  // Set only when both copy paths fail, so the admin can still select the
  // link by hand instead of hitting a dead end.
  const [manualUrl, setManualUrl] = useState<string | null>(null)

  async function copy() {
    const url = `${window.location.origin}/${locale}/sign-up?token=${token}`
    if (await writeToClipboard(url)) {
      setManualUrl(null)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } else {
      // Clear any lingering success state so the button doesn't read
      // "Copied" while the toast and revealed URL report failure.
      setCopied(false)
      setManualUrl(url)
      toast.error(t('copyFailed'))
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button type="button" size="sm" variant="outline" onClick={copy}>
        {copied ? t('copied') : t('copyLink')}
      </Button>
      {manualUrl ? (
        <Input
          readOnly
          value={manualUrl}
          aria-label={t('manualInviteUrl')}
          className="h-8 w-64 font-mono text-xs"
          onFocus={(e) => e.currentTarget.select()}
        />
      ) : null}
    </div>
  )
}
