import type { CompanionStyle } from '../types'

/** Material colours per character style. Matches the 2D avatar palettes. */
export interface Palette {
  body: string
  hand: string
  sheen: string
  pod: string
  visor: string
  eye: string
  cheek: string
  glow: string
  rim: string
}

export const palettes: Record<CompanionStyle, Palette> = {
  lumen: {
    body: '#a891f8',
    hand: '#9a80f2',
    sheen: '#f3eeff',
    pod: '#5b3fc0',
    visor: '#0f0820',
    eye: '#f1ecff',
    cheek: '#f4a9d4',
    glow: '#a78bfa',
    rim: '#8b5cf6',
  },
  ember: {
    body: '#ee9bb1',
    hand: '#e2869f',
    sheen: '#fff0ea',
    pod: '#9a3f69',
    visor: '#1a0918',
    eye: '#fff1ec',
    cheek: '#ffb48f',
    glow: '#f79fc0',
    rim: '#ec6fa4',
  },
  tide: {
    body: '#91a9f8',
    hand: '#7f97ef',
    sheen: '#eaf2ff',
    pod: '#3348b0',
    visor: '#090d28',
    eye: '#eaf3ff',
    cheek: '#bba9ff',
    glow: '#93b4ff',
    rim: '#6d8dfa',
  },
}
