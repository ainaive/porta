import { afterEach, describe, expect, jest, mock, test } from 'bun:test'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ConfirmButton } from './confirm-button'

afterEach(() => {
  cleanup()
  jest.useRealTimers()
})

describe('ConfirmButton', () => {
  test('requires two clicks: the first arms, the second runs the action once', async () => {
    const action = mock(() => Promise.resolve())
    render(
      <ConfirmButton action={action} confirmLabel="Confirm delete">
        Delete
      </ConfirmButton>,
    )

    const button = screen.getByRole('button')
    expect(button.textContent).toBe('Delete')

    // First click arms only — the action must not fire.
    fireEvent.click(button)
    expect(button.textContent).toBe('Confirm delete')
    expect(action).not.toHaveBeenCalled()

    // Second click within the window runs it, exactly once (the transition
    // resolves inside act so the pending state settles cleanly).
    await act(async () => {
      fireEvent.click(button)
    })
    expect(action).toHaveBeenCalledTimes(1)
  })

  test('auto-disarms to the idle label after the timeout, without acting', () => {
    jest.useFakeTimers()
    const action = mock(() => Promise.resolve())
    render(
      <ConfirmButton action={action} confirmLabel="Confirm delete">
        Delete
      </ConfirmButton>,
    )
    const button = screen.getByRole('button')

    fireEvent.click(button)
    expect(button.textContent).toBe('Confirm delete')

    act(() => {
      jest.advanceTimersByTime(4100)
    })
    expect(button.textContent).toBe('Delete')
    expect(action).not.toHaveBeenCalled()
  })
})
