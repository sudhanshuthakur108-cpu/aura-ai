import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { CatmullRomCurve3, Color, Group, Mesh, MeshBasicMaterial, MeshPhysicalMaterial, Vector3 } from 'three'
import type { CompanionMood, CompanionStyle } from '../types'
import { palettes } from './palettes'
import { blinkAmount, clonePose, dampPose, targetPose } from './rig'

/* Aura's 3D character, built from three.js geometry in code (no external model
   file): a glossy head with a dark glass visor, glowing capsule eyes, a mouth,
   an antenna, ear pods, two floating hands and an orbit ring. Every expression
   is produced by moving/scaling these meshes — there is no skeletal rig,
   blendshape face or audio-driven lip-sync. */

interface CharacterModelProps {
  mood: CompanionMood
  appearance: CompanionStyle
  halo: boolean
  /** When false the pose snaps to a still target (reduced motion / paused). */
  animate: boolean
}

const SPARKLES = 6
const ANTENNA = new CatmullRomCurve3([new Vector3(0.04, 0.9, 0), new Vector3(0.09, 1.1, 0.02), new Vector3(0.22, 1.28, 0.02)])

function useMaterials(appearance: CompanionStyle) {
  const materials = useMemo(() => {
    const p = palettes[appearance]
    const glow = (color: string, opacity = 1) =>
      new MeshBasicMaterial({ color: new Color(color), toneMapped: false, transparent: opacity < 1, opacity })
    return {
      body: new MeshPhysicalMaterial({
        color: p.body,
        roughness: 0.4,
        clearcoat: 1,
        clearcoatRoughness: 0.2,
        sheen: 0.35,
        sheenColor: new Color(p.sheen),
        sheenRoughness: 0.5,
        emissive: new Color(p.rim),
        emissiveIntensity: 0.07,
      }),
      hand: new MeshPhysicalMaterial({
        color: p.hand,
        roughness: 0.36,
        clearcoat: 0.9,
        clearcoatRoughness: 0.2,
        sheen: 0.3,
        sheenColor: new Color(p.sheen),
        emissive: new Color(p.rim),
        emissiveIntensity: 0.08,
      }),
      visor: new MeshPhysicalMaterial({ color: p.visor, roughness: 0.1, metalness: 0.25, clearcoat: 1, clearcoatRoughness: 0.04 }),
      pod: new MeshPhysicalMaterial({ color: p.pod, roughness: 0.35, metalness: 0.15, clearcoat: 0.6 }),
      eye: glow(p.eye),
      cheek: glow(p.cheek, 0.38),
      glow: glow(p.glow),
      ring: glow(p.glow, 0.5),
      dots: glow(p.sheen, 0.9),
    }
  }, [appearance])

  useEffect(() => () => Object.values(materials).forEach((m) => m.dispose()), [materials])
  return materials
}

