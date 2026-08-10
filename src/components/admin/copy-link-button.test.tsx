import { afterEach, describe, expect, mock, spyOn, test } from 'bun:test'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { toast } from 'sonner'
import { CopyLinkButton } from './copy-link-button'

const messages = {
  admin: {
    copyLink: 'Copy link',
    copied: 'Copied',
    copyFailed: 'Copy failed',
    manualInviteUrl: 'Invitation link',
  },
}

// Snapshot the globals this suite mutates so each test starts clean —
// otherwise the toast spy's call count and the forced insecure context leak
// into later runs (order-dependent failures under --rerun-each).
const originalIsSecureContext = Object.getOwnPropertyDescriptor(
  window,
  'isSecureContext',
)
const originalExecCommand = document.execCommand

afterEach(() => {
  cleanup()
  mock.restore()
  document.execCommand = originalExecCommand
  if (originalIsSecureContext) {
    Object.defineProperty(window, 'isSecureContext', originalIsSecureContext)
  } else {
    Reflect.deleteProperty(window, 'isSecureContext')
  }
})

function renderButton() {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <CopyLinkButton token="tok123" />
    </NextIntlClientProvider>,
  )
}

describe('CopyLinkButton', () => {
  test('reveals a selectable URL and toasts when both copy methods fail', async () => {
    // Force the insecure-context path (no navigator.clipboard) and make the
    // execCommand fallback fail too — the double-failure recovery branch.
    Object.defineProperty(window, 'isSecureContext', {
      value: false,
      configurable: true,
    })
    document.execCommand = mock(() => false)
    const toastError = spyOn(toast, 'error').mockImplementation(() => 'id')

    renderButton()
    fireEvent.click(screen.getByRole('button', { name: 'Copy link' }))

    // The link is revealed in a labelled input the admin can select by hand.
    const input = (await screen.findByLabelText(
      'Invitation link',
    )) as HTMLInputElement
    expect(input.value).toContain('/en/sign-up?token=tok123')
    expect(toastError).toHaveBeenCalledTimes(1)
  })
})
