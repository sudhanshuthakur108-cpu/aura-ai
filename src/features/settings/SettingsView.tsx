import { AudioLines, MicOff, Brain, Calendar, CreditCard, Eraser, Globe, Lock, Mail, MessageCircle, Palette, PlugZap, RotateCcw, Sparkles, UserRound } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'
import { Companion, moodLabels } from '../../components/companion/Companion'
import type { CompanionRendererKind } from '../../components/companion/types'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/Dialog'
import { useToast } from '../../components/ui/Toast'
import { brand } from '../../config/brand'
import { cx } from '../../lib/utils'
import { useStore } from '../../state/AppStore'
import type { CompanionMood, CompanionStyle, MotionPref, ThemeName, Tone } from '../../types'
import { WakeWordPreview } from '../companion-mode/WakeWordPreview'
import './settings.css'

const STYLES: { value: CompanionStyle; label: string; hint: string }[] = [
  { value: 'lumen', label: 'Lumen', hint: 'Lavender glow' },
  { value: 'ember', label: 'Ember', hint: 'Rose and apricot' },
  { value: 'tide', label: 'Tide', hint: 'Periwinkle blue' },
]

const TONES: { value: Tone; label: string; sample: string }[] = [
  { value: 'warm', label: 'Warm', sample: '“I’m sorry it’s been heavy. You don’t have to sort anything out right now.”' },
  { value: 'balanced', label: 'Balanced', sample: '“That sounds like a lot. Want to talk it through, or switch to something lighter?”' },
  { value: 'direct', label: 'Direct', sample: '“Understood. Talk it through, or take a break?”' },
]

const THEMES: { value: ThemeName; label: string; hint: string; swatch: string[] }[] = [
  { value: 'ink', label: 'Ink', hint: 'Default · cool violet-black', swatch: ['#100c18', '#1d172b', '#c4b5fd'] },
  { value: 'plum', label: 'Plum', hint: 'Warmer, deeper purple', swatch: ['#170d1c', '#26182e', '#c4b5fd'] },
  { value: 'midnight', label: 'Midnight', hint: 'Darkest, higher contrast', swatch: ['#07060b', '#15121e', '#c4b5fd'] },
]

const MOTION: { value: MotionPref; label: string; hint: string }[] = [
  { value: 'system', label: 'Match system', hint: 'Follows your device’s reduce-motion setting' },
  { value: 'reduced', label: 'Reduced', hint: 'Character holds still; transitions are instant' },
  { value: 'full', label: 'Full', hint: 'All animation, even if your device asks for less' },
]

const rendererLabel: Record<CompanionRendererKind, string> = {
  'loading-3d': 'Loading the 3D character…',
  '3d': 'Rendering: real-time 3D (WebGL)',
  '2d': 'Rendering: 2D avatar',
  '2d-fallback': '3D unavailable here (no WebGL or it failed) — showing the 2D avatar instead',
}

const INTEGRATIONS = [
  { icon: Mail, name: 'Email', use: 'Send drafts you approve' },
  { icon: Calendar, name: 'Calendar', use: 'Create holds and events you approve' },
  { icon: CreditCard, name: 'Payments', use: 'Complete purchases you approve' },
  { icon: Globe, name: 'Web research', use: 'Let missions search and read live sources' },
  { icon: MessageCircle, name: 'Messaging', use: 'Reply to friends on your behalf, with approval' },
]

function Section({ icon: Icon, title, description, children }: { icon: typeof Brain; title: string; description: string; children: ReactNode }) {
  const id = useId()
  return (
    <section className="settings-section card" aria-labelledby={id}>
      <header className="settings-section__head">
        <span className="settings-section__icon" aria-hidden>
          <Icon size={18} />
        </span>
        <div>
          <h2 id={id} className="settings-section__title">
            {title}
          </h2>
          <p className="settings-section__desc">{description}</p>
        </div>
      </header>
      <div className="settings-section__body">{children}</div>
    </section>
  )
}

