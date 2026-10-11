import type { CompanionMood } from '../types'

/* Procedural animation rig for the 3D companion. `targetPose` describes where
   every animated part should be for a mood at time `t`; the renderer eases the
   current pose toward it each frame (`dampPose`), which gives smooth, natural
   transitions between states. Pure functions — no three.js objects — so the
   rig is unit-tested on its own. */

export type Vec3 = [number, number, number]

export interface Pose {
  /** Body float offset (world units). */
  y: number
  /** Breathing: vertical scale multiplier. */
  breathe: number
  tiltZ: number
  tiltX: number
  yaw: number
  /** Eye gaze offset on the visor. */
  eyeX: number
  eyeY: number
  /** 1 = open, 0 = closed. Blinks are layered on top by the renderer. */
  eyeOpen: number
  eyeSize: number
  /** 0..1 crossfade from capsule eyes to happy "^ ^" arcs. */
  happy: number
  /** Smile arc height (0 = flat line). */
  smile: number
  /** Speaking mouth opening, 0 when not speaking. Visual only — not lip-sync. */
  talk: number
  leftHand: Vec3
  rightHand: Vec3
  leftHandRot: number
  rightHandRot: number
  /** Orbit ring opacity. */
  ring: number
  /** Antenna bead glow scale. */
  bead: number
  /** Thinking dots visibility 0..1. */
  think: number
  /** Celebration sparkles 0..1. */
  sparkle: number
}

const REST_LEFT: Vec3 = [-1.2, -0.62, 0.2]
const REST_RIGHT: Vec3 = [1.2, -0.62, 0.2]

/** Target pose for a mood. With `motion` false every time-based term is
    dropped, giving a still pose that still reads clearly. */
export function targetPose(mood: CompanionMood, t: number, motion: boolean): Pose {
  const s = (freq: number, phase = 0) => (motion ? Math.sin(t * freq + phase) : 0)
  const float = 0.06 * s(1.1)

  const base: Pose = {
    y: float,
    breathe: 1 + 0.014 * s(2.2),
    tiltZ: 0.03 * s(0.55),
    tiltX: 0,
    yaw: 0.09 * s(0.35),
    eyeX: 0,
    eyeY: 0,
    eyeOpen: 1,
    eyeSize: 1,
    happy: 0,
    smile: 1,
    talk: 0,
    leftHand: [REST_LEFT[0], REST_LEFT[1] + 0.05 * s(1.3, 0.6), REST_LEFT[2]],
    rightHand: [REST_RIGHT[0], REST_RIGHT[1] + 0.05 * s(1.3, 2.1), REST_RIGHT[2]],
    leftHandRot: 0.15,
    rightHandRot: -0.15,
    ring: 0.5,
    bead: 1,
    think: 0,
    sparkle: 0,
  }

  switch (mood) {
    case 'idle':
      return base

    case 'listening':
      // Attentive: leans in, head tilted, a hand cupped by the ear pod.
      return {
        ...base,
        tiltZ: -0.13 + 0.02 * s(0.8),
        tiltX: -0.07,
        yaw: 0.06 * s(0.5),
        eyeSize: 1.16,
        smile: 0.75,
        rightHand: [1.12, 0.12 + 0.03 * s(2), 0.38],
        rightHandRot: -0.9,
        ring: 0.8,
        bead: 1.15 + 0.3 * Math.abs(s(4)),
      }

    case 'thinking':
      // Looks up and to the side, hand to chin, thought dots above the head.
      return {
        ...base,
        tiltZ: 0.11,
        yaw: -0.18 + 0.05 * s(0.9),
        eyeX: 0.06,
        eyeY: 0.07,
        eyeOpen: 0.72,
        smile: 0.15,
        rightHand: [0.42, -0.8, 0.95],
        rightHandRot: -0.4,
        ring: 0.65,
        bead: 1 + 0.35 * Math.abs(s(6)),
        think: 1,
      }

    case 'speaking': {
      // Mouth opens and closes in a speech-like rhythm. Not driven by audio.
      const talk = motion ? 0.35 + 0.65 * Math.abs(Math.sin(t * 9) * (0.6 + 0.4 * Math.sin(t * 3.1))) : 0.6
      return {
        ...base,
        yaw: 0.07 * s(1.3),
        tiltZ: 0.04 * s(1.7),
        smile: 0.2,
        talk,
        leftHand: [-1.18, -0.48 + 0.08 * s(2.6), 0.32],
        rightHand: [1.18, -0.5 + 0.08 * s(2.6, 1.4), 0.32],
        ring: 0.7,
      }
    }

    case 'celebrating':
      // Brief, restrained joy: happy eyes, small bounce, hands up, sparkles.
      return {
        ...base,
        y: 0.1 * Math.abs(s(4.5)) + 0.04,
        tiltZ: 0.07 * s(4.5),
        happy: 1,
        smile: 1.35,
        leftHand: [-1.08, 0.5 + 0.06 * s(8), 0.3],
        rightHand: [1.08, 0.5 + 0.06 * s(8, 1.2), 0.3],
        leftHandRot: 0.5 + 0.35 * s(8),
        rightHandRot: -0.5 - 0.35 * s(8, 1.2),
        ring: 1,
        bead: 1.25,
        sparkle: 1,
      }
  }
}

const KEYS = Object.keys(targetPose('idle', 0, false)) as (keyof Pose)[]

/** Frame-rate independent exponential smoothing (same curve as THREE.MathUtils.damp). */
export function damp(current: number, target: number, lambda: number, dt: number) {
  return current + (target - current) * (1 - Math.exp(-lambda * dt))
}

/** Eases `current` toward `target` in place. Returns `current`. */
export function dampPose(current: Pose, target: Pose, dt: number, lambda = 7): Pose {
  for (const key of KEYS) {
    const c = current[key]
    const g = target[key]
    if (Array.isArray(c) && Array.isArray(g)) {
      for (let i = 0; i < 3; i++) c[i] = damp(c[i], g[i], lambda, dt)
    } else {
      ;(current[key] as number) = damp(c as number, g as number, lambda, dt)
    }
  }
  return current
}

export function clonePose(p: Pose): Pose {
  return { ...p, leftHand: [...p.leftHand], rightHand: [...p.rightHand] }
}

/** Blink curve: 1 = open. A blink lasts ~140ms. */
export function blinkAmount(sinceBlink: number) {
  const d = 0.14
  if (sinceBlink < 0 || sinceBlink > d) return 1
  return Math.abs(Math.cos((sinceBlink / d) * Math.PI)) * 0.92 + 0.08
}
