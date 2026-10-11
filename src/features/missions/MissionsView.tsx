import { ArrowDown, ArrowLeft, CirclePause, CirclePlay, CircleX, FlaskConical, Plus, RotateCcw, Target } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog, Dialog } from '../../components/ui/Dialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { missionStatusMeta } from '../../components/ui/status'
import { hrefFor, type View } from '../../lib/useRoute'
import { cx, relativeTime } from '../../lib/utils'
import { useStore } from '../../state/AppStore'
import { missionProgress } from '../../state/missionEngine'
import type { Mission } from '../../types'
import { ActivityFeed, DeliverablePreview, RelatedApprovals, SourceList, StepTimeline, progressCaption } from './MissionParts'
import './missions.css'

const ORDER = { blocked: 0, running: 1, paused: 2, ready: 3, completed: 4, cancelled: 5 }

export function MissionsView({ missionId, navigate }: { missionId?: string; navigate: (view: View, param?: string) => void }) {
  const { state, actions } = useStore()
  const [creating, setCreating] = useState(false)
  const missions = useMemo(() => [...state.missions].sort((a, b) => ORDER[a.status] - ORDER[b.status] || b.updatedAt - a.updatedAt), [state.missions])
  const selected = state.missions.find((m) => m.id === (missionId ?? missions[0]?.id))

  return (
    <div className="page page--wide" data-pane={missionId ? 'detail' : 'list'}>
      <header className="page-header missions-header">
        <div>
          <h1>Missions</h1>
          <p>Multi-step tasks your agent works through — every step, source and decision in view.</p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => setCreating(true)}>
          New mission
        </Button>
      </header>

      <p className="notice missions-notice">
        <FlaskConical size={16} aria-hidden />
        <span>
          <strong>Simulated agent.</strong> Steps advance on a local timer and sources are illustrative. No web access, tools or real research are used.
        </span>
      </p>

      {missions.length === 0 ? (
        <div className="card">
          <EmptyState icon={Target} title="No missions yet" action={<Button variant="primary" icon={Plus} onClick={() => setCreating(true)}>Create a mission</Button>}>
            Missions break a goal into steps you can follow, pause or cancel.
          </EmptyState>
        </div>
      ) : (
        <div className="missions-layout">
          <nav className="mission-list" aria-label="Missions">
            <ul>
              {missions.map((m) => {
                const meta = missionStatusMeta[m.status]
                const { completed, total, ratio } = missionProgress(m)
                return (
                  <li key={m.id}>
                    <a href={hrefFor('missions', m.id)} className="mission-link" aria-current={selected?.id === m.id ? 'true' : undefined}>
                      <span className="mission-link__title">{m.title}</span>
                      <span className="row row--between">
                        <Badge tone={meta.tone} icon={meta.icon} spinIcon={meta.spin}>
                          {meta.label}
                        </Badge>
                        <span className="muted mission-link__time">{relativeTime(m.updatedAt)}</span>
                      </span>
                      <span className="mission-link__progress">
                        <span className={cx('progress', m.status === 'completed' && 'progress--success', m.status === 'cancelled' && 'progress--muted')} aria-hidden>
                          <span className="progress__bar" style={{ width: `${Math.round(ratio * 100)}%` }} />
                        </span>
                        <span className="muted">
                          {completed}/{total} steps
                        </span>
                      </span>
                    </a>
                  </li>
                )
              })}
            </ul>
          </nav>

          {selected ? (
            <MissionDetail key={selected.id} mission={selected} />
          ) : (
            <div className="card mission-detail">
              <EmptyState icon={Target} title="Mission not found">
                It may have been removed when the demo was reset. <a href={hrefFor('missions')}>See all missions</a>
              </EmptyState>
            </div>
          )}
        </div>
      )}

      <NewMissionDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreate={(objective) => {
          setCreating(false)
          navigate('missions', actions.createMission(objective))
        }}
      />
    </div>
  )
}