function OptionCards<T extends string>({ name, legend, value, options, onChange, render, columns = 3 }: {
  name: string
  legend: string
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  render: (o: { value: T; label: string }, selected: boolean) => ReactNode
  columns?: number
}) {
  return (
    <fieldset className="option-group">
      <legend className="field__label">{legend}</legend>
      <div className="option-cards" style={{ ['--cols' as string]: columns }}>
        {options.map((o) => (
          <label key={o.value} className={cx('option-card', value === o.value && 'is-selected')}>
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} />
            {render(o, value === o.value)}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

export function SettingsView() {
  const { state, actions } = useStore()
  const toast = useToast()
  const s = state.settings
  const [confirm, setConfirm] = useState<'memories' | 'reset' | null>(null)
  const [previewMood, setPreviewMood] = useState<CompanionMood>('idle')
  const [renderer, setRenderer] = useState<CompanionRendererKind>('loading-3d')
  const set = actions.updateSettings

  return (
    <div className="page settings-page">
      <header className="page-header">
        <div>
          <h1>Settings</h1>
          <p>Shape how {s.companionName} looks, sounds and behaves. Changes apply instantly and last until you reload.</p>
        </div>
      </header>

      <div className="settings-stack">
        <Section icon={UserRound} title="You & your companion" description="Names used in greetings and conversation.">
          <div className="settings-fields">
            <div className="field">
              <label className="field__label" htmlFor="pref-name">
                What should {s.companionName} call you?
              </label>
              <input id="pref-name" className="input" value={s.preferredName} maxLength={40} onChange={(e) => set({ preferredName: e.target.value })} placeholder="Leave blank to skip names" />
            </div>
            <div className="field">
              <label className="field__label" htmlFor="companion-name">
                Companion name
              </label>
              <input
                id="companion-name"
                className="input"
                value={s.companionName}
                maxLength={24}
                onChange={(e) => set({ companionName: e.target.value })}
                onBlur={(e) => !e.target.value.trim() && set({ companionName: brand.companionName })}
              />
              <p className="field__hint">Empty names reset to “{brand.companionName}”.</p>
            </div>
          </div>
        </Section>

        <Section icon={Palette} title="Appearance" description="The large character is a real-time 3D model built in code. Small avatars in the sidebar and chat use a matching 2D icon.">
          <div className="appearance-stage">
            <div className="appearance-stage__view">
              <Companion mood={previewMood} appearance={s.companionStyle} name={s.companionName} size="hero" halo={s.showHalo} onRendererChange={setRenderer} />
            </div>
            <p className="appearance-stage__caption" aria-live="polite">
              {rendererLabel[renderer]}
            </p>
          </div>
          <OptionCards
            name="companion-style"
            legend="Character style"
            value={s.companionStyle}
            options={STYLES}
            onChange={(v) => set({ companionStyle: v })}
            render={(o) => (
              <span className="style-option">
                <Companion mood="idle" appearance={o.value} name={o.label} size="md" halo={s.showHalo} animate={false} />
                <span className="option-card__label">{o.label}</span>
                <span className="option-card__hint">{STYLES.find((x) => x.value === o.value)?.hint}</span>
              </span>
            )}
          />
          <div className="setting-row">
            <div>
              <p className="setting-row__label">Preview a state</p>
              <p className="setting-row__hint">Visual only — nothing records or plays audio. In use, states follow what happens: listening while you type, thinking while a reply is prepared, speaking after a reply, celebrating when something is saved or approved.</p>
            </div>
            <div className="segmented segmented--wrap" role="group" aria-label="Preview character state">
              {(Object.keys(moodLabels) as CompanionMood[]).map((m) => (
                <button key={m} type="button" aria-pressed={previewMood === m} onClick={() => setPreviewMood(m)}>
                  {m === 'idle' ? 'Idle' : moodLabels[m]}
                </button>
              ))}
            </div>
          </div>
          <div className="setting-row">
            <div>
              <p className="setting-row__label" id="halo-label">
                Orbit ring
              </p>
              <p className="setting-row__hint">The thin ring that circles the character.</p>
            </div>
            <button type="button" role="switch" className="switch" aria-checked={s.showHalo} aria-labelledby="halo-label" onClick={() => set({ showHalo: !s.showHalo })} />
          </div>
        </Section>

        <Section icon={Sparkles} title="Personality" description="How the demo responder phrases its replies. It is scripted, so tone changes wording, not reasoning.">
          <OptionCards
            name="tone"
            legend="Tone"
            value={s.tone}
            options={TONES}
            onChange={(v) => set({ tone: v })}
            render={(o) => (
              <span className="tone-option">
                <span className="option-card__label">{o.label}</span>
                <span className="option-card__hint">{TONES.find((t) => t.value === o.value)?.sample}</span>
              </span>
            )}
          />
          <div className="setting-row">
            <div>
              <p className="setting-row__label">Reply length</p>
              <p className="setting-row__hint">Detailed adds context to some replies.</p>
            </div>
            <div className="segmented" role="group" aria-label="Reply length">
              <button type="button" aria-pressed={s.verbosity === 'concise'} onClick={() => set({ verbosity: 'concise' })}>
                Concise
              </button>
              <button type="button" aria-pressed={s.verbosity === 'detailed'} onClick={() => set({ verbosity: 'detailed' })}>
                Detailed
              </button>
            </div>
          </div>
        </Section>

        <Section icon={Palette} title="Theme & motion" description="All themes are dark by design; they differ in warmth and contrast.">
          <OptionCards
            name="theme"
            legend="Theme"
            value={s.theme}
            options={THEMES}
            onChange={(v) => set({ theme: v })}
            render={(o) => {
              const t = THEMES.find((x) => x.value === o.value)!
              return (
                <span className="theme-option">
                  <span className="theme-swatch" aria-hidden>
                    {t.swatch.map((c) => (
                      <span key={c} style={{ background: c }} />
                    ))}
                  </span>
                  <span className="option-card__label">{o.label}</span>
                  <span className="option-card__hint">{t.hint}</span>
                </span>
              )
            }}
          />
          <OptionCards
            name="motion"
            legend="Motion"
            value={s.motion}
            options={MOTION}
            onChange={(v) => set({ motion: v })}
            render={(o) => (
              <span className="tone-option">
                <span className="option-card__label">{o.label}</span>
                <span className="option-card__hint">{MOTION.find((m) => m.value === o.value)?.hint}</span>
              </span>
            )}
          />
        </Section>

        <Section icon={Lock} title="Privacy & memory" description="What is kept, where, and for how long.">
          <div className="setting-row">
            <div>
              <p className="setting-row__label" id="capture-label">
                Save memories from chat
              </p>
              <p className="setting-row__hint">When on, saying “remember that…” adds a memory you can review, edit or delete.</p>
            </div>
            <button
              type="button"
              role="switch"
              className="switch"
              aria-checked={s.memoryCapture}
              aria-labelledby="capture-label"
              onClick={() => set({ memoryCapture: !s.memoryCapture })}
            />
          </div>
          <ul className="privacy-facts">
            <li>Everything in this demo — chats, memories, missions, decisions — is held in this browser tab’s memory.</li>
            <li>Nothing is sent to a server, nothing syncs between devices, and reloading the page clears it.</li>
            <li>In a future version, memories would be stored in your account, and you could export or delete them at any time.</li>
          </ul>
          <div className="row">
            <Button variant="danger" icon={Eraser} onClick={() => setConfirm('memories')} disabled={state.memories.length === 0}>
              Clear all memories
            </Button>
            <Button icon={RotateCcw} onClick={() => setConfirm('reset')}>
              Reset demo data
            </Button>
          </div>
        </Section>

        <Section icon={AudioLines} title="Voice mode" description="Not available in this version. Here’s how it’s planned to work — nothing on this page listens or plays audio.">
          <WakeWordPreview />
          <ul className="voice-status">
            <li>
              <span>Microphone</span>
              <Badge tone="muted" icon={MicOff}>
                Never accessed
              </Badge>
            </li>
            <li>
              <span>Wake word (“Aura”)</span>
              <Badge tone="muted">Not connected</Badge>
            </li>
            <li>
              <span>Spoken replies</span>
              <Badge tone="muted">Not connected</Badge>
            </li>
          </ul>
        </Section>

        <Section icon={PlugZap} title="Integrations" description="Placeholders for connections a future version could offer. None are connected, and none can be connected in this demo.">
          <ul className="integrations">
            {INTEGRATIONS.map((i) => (
              <li key={i.name} className="integration">
                <span className="integration__icon" aria-hidden>
                  <i.icon size={18} />
                </span>
                <span className="integration__text">
                  <span className="integration__name">{i.name}</span>
                  <span className="integration__use">{i.use}</span>
                </span>
                <Badge tone="muted">Not connected</Badge>
              </li>
            ))}
          </ul>
        </Section>
      </div>

      <ConfirmDialog
        open={confirm === 'memories'}
        onClose={() => setConfirm(null)}
        title="Clear all memories?"
        confirmLabel={`Delete ${state.memories.length} memories`}
        onConfirm={() => {
          actions.clearMemories()
          toast({ tone: 'info', title: 'All memories cleared' })
        }}
      >
        <p>
          {s.companionName} will forget all {state.memories.length} saved memories. This can’t be undone (though reloading restores the demo samples).
        </p>
      </ConfirmDialog>
      <ConfirmDialog
        open={confirm === 'reset'}
        onClose={() => setConfirm(null)}
        title="Reset demo data?"
        confirmLabel="Reset demo"
        onConfirm={() => {
          actions.resetDemo()
          toast({ tone: 'success', title: 'Demo data reset', body: 'Chats, memories, missions and approvals are back to their starting point. Your settings were kept.' })
        }}
      >
        <p>Chats, memories, missions and approvals go back to their starting state. Your settings stay as they are.</p>
      </ConfirmDialog>
    </div>
  )
}
