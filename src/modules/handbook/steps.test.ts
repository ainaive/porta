import { describe, expect, test } from 'bun:test'
import type { StepRow, StepTranslationRow } from './schema'
import { groupSteps } from './steps'

// The locale-fallback policy itself is core (src/core/content/fallback.ts);
// what is tested here is applying it to this module's step rows.

describe('groupSteps', () => {
  function makeStep(id: string, position: number): StepRow {
    return { id, trackId: 'c1', position, createdAt: new Date('2026-01-01') }
  }

  function makeStepTranslation(
    stepId: string,
    locale: 'en' | 'zh',
  ): StepTranslationRow {
    return {
      id: `${stepId}-${locale}`,
      stepId,
      locale,
      title: `${stepId} ${locale}`,
      body: '',
    }
  }

  test('sorts by position and applies fallback per step', () => {
    const rows = [
      {
        step: makeStep('ch2', 2),
        translation: makeStepTranslation('ch2', 'en'),
      },
      {
        step: makeStep('ch1', 1),
        translation: makeStepTranslation('ch1', 'zh'),
      },
    ]
    const grouped = groupSteps(rows, 'en')
    expect(grouped.map((c) => c.position)).toEqual([1, 2])
    expect(grouped[0].isFallback).toBe(true)
    expect(grouped[1].isFallback).toBe(false)
  })

  test('drops steps without translations', () => {
    const rows = [{ step: makeStep('ch1', 1), translation: null }]
    expect(groupSteps(rows, 'en')).toHaveLength(0)
  })
})
