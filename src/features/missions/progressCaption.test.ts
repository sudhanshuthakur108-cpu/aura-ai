import { describe, expect, it } from 'vitest'
import { createDemoState, reducer } from '../../state/reducer'
import { demoOutcome } from '../approvals/outcome'
import { progressCaption } from './MissionParts'

const T0 = 1_700_000_000_000

describe('mission progress caption', () => {
  it('matches the local mission state through start, pause and cancel', () => {
    let s = createDemoState(T0)
    const m = () => s.missions.find((x) => x.id === 'm-headphones')!
    expect(progressCaption(m())).toBe('Not started · 6 steps planned')
    s = reducer(s, { type: 'mission/start', id: 'm-headphones', now: T0 })
    expect(progressCaption(m())).toBe('Step 1 of 6: Scan recent reviews')
    s = reducer(s, { type: 'mission/pause', id: 'm-headphones', now: T0 })
    expect(progressCaption(m())).toBe('Paused at step 1: Scan recent reviews')
    s = reducer(s, { type: 'mission/cancel', id: 'm-headphones', now: T0 })
    expect(progressCaption(m())).toBe('Stopped after 0 of 6 steps')
  })

  it('describes a blocked mission as waiting on the user', () => {
    const s = createDemoState(T0)
    expect(progressCaption(s.missions.find((x) => x.id === 'm-lease')!)).toBe('Waiting on you at step 2: Review your current lease')
  })
})

describe('demo approval wording', () => {
  it('never claims an external action happened', () => {
    for (const p of createDemoState(T0).proposals) {
      const text = demoOutcome(p)
      expect(text).toMatch(/^Demo only — (no|nothing)/)
      // Every mention of an action is negated; no affirmative success wording.
      expect(text).not.toMatch(/\b(successfully|completed|confirmed|is on its way)\b/i)
    }
  })
})