export function CharacterModel({ mood, appearance, halo, animate }: CharacterModelProps) {
  const mat = useMaterials(appearance)

  const body = useRef<Group>(null)
  const leftEye = useRef<Mesh>(null)
  const rightEye = useRef<Mesh>(null)
  const leftHappy = useRef<Mesh>(null)
  const rightHappy = useRef<Mesh>(null)
  const eyes = useRef<Group>(null)
  const smile = useRef<Mesh>(null)
  const talk = useRef<Mesh>(null)
  const bead = useRef<Mesh>(null)
  const leftHand = useRef<Mesh>(null)
  const rightHand = useRef<Mesh>(null)
  const ring = useRef<Group>(null)
  const thinking = useRef<Group>(null)
  const sparkles = useRef<Group>(null)

  const pose = useRef(clonePose(targetPose(mood, 0, false)))
  const blink = useRef({ next: 2.5, start: -10 })

  useFrame((state, rawDelta) => {
    const t = state.clock.elapsedTime
    const dt = Math.min(rawDelta, 0.1)
    const target = targetPose(mood, t, animate)

    // Eyes and head drift slightly toward the pointer while idle or listening.
    if (animate && (mood === 'idle' || mood === 'listening')) {
      target.eyeX += state.pointer.x * 0.045
      target.eyeY += state.pointer.y * 0.03
      target.yaw += state.pointer.x * 0.12
    }

    const p = animate ? dampPose(pose.current, target, dt) : Object.assign(pose.current, clonePose(target))

    let open = p.eyeOpen
    if (animate && mood !== 'celebrating') {
      if (t > blink.current.next) {
        blink.current.start = t
        blink.current.next = t + 2.6 + Math.random() * 3.8
      }
      open *= blinkAmount(t - blink.current.start)
    }

    if (body.current) {
      body.current.position.y = p.y
      body.current.rotation.set(p.tiltX, p.yaw, p.tiltZ)
      body.current.scale.set(1 / Math.sqrt(p.breathe), p.breathe, 1 / Math.sqrt(p.breathe))
    }
    eyes.current?.position.set(p.eyeX, 0.05 + p.eyeY, 0)
    const eyeScale = (1 - p.happy) * p.eyeSize
    leftEye.current?.scale.set(eyeScale, Math.max(open * eyeScale, 0.001), eyeScale * 0.55)
    rightEye.current?.scale.set(eyeScale, Math.max(open * eyeScale, 0.001), eyeScale * 0.55)
    const happyScale = Math.max(p.happy, 0.001)
    leftHappy.current?.scale.setScalar(happyScale)
    rightHappy.current?.scale.setScalar(happyScale)

    if (smile.current) {
      const visible = Math.max(1 - p.talk * 1.6, 0.001)
      smile.current.scale.set(visible, Math.max(p.smile, 0.12) * visible, 1)
    }
    if (talk.current) {
      talk.current.scale.set(Math.max(p.talk, 0.001), Math.max(p.talk * 0.85, 0.001), 0.35)
    }
    bead.current?.scale.setScalar(p.bead)

    leftHand.current?.position.set(p.leftHand[0], p.leftHand[1] + p.y * 0.8, p.leftHand[2])
    rightHand.current?.position.set(p.rightHand[0], p.rightHand[1] + p.y * 0.8, p.rightHand[2])
    if (leftHand.current) leftHand.current.rotation.z = p.leftHandRot
    if (rightHand.current) rightHand.current.rotation.z = p.rightHandRot

    if (ring.current) {
      if (animate) ring.current.rotation.z += dt * (0.25 + p.ring * 0.35)
      mat.ring.opacity = 0.18 + p.ring * 0.5
    }

    if (thinking.current) {
      thinking.current.visible = p.think > 0.02
      thinking.current.children.forEach((dot, i) => {
        const pulse = animate ? 0.75 + 0.25 * Math.sin(t * 4 - i * 0.7) : 1
        dot.scale.setScalar(Math.max(p.think * pulse, 0.001))
      })
    }

    if (sparkles.current) {
      sparkles.current.visible = p.sparkle > 0.02
      sparkles.current.children.forEach((spark, i) => {
        const angle = (i / SPARKLES) * Math.PI * 2 + 0.4
        const cycle = animate ? ((t * 0.8 + i * 0.17) % 1) : 0.5
        const r = 1.35 + cycle * 0.45
        spark.position.set(Math.cos(angle) * r, 0.25 + Math.sin(angle) * r * 0.75, 0.4)
        spark.rotation.set(t * 1.5, t * 2 + i, 0)
        spark.scale.setScalar(Math.max(p.sparkle * Math.sin(cycle * Math.PI), 0.001))
      })
    }
  })

  return (
    <group position={[0, 0.12, 0]}>
      <group ref={body}>
        {/* Head */}
        <mesh castShadow material={mat.body} scale={[1, 0.95, 0.97]}>
          <sphereGeometry args={[1, 64, 48]} />
        </mesh>

        {/* Glass visor */}
        <mesh material={mat.visor} position={[0, -0.02, 0.7]} scale={[0.64, 0.42, 0.34]}>
          <sphereGeometry args={[1, 48, 32]} />
        </mesh>

        {/* Eyes: glowing capsules, crossfading to happy arcs */}
        <group ref={eyes}>
          <group position={[-0.2, 0, 1.03]} rotation={[0, -0.25, 0]}>
            <mesh ref={leftEye} material={mat.eye}>
              <capsuleGeometry args={[0.052, 0.085, 6, 16]} />
            </mesh>
            <mesh ref={leftHappy} material={mat.eye} position={[0, -0.03, 0]}>
              <torusGeometry args={[0.06, 0.017, 8, 24, Math.PI]} />
            </mesh>
          </group>
          <group position={[0.2, 0, 1.03]} rotation={[0, 0.25, 0]}>
            <mesh ref={rightEye} material={mat.eye}>
              <capsuleGeometry args={[0.052, 0.085, 6, 16]} />
            </mesh>
            <mesh ref={rightHappy} material={mat.eye} position={[0, -0.03, 0]}>
              <torusGeometry args={[0.06, 0.017, 8, 24, Math.PI]} />
            </mesh>
          </group>
        </group>

        {/* Mouth: smile arc + speaking shape (visual only, no audio) */}
        <group position={[0, -0.17, 1.035]}>
          <mesh ref={smile} material={mat.eye} rotation={[0, 0, Math.PI]}>
            <torusGeometry args={[0.07, 0.014, 8, 24, Math.PI]} />
          </mesh>
          <mesh ref={talk} material={mat.eye}>
            <sphereGeometry args={[0.06, 20, 12]} />
          </mesh>
        </group>

        {/* Cheeks */}
        <mesh material={mat.cheek} position={[-0.38, -0.12, 0.98]} rotation={[0, -0.42, 0]}>
          <circleGeometry args={[0.055, 20]} />
        </mesh>
        <mesh material={mat.cheek} position={[0.38, -0.12, 0.98]} rotation={[0, 0.42, 0]}>
          <circleGeometry args={[0.055, 20]} />
        </mesh>

        {/* Antenna */}
        <mesh material={mat.pod} castShadow>
          <tubeGeometry args={[ANTENNA, 20, 0.024, 8, false]} />
        </mesh>
        <mesh ref={bead} material={mat.glow} position={[0.24, 1.31, 0.02]}>
          <sphereGeometry args={[0.075, 20, 16]} />
        </mesh>

        {/* Ear pods */}
        {[-1, 1].map((side) => (
          <group key={side} position={[side * 0.95, 0.02, 0]} rotation={[0, 0, Math.PI / 2]}>
            <mesh material={mat.pod} castShadow>
              <cylinderGeometry args={[0.22, 0.24, 0.16, 40]} />
            </mesh>
            <mesh material={mat.glow} position={[0, side * -0.085, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.15, 0.016, 8, 40]} />
            </mesh>
          </group>
        ))}
      </group>

      {/* Floating hands */}
      <mesh ref={leftHand} material={mat.hand} castShadow scale={[0.95, 1.1, 0.8]}>
        <sphereGeometry args={[0.16, 32, 24]} />
      </mesh>
      <mesh ref={rightHand} material={mat.hand} castShadow scale={[0.95, 1.1, 0.8]}>
        <sphereGeometry args={[0.16, 32, 24]} />
      </mesh>

      {/* Orbit ring */}
      {halo && (
        <group rotation={[Math.PI / 2 - 0.3, 0.18, 0]}>
          <group ref={ring}>
            <mesh material={mat.ring}>
              <torusGeometry args={[1.62, 0.011, 8, 180]} />
            </mesh>
            <mesh material={mat.glow} position={[1.62, 0, 0]}>
              <sphereGeometry args={[0.045, 16, 12]} />
            </mesh>
          </group>
        </group>
      )}

      {/* Thinking dots */}
      <group ref={thinking} visible={false}>
        <mesh material={mat.dots} position={[0.72, 1.18, 0.3]}>
          <sphereGeometry args={[0.045, 16, 12]} />
        </mesh>
        <mesh material={mat.dots} position={[0.94, 1.36, 0.3]}>
          <sphereGeometry args={[0.06, 16, 12]} />
        </mesh>
        <mesh material={mat.dots} position={[1.18, 1.52, 0.3]}>
          <sphereGeometry args={[0.075, 16, 12]} />
        </mesh>
      </group>

      {/* Celebration sparkles */}
      <group ref={sparkles} visible={false}>
        {Array.from({ length: SPARKLES }, (_, i) => (
          <mesh key={i} material={i % 2 ? mat.glow : mat.dots}>
            <octahedronGeometry args={[0.07, 0]} />
          </mesh>
        ))}
      </group>
    </group>
  )
}
