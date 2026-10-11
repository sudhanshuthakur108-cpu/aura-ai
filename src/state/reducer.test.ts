import { describe, expect, it } from 'vitest'
import { createDemoState, reducer, type AppState } from './reducer'

const T0 = 1_700_000_000_000

function runMission(state: AppState, _missionId: string, ms: number, step = 250): AppState {
  let s = state
  for (let t = step; t <= ms; t += step) s = reducer(s, { type: 'mission/tick', dt: step, now: T0 + t })
  return s
}

const mission = (s: AppState, id: string) => s.missions.find((m) => m.id === id)!

describe('mission engine', () => {
  it('runs the headphones mission until it blocks on a purchase approval', () => {
    let s = createDemoState(T0)
    expect(s.proposals.some((p) => p.id === 'p-headphones')).toBe(false)

    s = reducer(s, { type: 'mission/start', id: 'm-headphones', now: T0 })
    expect(mission(s, 'm-headphones').status).toBe('running')

    s = runMission(s, 'm-headphones', 30_000)
    const m = mission(s, 'm-headphones')
    expect(m.status).toBe('blocked')
    expect(m.steps.find((x) => x.id === 'hp-5')?.status).toBe('blocked')
    expect(m.steps.slice(0, 4).every((x) => x.status === 'completed')).toBe(true)
    expect(s.proposals.find((p) => p.id === 'p-headphones')?.status).toBe('pending')
  })

  it('continues and completes after the proposal is decided', () => {
    let s = createDemoState(T0)
    s = reducer(s, { type: 'mission/start', id: 'm-headphones', now: T0 })
    s = runMission(s, 'm-headphones', 30_000)
    s = reducer(s, { type: 'proposal/decide', id: 'p-headphones', decision: 'rejected', now: T0 + 31_000 })
    expect(mission(s, 'm-headphones').steps.find((x) => x.id === 'hp-5')?.status).toBe('cancelled')
    s = runMission(s, 'm-headphones', 10_000)
    expect(mission(s, 'm-headphones').status).toBe('completed')
  })

  it('does not advance while paused', () => {
    let s = createDemoState(T0)
    s = reducer(s, { type: 'mission/start', id: 'm-headphones', now: T0 })
    s = reducer(s, { type: 'mission/pause', id: 'm-headphones', now: T0 })
    const before = mission(s, 'm-headphones')
    s = runMission(s, 'm-headphones', 10_000)
    expect(mission(s, 'm-headphones').steps).toEqual(before.steps)
  })

  it('withdraws a pending proposal when its mission is cancelled', () => {
    let s = createDemoState(T0)
    s = reducer(s, { type: 'mission/start', id: 'm-headphones', now: T0 })
    s = runMission(s, 'm-headphones', 30_000)
    s = reducer(s, { type: 'mission/cancel', id: 'm-headphones', now: T0 + 40_000 })
    expect(mission(s, 'm-headphones').status).toBe('cancelled')
    expect(s.proposals.find((p) => p.id === 'p-headphones')?.status).toBe('withdrawn')
    // A withdrawn proposal can no longer be approved.
    const after = reducer(s, { type: 'proposal/decide', id: 'p-headphones', decision: 'approved', now: T0 + 41_000 })
    expect(after.proposals.find((p) => p.id === 'p-headphones')?.status).toBe('withdrawn')
  })

  it('skips a blocked input step and resumes the plan', () => {
    let s = createDemoState(T0)
    s = reducer(s, { type: 'mission/skip-step', id: 'm-lease', stepId: 'ls-2', now: T0 })
    const m = mission(s, 'm-lease')
    expect(m.steps.find((x) => x.id === 'ls-2')?.status).toBe('cancelled')
    expect(m.status).toBe('running')
    expect(m.steps.find((x) => x.id === 'ls-3')?.status).toBe('running')
  })
})

describe('proposals', () => {
  it('records approval locally and only edits pending proposals', () => {
    let s = createDemoState(T0)
    s = reducer(s, { type: 'proposal/update', id: 'p-email-sam', patch: { subject: 'New subject' } })
    expect(s.proposals.find((p) => p.id === 'p-email-sam')).toMatchObject({ subject: 'New subject', edited: true })
    s = reducer(s, { type: 'proposal/decide', id: 'p-email-sam', decision: 'approved', now: T0 })
    expect(s.proposals.find((p) => p.id === 'p-email-sam')?.status).toBe('approved')
    s = reducer(s, { type: 'proposal/update', id: 'p-email-sam', patch: { subject: 'Too late' } })
    expect(s.proposals.find((p) => p.id === 'p-email-sam')).toMatchObject({ subject: 'New subject' })
  })
})

describe('memory', () => {
  it('updates and deletes memories immediately', () => {
    let s = createDemoState(T0)
    s = reducer(s, { type: 'memory/update', id: 'mem-veg', patch: { title: 'Mostly vegetarian' }, now: T0 + 5 })
    expect(s.memories.find((m) => m.id === 'mem-veg')).toMatchObject({ title: 'Mostly vegetarian', updatedAt: T0 + 5 })
    s = reducer(s, { type: 'memory/delete', id: 'mem-veg' })
    expect(s.memories.some((m) => m.id === 'mem-veg')).toBe(false)
  })
})
