import { useId } from 'react'
import type { CompanionRendererProps } from '../types'
import './orb.css'

/* TEMPORARY CHARACTER: a 2D SVG orb animated with CSS. Gradients, a rim light
   and a front/back orbit ring give it depth, but it is not a 3D model. It only
   animates transforms and opacity, and stops entirely when `active` is false. */

export function OrbRenderer({ mood, appearance, size, halo, active }: CompanionRendererProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const id = (k: string) => `${k}-${uid}`
  const detailed = size !== 'sm'

  return (
    <div className={`orb orb--${size}`} data-mood={mood} data-style={appearance} data-active={active || undefined}>
      <svg viewBox="0 0 240 240" className="orb__svg" aria-hidden focusable="false">
        <defs>
          <radialGradient id={id('body')} cx="36%" cy="28%" r="80%">
            <stop offset="0%" style={{ stopColor: 'var(--c-hi)' }} />
            <stop offset="45%" style={{ stopColor: 'var(--c-mid)' }} />
            <stop offset="100%" style={{ stopColor: 'var(--c-deep)' }} />
          </radialGradient>
          <radialGradient id={id('bounce')} cx="50%" cy="100%" r="70%">
            <stop offset="0%" style={{ stopColor: 'var(--c-glow)', stopOpacity: 0.55 }} />
            <stop offset="100%" style={{ stopColor: 'var(--c-glow)', stopOpacity: 0 }} />
          </radialGradient>
          <radialGradient id={id('glow')} cx="50%" cy="50%" r="50%">
            <stop offset="0%" style={{ stopColor: 'var(--c-glow)', stopOpacity: 0.5 }} />
            <stop offset="100%" style={{ stopColor: 'var(--c-glow)', stopOpacity: 0 }} />
          </radialGradient>
          <linearGradient id={id('rim')} x1="0.15" y1="0" x2="0.85" y2="1">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.75" />
            <stop offset="35%" stopColor="#fff" stopOpacity="0.08" />
            <stop offset="100%" style={{ stopColor: 'var(--c-glow)', stopOpacity: 0.5 }} />
          </linearGradient>
          <linearGradient id={id('visor')} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: 'var(--c-face-hi)' }} />
            <stop offset="100%" style={{ stopColor: 'var(--c-face)' }} />
          </linearGradient>
          <linearGradient id={id('eye')} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fff" />
            <stop offset="100%" style={{ stopColor: 'var(--c-eye)' }} />
          </linearGradient>
          <linearGradient id={id('ring')} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" style={{ stopColor: 'var(--c-hi)', stopOpacity: 0 }} />
            <stop offset="50%" style={{ stopColor: 'var(--c-hi)', stopOpacity: 0.9 }} />
            <stop offset="100%" style={{ stopColor: 'var(--c-hi)', stopOpacity: 0 }} />
          </linearGradient>
          <linearGradient id={id('stem')} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" style={{ stopColor: 'var(--c-mid)', stopOpacity: 0 }} />
            <stop offset="100%" style={{ stopColor: 'var(--c-hi)', stopOpacity: 0.9 }} />
          </linearGradient>
        </defs>

        {detailed && <circle className="orb__aura" cx="120" cy="122" r="114" fill={`url(#${id('glow')})`} />}
        <ellipse className="orb__shadow" cx="120" cy="224" rx="50" ry="6" />

        <g className="orb__float">
          {detailed && halo && (
            <path className="orb__ring" transform="rotate(-11 120 132)" d="M 24 132 A 96 22 0 0 1 216 132" fill="none" stroke={`url(#${id('ring')})`} strokeWidth="1.6" />
          )}

          <g className="orb__body">
            <path d="M121 52 C 121 40, 127 32, 135 27" fill="none" stroke={`url(#${id('stem')})`} strokeWidth="3" strokeLinecap="round" />
            <circle className="orb__bead" cx="136" cy="26" r="6" />

            <circle cx="120" cy="124" r="72" fill={`url(#${id('body')})`} />
            <circle cx="120" cy="124" r="72" fill={`url(#${id('bounce')})`} />
            <circle cx="120" cy="124" r="71.2" fill="none" stroke={`url(#${id('rim')})`} strokeWidth="1.6" />
            <ellipse className="orb__spec" cx="92" cy="84" rx="20" ry="9" transform="rotate(-30 92 84)" />
            <circle className="orb__spec-dot" cx="80" cy="96" r="2.5" />

            {/* Visor */}
            <rect x="70" y="104" width="100" height="62" rx="31" fill={`url(#${id('visor')})`} />
            <path d="M88 106.5 H152" className="orb__visor-edge" strokeLinecap="round" />

            <g className="orb__face">
              <g className="orb__eyes">
                <rect className="orb__eye" x="95" y="123" width="12" height="19" rx="6" fill={`url(#${id('eye')})`} />
                <rect className="orb__eye" x="133" y="123" width="12" height="19" rx="6" fill={`url(#${id('eye')})`} />
              </g>
              <g className="orb__eyes-happy" fill="none" strokeWidth="4" strokeLinecap="round">
                <path d="M94 136 Q 101 125 108 136" />
                <path d="M132 136 Q 139 125 146 136" />
              </g>
              <ellipse className="orb__cheek" cx="86" cy="150" rx="7" ry="3.5" />
              <ellipse className="orb__cheek" cx="154" cy="150" rx="7" ry="3.5" />
              <path className="orb__mouth orb__mouth--smile" d="M113 152 Q 120 157.5 127 152" fill="none" strokeWidth="3" strokeLinecap="round" />
              <path className="orb__mouth orb__mouth--flat" d="M114 154 H 126" fill="none" strokeWidth="3" strokeLinecap="round" />
              <ellipse className="orb__mouth orb__mouth--talk" cx="120" cy="154" rx="5.5" ry="4" />
              <path className="orb__mouth orb__mouth--grin" d="M109 150 Q 120 163 131 150 Z" />
            </g>
          </g>

          {detailed && halo && (
            <g transform="rotate(-11 120 132)">
              <path className="orb__ring orb__ring--front" d="M 24 132 A 96 22 0 0 0 216 132" fill="none" stroke={`url(#${id('ring')})`} strokeWidth="2.2" />
              <circle className="orb__satellite" cx="216" cy="132" r="3.5" />
            </g>
          )}

          {detailed && (
            <>
              <g className="orb__thinking">
                <circle cx="168" cy="50" r="3.5" />
                <circle cx="181" cy="41" r="4.5" />
                <circle cx="196" cy="30" r="5.5" />
              </g>
              <g className="orb__waves" fill="none" strokeWidth="2.5" strokeLinecap="round">
                <path d="M203 116 Q 211 130 203 144" />
                <path d="M214 106 Q 226 130 214 154" />
              </g>
              <g className="orb__sparkles">
                <path d="M42 64 l3 9 9 3 -9 3 -3 9 -3 -9 -9 -3 9 -3z" />
                <path d="M196 70 l2 6 6 2 -6 2 -2 6 -2 -6 -6 -2 6 -2z" />
                <path d="M56 178 l2 6 6 2 -6 2 -2 6 -2 -6 -6 -2 6 -2z" />
                <path d="M186 184 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3z" />
              </g>
            </>
          )}
        </g>
      </svg>
    </div>
  )
}
