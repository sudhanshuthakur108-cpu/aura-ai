import type { CompanionMood, CompanionStyle } from '../../types'

export type { CompanionMood, CompanionStyle }

/** `hero` is the large stage that uses the real-time 3D renderer when WebGL is available. */
export type CompanionSize = 'sm' | 'md' | 'lg' | 'hero'

export type CompanionRendererKind = 'loading-3d' | '3d' | '2d' | '2d-fallback'

/** Props shared by the character renderers (2D avatar and 3D scene). */
export interface CompanionRendererProps {
  mood: CompanionMood
  appearance: CompanionStyle
  size: CompanionSize
  halo: boolean
  /** False when the renderer should hold still (offscreen, hidden tab, reduced motion, inactive preview). */
  active: boolean
}

export const moodLabels: Record<CompanionMood, string> = {
  idle: 'Here with you',
  listening: 'Listening',
  thinking: 'Thinking',
  speaking: 'Speaking',
  celebrating: 'Celebrating',
}