function MissionDetail({ mission }: { mission: Mission }) {
  const { state, actions } = useStore()
  const [confirmCancel, setConfirmCancel] = useState(false)
  const meta = missionStatusMeta[mission.status]
  const { completed, total, ratio } = missionProgress(mission)
  const blockedApproval = mission.steps.find((s) => s.status === 'blocked' && s.proposal)
  const related = state.proposals.filter((p) => p.origin.missionId === mission.id || mission.steps.some((s) => s.proposal?.id === p.id))
  const showResult = () => {
    const el = document.getElementById(`${mission.id}-deliverable-section`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    el?.focus({ preventScroll: true })
  }

  return (
    <article className="mission-detail" aria-labelledby={`${mission.id}-title`}>
      <a className="btn btn--sm btn--ghost mission-detail__back" href={hrefFor('missions')}>
        <ArrowLeft size={15} aria-hidden />
        <span>All missions</span>
      </a>

      <header className="mission-hero card">
        <div className="mission-hero__top">
          <div className="stack-2">
            <div className="row">
              <Badge tone={meta.tone} icon={meta.icon} spinIcon={meta.spin}>
                {meta.label}
              </Badge>
              {mission.templated && <Badge tone="muted">Template plan</Badge>}
            </div>
            <h2 id={`${mission.id}-title`} className="mission-hero__title">
              {mission.title}
            </h2>
            <p className="mission-hero__objective">{mission.objective}</p>
          </div>
          <div className="mission-hero__controls">
            {mission.status === 'ready' && (
              <Button variant="primary" icon={CirclePlay} onClick={() => actions.startMission(mission.id)}>
                Start mission
              </Button>
            )}
            {mission.status === 'running' && (
              <Button icon={CirclePause} onClick={() => actions.pauseMission(mission.id)}>
                Pause
              </Button>
            )}
            {mission.status === 'paused' && (
              <Button variant="primary" icon={CirclePlay} onClick={() => actions.resumeMission(mission.id)}>
                Resume
              </Button>
            )}
            {blockedApproval?.proposal && (
              <a className="btn btn--md btn--primary" href={hrefFor('approvals', blockedApproval.proposal.id)}>
                <span>Review proposal</span>
              </a>
            )}
            {['running', 'paused', 'blocked', 'ready'].includes(mission.status) && (
              <Button variant="danger" icon={CircleX} onClick={() => setConfirmCancel(true)}>
                Cancel
              </Button>
            )}
            {mission.status === 'completed' && (
              <Button variant="primary" icon={ArrowDown} onClick={showResult}>
                View result
              </Button>
            )}
            {(mission.status === 'completed' || mission.status === 'cancelled') && (
              <Button icon={RotateCcw} onClick={() => actions.restartMission(mission.id)}>
                Run demo again
              </Button>
            )}
          </div>
        </div>
        <div className="mission-hero__progress">
          <div
            className={cx('progress', mission.status === 'completed' && 'progress--success', mission.status === 'cancelled' && 'progress--muted')}
            role="progressbar"
            aria-label="Mission progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(ratio * 100)}
          >
            <div className="progress__bar" style={{ width: `${Math.round(ratio * 100)}%` }} />
          </div>
          <span className="mission-hero__caption" aria-live="polite">
            <span>{progressCaption(mission)}</span>
            <span className="muted">
              {completed}/{total} steps · updated {relativeTime(mission.updatedAt)}
            </span>
          </span>
        </div>
      </header>

      <div className="mission-body">
        <div className="mission-main">
          <section className="card card--pad" aria-labelledby={`${mission.id}-plan`}>
            <h3 id={`${mission.id}-plan`} className="section-title section-title--sm mission-section-title">
              Plan
            </h3>
            <StepTimeline mission={mission} onSkip={(stepId) => actions.skipStep(mission.id, stepId)} />
          </section>

          <section className="card card--pad" aria-labelledby={`${mission.id}-sources`}>
            <h3 id={`${mission.id}-sources`} className="section-title section-title--sm mission-section-title">
              Evidence
            </h3>
            <SourceList mission={mission} />
          </section>

          <section className="card card--pad mission-deliverable" id={`${mission.id}-deliverable-section`} tabIndex={-1} aria-labelledby={`${mission.id}-deliverable`}>
            <h3 id={`${mission.id}-deliverable`} className="section-title section-title--sm mission-section-title">
              Deliverable
            </h3>
            <DeliverablePreview mission={mission} proposals={related} />
          </section>
        </div>
        <aside className="mission-aside">
          <ActivityFeed mission={mission} />
          {related.length > 0 && <RelatedApprovals proposals={related} />}
        </aside>
      </div>

      <ConfirmDialog
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        title="Cancel this mission?"
        confirmLabel="Cancel mission"
        onConfirm={() => actions.cancelMission(mission.id)}
      >
        <ul className="consequences">
          <li>Remaining steps stop and are marked cancelled.</li>
          {blockedApproval && <li>The pending proposal “{blockedApproval.proposal!.title}” is withdrawn.</li>}
          <li>Completed steps and sources stay visible.</li>
        </ul>
      </ConfirmDialog>
    </article>
  )
}

function NewMissionDialog({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (objective: string) => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="New mission" description="Describe the outcome you want. The demo will run a generic template plan.">
      <NewMissionForm onCancel={onClose} onCreate={onCreate} />
    </Dialog>
  )
}

function NewMissionForm({ onCancel, onCreate }: { onCancel: () => void; onCreate: (objective: string) => void }) {
  const [objective, setObjective] = useState('')
  const [touched, setTouched] = useState(false)
  const length = objective.trim().length
  const error = length < 8 ? 'Describe the goal in at least a few words.' : length > 200 ? 'Keep it under 200 characters.' : ''
  return (
    <form
      className="stack-4"
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        setTouched(true)
        if (!error) onCreate(objective)
      }}
    >
      <div className="field">
        <label className="field__label" htmlFor="mission-objective">
          Goal
        </label>
        <textarea
          id="mission-objective"
          className="textarea"
          value={objective}
          onChange={(e) => setObjective(e.target.value)}
          placeholder="e.g. Find a weekend pottery class within 30 minutes of home"
          aria-invalid={touched && Boolean(error)}
          aria-describedby="mission-objective-hint"
          autoFocus
        />
        <p id="mission-objective-hint" className={touched && error ? 'field__error' : 'field__hint'}>
          {touched && error ? error : 'This demo can’t research new topics — you’ll see a simulated plan and a placeholder result.'}
        </p>
      </div>
      <div className="row row--between form-actions">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary">
          Create mission
        </Button>
      </div>
    </form>
  )
}
