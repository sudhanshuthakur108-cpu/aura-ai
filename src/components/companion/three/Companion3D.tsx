import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { CanvasTexture, Color, DirectionalLight, PMREMGenerator, PointLight, SRGBColorSpace } from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import type { CompanionMood, CompanionRendererProps } from '../types'
import { CharacterModel } from './CharacterModel'
import { palettes } from './palettes'
import { damp } from './rig'

/* Real-time 3D companion (WebGL via React Three Fiber). Loaded lazily by
   <Companion>, which keeps the 2D avatar on screen until the first frame and
   falls back to it if WebGL is unavailable or rendering fails.

   Rendering cost: the frame loop only runs while the character is visible and
   motion is allowed; otherwise it renders on demand (a single frame per change). */

export interface Companion3DProps extends Omit<CompanionRendererProps, 'size'> {
  onReady?: () => void
  onContextLost?: () => void
}

/** Soft reflections from three's built-in procedural room — no external HDR file. */
function LocalEnvironment() {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  useEffect(() => {
    const pmrem = new PMREMGenerator(gl)
    const room = new RoomEnvironment()
    const env = pmrem.fromScene(room, 0.04).texture
    scene.environment = env
    scene.environmentIntensity = 0.32
    room.dispose()
    return () => {
      scene.environment = null
      env.dispose()
      pmrem.dispose()
    }
  }, [gl, scene])
  return null
}

/** Faint coloured light pool under the character (a radial gradient texture). */
function GlowPool({ color }: { color: string }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 128
    const ctx = canvas.getContext('2d')!
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
    g.addColorStop(0, 'rgba(255,255,255,0.9)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 128, 128)
    const tex = new CanvasTexture(canvas)
    tex.colorSpace = SRGBColorSpace
    return tex
  }, [])
  useEffect(() => () => texture.dispose(), [texture])
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, -1.31, 0]}>
      <planeGeometry args={[3.6, 3.6]} />
      <meshBasicMaterial map={texture} color={color} transparent opacity={0.22} depthWrite={false} toneMapped={false} />
    </mesh>
  )
}

/* Lighting responds to the state: a little brighter and closer when listening,
   cooler while thinking, warmer while celebrating. Values ease, never jump. */
const LIGHTS: Record<CompanionMood, { key: number; rim: number; fill: number; tint: 'none' | 'cool' | 'warm' }> = {
  idle: { key: 1.9, rim: 22, fill: 5, tint: 'none' },
  listening: { key: 2.05, rim: 30, fill: 6, tint: 'none' },
  thinking: { key: 1.7, rim: 27, fill: 4.5, tint: 'cool' },
  speaking: { key: 2, rim: 28, fill: 6, tint: 'none' },
  celebrating: { key: 2.2, rim: 34, fill: 7.5, tint: 'warm' },
}
const COOL = new Color('#7f9cff')
const WARM = new Color('#f5a8d2')

function MoodLights({ mood, rimColor, animate }: { mood: CompanionMood; rimColor: string; animate: boolean }) {
  const key = useRef<DirectionalLight>(null)
  const rim = useRef<PointLight>(null)
  const fill = useRef<PointLight>(null)
  const base = useMemo(() => new Color(rimColor), [rimColor])
  const tint = useRef(0)

  useFrame((_, rawDelta) => {
    const target = LIGHTS[mood]
    const dt = animate ? Math.min(rawDelta, 0.1) : 10
    const ease = (current: number, goal: number) => damp(current, goal, 4, dt)
    if (key.current) key.current.intensity = ease(key.current.intensity, target.key)
    if (fill.current) fill.current.intensity = ease(fill.current.intensity, target.fill)
    if (rim.current) {
      rim.current.intensity = ease(rim.current.intensity, target.rim)
      tint.current = ease(tint.current, target.tint === 'none' ? 0 : 1)
      rim.current.color.copy(base).lerp(target.tint === 'warm' ? WARM : COOL, tint.current * 0.6)
    }
  })

  return (
    <>
      <directionalLight
        ref={key}
        position={[2.6, 4.2, 3.6]}
        intensity={1.9}
        color="#fff4ee"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
        shadow-camera-left={-3}
        shadow-camera-right={3}
        shadow-camera-top={3}
        shadow-camera-bottom={-3}
      />
      <pointLight ref={rim} position={[-2.6, 1.6, -2.4]} intensity={22} color={rimColor} distance={12} />
      <pointLight ref={fill} position={[0.4, -0.6, 3.2]} intensity={5} color="#d9ceff" distance={10} />
    </>
  )
}

/** Reports the first rendered frame so the placeholder can fade out. */
function FirstFrame({ onReady }: { onReady?: () => void }) {
  const done = useRef(false)
  useFrame(() => {
    if (done.current) return
    done.current = true
    onReady?.()
  })
  return null
}

/** In on-demand mode, draw one frame whenever the inputs change. */
function InvalidateOn({ changeKey }: { changeKey: string }) {
  const invalidate = useThree((s) => s.invalidate)
  useEffect(() => invalidate(), [invalidate, changeKey])
  return null
}

export default function Companion3D({ mood, appearance, halo, active, onReady, onContextLost }: Companion3DProps) {
  // `active` already accounts for visibility and reduced motion (see <Companion>).
  const animate = active
  const palette = palettes[appearance]

  return (
    <Canvas
      className="companion-3d__canvas"
      frameloop={animate ? 'always' : 'demand'}
      dpr={[1, 2]}
      // Follow the container every frame so the stage can resize smoothly (Home shrinks it mid-conversation).
      // offsetSize: measure layout size, not the transformed box — Companion Mode scales the stage while
      // it animates in, and a transform-based measurement would leave the canvas undersized.
      resize={{ debounce: 0, offsetSize: true }}
      shadows="percentage"
      camera={{ position: [0, 0.4, 6.2], fov: 30, near: 0.1, far: 30 }}
      gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
      onCreated={({ gl, camera }) => {
        camera.lookAt(0, 0.16, 0)
        gl.domElement.addEventListener('webglcontextlost', (event) => {
          event.preventDefault()
          onContextLost?.()
        })
      }}
      aria-hidden
    >
      <LocalEnvironment />
      <hemisphereLight args={['#e4dbff', '#2a1640', 0.55]} />
      <MoodLights mood={mood} rimColor={palette.rim} animate={animate} />

      <CharacterModel mood={mood} appearance={appearance} halo={halo} animate={animate} />

      <mesh rotation-x={-Math.PI / 2} position={[0, -1.32, 0]} receiveShadow>
        <planeGeometry args={[8, 8]} />
        <shadowMaterial transparent opacity={0.38} />
      </mesh>
      <GlowPool color={palette.glow} />

      <FirstFrame onReady={onReady} />
      <InvalidateOn changeKey={`${mood}|${appearance}|${halo}|${animate}`} />
    </Canvas>
  )
}
