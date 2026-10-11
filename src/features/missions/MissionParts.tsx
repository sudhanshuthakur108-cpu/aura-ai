import {
  ArrowRight,
  BookOpen,
  ChartColumn,
  CircleAlert,
  FileText,
  Flag,
  Hand,
  Info,
  Lock,
  PenLine,
  ScanSearch,
  ShieldCheck,
  SkipForward,
  Sparkles,
  UserRound,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { proposalStatusMeta, stepStatusMeta } from '../../components/ui/status'
import { hrefFor } from '../../lib/useRoute'
import { clockTime, cx, relativeTime } from '../../lib/utils'
import { visibleSources } from '../../state/missionEngine'
import type { ActionProposal, ActivityEntry, Mission, SourceCard, StepTool } from '../../types'
import { proposalKindMeta } from '../approvals/meta'
import { demoOutcome } from '../approvals/outcome'

const toolMeta: Record<StepTool, { label: string; icon: LucideIcon }> = {
  search: { label: 'Search', icon: ScanSearch },
  read: { label: 'Read', icon: BookOpen },
  analyze: { label: 'Analyse', icon: ChartColumn },
  draft: { label: 'Draft', icon: PenLine },
  approval: { label: 'Your approval', icon: ShieldCheck },
  input: { label: 'Needs input', icon: UserRound },
}

/** One line describing exactly where the mission is, derived from local state. */
export function progressCaption(m: Mission) {
  const index = m.steps.findIndex((s) => s.status === 'running' || s.status === 'blocked')
  const step = m.steps[index]
  const done = m.steps.filter((s) => s.status === 'completed').length
  switch (m.status) {
    case 'ready':
      return `Not started · ${m.steps.length} steps planned`
    case 'running':
      return step ? `Step ${index + 1} of ${m.steps.length}: ${step.title}` : 'Wrapping up…'
    case 'paused':
      return step ? `Paused at step ${index + 1}: ${step.title}` : 'Paused'
    case 'blocked':
      return step ? `Waiting on you at step ${index + 1}: ${step.title}` : 'Waiting on you'
    case 'completed':
      return 'All steps finished · result ready'
    case 'cancelled':
      return `Stopped after ${done} of ${m.steps.length} steps`
  }
}

export function RelatedApprovals({ proposals }: { proposals: ActionProposal[] }) {
  return (
    <section className="related card" aria-label="Related approvals">
      <h3 className="section-title section-title--sm">Related approvals</h3>
      <ul className="related__list">
        {proposals.map((p) => {
          const kind = proposalKindMeta[p.kind]
          const status = proposalStatusMeta[p.status]
          return (
            <li key={p.id}>
              <a href={hrefFor('approvals', p.id)} className="related__item">
                <span className="related__icon" aria-hidden>
                  <kind.icon size={15} />
                </span>
                <span className="related__text">
                  <span className="related__title">{p.title}</span>
                  <Badge tone={status.tone} icon={status.icon}>
                    {status.label}
                  </Badge>
                </span>
                <ArrowRight size={15} aria-hidden className="related__arrow" />
              </a>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export function StepTimeline({ mission, onSkip }: { mission: Mission; onSkip: (stepId: string) => void }) {
  return (
    <ol className="timeline" aria-label="Plan">
      {mission.steps.map((step, i) => {
        const meta = stepStatusMeta[step.status]
        const tool = toolMeta[step.tool]
        const pct = Math.round((step.elapsedMs / step.durationMs) * 100)
        return (
          <li key={step.id} className={cx('step', `step--${step.status}`)}>
            <span className="step__node" aria-hidden>
              <meta.icon size={16} className={meta.spin && mission.status === 'running' ? 'spin' : undefined} />
            </span>
            <div className="step__body">
              <div className="step__head">
                <h4 className="step__title">
                  <span className="visually-hidden">Step {i + 1}: </span>
                  {step.title}
                </h4>
                <span className="step__status">{step.status === 'running' && mission.status === 'paused' ? 'Paused' : meta.label}</span>
              </div>
              <p className="step__detail">{step.detail}</p>
              <span className="tag step__tool">
                <tool.icon size={12} aria-hidden /> {tool.label}
              </span>
              {step.status === 'running' && (
                <div
                  className="progress step__progress"
                  role="progressbar"
                  aria-label={`${step.title} progress`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={pct}
                >
                  <div className="progress__bar" style={{ width: `${pct}%` }} />
                </div>
              )}
              {step.status === 'blocked' && (
                <div className="step__blocked">
                  <p>
                    <Hand size={15} aria-hidden /> {step.blockedReason}
                  </p>
                  {step.proposal ? (
                    <a className="btn btn--sm btn--primary" href={hrefFor('approvals', step.proposal.id)}>
                      <span>Review proposal</span>
                      <ArrowRight size={15} aria-hidden />
                    </a>
                  ) : (
                    <Button size="sm" icon={SkipForward} onClick={() => onSkip(step.id)}>
                      Skip this step
                    </Button>
                  )}
                </div>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

const activityIcon: Record<ActivityEntry['kind'], LucideIcon> = {
  info: Info,
  tool: Wrench,
  source: FileText,
  warning: CircleAlert,
  result: Flag,
  user: UserRound,
}

export function ActivityFeed({ mission }: { mission: Mission }) {
  const entries = [...mission.activity].reverse()
  const latest = mission.activity[mission.activity.length - 1]
  return (
    <section className="activity card" aria-labelledby={`${mission.id}-activity`}>
      <header className="activity__head">
        <h3 id={`${mission.id}-activity`} className="section-title section-title--sm">
          Activity
        </h3>
        <span className="muted activity__note">Simulated locally</span>
      </header>
      <p className="visually-hidden" aria-live="polite">
        {latest ? latest.text : ''}
      </p>
      {entries.length === 0 ? (
        <p className="muted small">No activity yet.</p>
      ) : (
        <ol className="activity__list">
          {entries.map((e) => {
            const Icon = activityIcon[e.kind]
            return (
              <li key={e.id} className={cx('activity__item', `activity__item--${e.kind}`)}>
                <span className="activity__icon" aria-hidden>
                  <Icon size={13} />
                </span>
                <span className="activity__text">{e.text}</span>
                <time className="activity__time" dateTime={new Date(e.at).toISOString()} title={relativeTime(e.at)}>
                  {clockTime(e.at)}
                </time>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}

const sourceKind: Record<SourceCard['kind'], string> = {
  review: 'Review',
  article: 'Article',
  dataset: 'Data',
  guide: 'Guide',
  forum: 'Forum',
}

export function SourceList({ mission }: { mission: Mission }) {
  const sources = visibleSources(mission)
  const hidden = mission.sources.length - sources.length
  if (mission.sources.length === 0) {
    return (
      <EmptyState icon={FileText} title="No sources" compact>
        {mission.templated ? 'Template missions don’t fetch sources in this demo.' : 'This mission didn’t gather any sources.'}
      </EmptyState>
    )
  }
  return (
    <div className="stack-3">
      {sources.length === 0 ? (
        <p className="muted small">Sources appear here as research steps complete.</p>
      ) : (
        <ul className="sources">
          {sources.map((s) => (
            <li key={s.id} className="source">
              <div className="row row--between">
                <Badge tone="info">{sourceKind[s.kind]}</Badge>
                <span className="source__domain">{s.domain}</span>
              </div>
              <h4 className="source__title">{s.title}</h4>
              <blockquote className="source__excerpt">{s.excerpt}</blockquote>
              <p className="source__publisher">{s.publisher} · illustrative source</p>
            </li>
          ))}
        </ul>
      )}
      {hidden > 0 && mission.status !== 'cancelled' && (
        <p className="muted small">
          {hidden} more source{hidden === 1 ? '' : 's'} will appear as later steps complete.
        </p>
      )}
    </div>
  )
}

export function DeliverablePreview({ mission, proposals = [] }: { mission: Mission; proposals?: ActionProposal[] }) {
  const d = mission.deliverable
  const decided = proposals.filter((p) => mission.steps.some((s) => s.proposal?.id === p.id) && p.status !== 'pending')
  if (mission.status === 'cancelled') {
    return (
      <EmptyState icon={FileText} title="No deliverable" compact>
        This mission was cancelled before a result was produced.
      </EmptyState>
    )
  }
  if (mission.status !== 'completed') {
    return (
      <div className="deliverable deliverable--locked">
        <div className="deliverable__skeleton" aria-hidden>
          <span style={{ width: '58%' }} />
          <span style={{ width: '92%' }} />
          <span style={{ width: '84%' }} />
          <span style={{ width: '70%' }} />
        </div>
        <p className="deliverable__lock">
          <Lock size={15} aria-hidden /> “{d.title}” will appear here when the mission completes.
        </p>
      </div>
    )
  }
  return (
    <article className="deliverable">
      <div className="row row--between">
        <h4 className="deliverable__title display">{d.title}</h4>
        <Badge tone="muted" icon={Sparkles}>
          {mission.templated ? 'Placeholder' : 'Illustrative result'}
        </Badge>
      </div>
      <p className="deliverable__summary">{d.summary}</p>
      {decided.map((p) => (
        <p key={p.id} className="notice deliverable__decision">
          <ShieldCheck size={16} aria-hidden />
          <span>
            <strong>{p.title}:</strong> {p.status === 'approved' ? `approved by you. ${demoOutcome(p)}` : `${p.status} — nothing was done.`}{' '}
            <a href={hrefFor('approvals', p.id)}>View proposal</a>
          </span>
        </p>
      ))}
      {d.table && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                {d.table.columns.map((c) => (
                  <th key={c} scope="col">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {d.table.rows.map((r) => (
                <tr key={r[0]}>
                  {r.map((cell, i) => (i === 0 ? <th key={i} scope="row">{cell}</th> : <td key={i}>{cell}</td>))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {d.sections.map((s) => (
        <section key={s.heading} className="deliverable__section">
          <h5>{s.heading}</h5>
          {s.body && <p>{s.body}</p>}
          {s.bullets && (
            <ul>
              {s.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </article>
  )
}
