import {
  afterEach,
  beforeEach,
  describe,
  expect,
  mock,
  spyOn,
  test,
} from 'bun:test'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { toast } from 'sonner'
import { setupHappyDom } from '../../../tests/happydom'
import { CopyLinkButton } from './copy-link-button'

setupHappyDom()

const messages = {
  admin: {
    copyLink: 'Copy link',
    copied: 'Copied',
    copyFailed: 'Copy failed',
    manualInviteUrl: 'Invitation link',
  },
}

// Snapshot the globals this test mutates so each run starts clean — otherwise
// the toast spy's call count and the forced insecure context leak into later
// runs (order-dependent failures under --rerun-each). Captured in beforeEach,
// not at module load, because the DOM only exists once setupHappyDom's beforeAll
// has run.
let originalIsSecureContext: PropertyDescriptor | undefined
let originalExecCommand: typeof document.execCommand

beforeEach(() => {
  originalIsSecureContext = Object.getOwnPropertyDescriptor(
    window,
    'isSecureContext',
  )
  originalExecCommand = document.execCommand
})

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

    // render-returned queries (not the module-level `screen`, which binds to
    // document.body at import — before the self-imported DOM exists).
    const { getByRole, findByLabelText } = renderButton()
    fireEvent.click(getByRole('button', { name: 'Copy link' }))

    // The link is revealed in a labelled input the admin can select by hand.
    // Assert the whole URL, origin included — happy-dom is registered with a
    // concrete origin so this isn't the "null/..." a substring check would miss.
    const input = (await findByLabelText('Invitation link')) as HTMLInputElement
    expect(input.value).toBe('http://localhost:3000/en/sign-up?token=tok123')
    expect(toastError).toHaveBeenCalledTimes(1)
  })
})
