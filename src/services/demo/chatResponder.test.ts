import { describe, expect, it } from 'vitest'
import { createDemoState, defaultSettings } from '../../state/reducer'
import type { Settings } from '../../types'
import type { ChatRequest } from '../types'
import { buildReply, inferCategory } from './chatResponder'

function request(text: string, settings: Partial<Settings> = {}): ChatRequest {
  const s = createDemoState(0)
  return {
    text,
    threadId: 't-test',
    attempt: 1,
    history: [],
    context: { settings: { ...defaultSettings, ...settings }, memories: s.memories, missions: s.missions, proposals: s.proposals },
  }
}

describe('demo chat responder', () => {
  it('turns "remember that…" into a memory to save', () => {
    const reply = buildReply(request('Remember that I prefer aisle seats on trains'))
    expect(reply.memoryToSave).toMatchObject({ category: 'preference', title: 'I prefer aisle seats on trains' })
  })

  it('does not save memories when capture is off', () => {
    const reply = buildReply(request('Remember that my sister is called Ana', { memoryCapture: false }))
    expect(reply.memoryToSave).toBeUndefined()
    expect(reply.text).toMatch(/turned off/i)
  })

  it('answers "what do you remember" without saving a new memory', () => {
    const reply = buildReply(request('What do you remember about me?'))
    expect(reply.memoryToSave).toBeUndefined()
    expect(reply.cards?.[0]).toMatchObject({ kind: 'memory-list' })
  })

  it('is honest about being scripted for unknown prompts', () => {
    const reply = buildReply(request('Explain quantum chromodynamics'))
    expect(reply.text).toMatch(/scripted demo responder/i)
  })

  it('attaches the mission card for headphone questions', () => {
    expect(buildReply(request('How are the headphones going?')).cards?.[0]).toEqual({ kind: 'mission', missionId: 'm-headphones' })
  })

  it('infers memory categories', () => {
    expect(inferCategory('I want to learn Portuguese')).toBe('goal')
    expect(inferCategory('Mum’s birthday is 2 June')).toBe('fact')
    expect(inferCategory('I work night shifts')).toBe('context')
  })
})
