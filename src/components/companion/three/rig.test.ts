import { describe, expect, it } from 'vitest'
import type { CompanionMood } from '../types'
import { blinkAmount, clonePose, dampPose, targetPose } from './rig'

const MOODS: CompanionMood[] = ['idle', 'listening', 'thinking', 'speaking', 'celebrating']

describe('3D companion rig', () => {
  it('gives each mood a distinct pose', () => {
    const poses = MOODS.map((m) => JSON.stringify(targetPose(m, 0, false)))
    expect(new Set(poses).size).toBe(MOODS.length)
  })

  it('only opens the mouth for speaking and only shows happy eyes when celebrating', () => {
    for (const m of MOODS) {
      const p = targetPose(m, 1.3, true)
      expect(p.talk > 0).toBe(m === 'speaking')
      expect(p.happy).toBe(m === 'celebrating' ? 1 : 0)
      expect(p.think).toBe(m === 'thinking' ? 1 : 0)
    }
  })

  it('is completely still when motion is off (reduced motion)', () => {
    for (const m of MOODS) expect(targetPose(m, 0.4, false)).toEqual(targetPose(m, 7.9, false))
  })

  it('moves over time when motion is on', () => {
    expect(targetPose('idle', 0.4, true)).not.toEqual(targetPose('idle', 1.9, true))
  })

  it('eases smoothly toward a new state instead of jumping', () => {
    const current = clonePose(targetPose('idle', 0, false))
    const target = targetPose('celebrating', 0, false)
    dampPose(current, target, 1 / 60)
    expect(current.happy).toBeGreaterThan(0)
    expect(current.happy).toBeLessThan(0.5)
    for (let i = 0; i < 240; i++) dampPose(current, target, 1 / 60)
    expect(current.happy).toBeCloseTo(1, 3)
    expect(current.rightHand[1]).toBeCloseTo(target.rightHand[1], 3)
  })

  it('blinks briefly and stays open otherwise', () => {
    expect(blinkAmount(-1)).toBe(1)
    expect(blinkAmount(0.07)).toBeLessThan(0.2)
    expect(blinkAmount(0.5)).toBe(1)
  })
})
