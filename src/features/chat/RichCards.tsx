import { ArrowRight, Brain, Check, ListChecks, Play, Target } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { missionStatusMeta, proposalStatusMeta } from '../../components/ui/status'
import { hrefFor } from '../../lib/useRoute'
import { cx } from '../../lib/utils'
import { useStore } from '../../state/AppStore'
import { missionProgress } from '../../state/missionEngine'
import type { RichCard } from '../../types'
import { proposalKindMeta } from '../approvals/meta'
import { memoryCategories } from '../memory/categories'

function MissingCard({ text }: { text: string }) {
  return <div className="rich rich--missing">{text}</div>
}

function MissionCard({ missionId }: { missionId: string }) {
  const { state, actions } = useStore()
  const mission = state.missions.find((m) => m.id === missionId)
  if (!mission) return <MissingCard text="This mission no longer exists in the demo session." />
  const meta = missionStatusMeta[mission.status]
  const { completed, total, ratio } = missionProgress(mission)
  return (
    <article className="rich rich--mission">
      <header className="rich__head">
        <span className="rich__icon" aria-hidden>
          <Target size={16} />
        </span>
        <span className="rich__kind">Mission</span>
        <Badge tone={meta.tone} icon={meta.icon} spinIcon={meta.spin}>
          {meta.label}
        </Badge>
      </header>
      <h4 className="rich__title">{mission.title}</h4>
      <div className="rich__progress">
        <div className={cx('progress', mission.status === 'completed' && 'progress--success')} aria-hidden>
          <div className="progress__bar" style={{ width: `${Math.round(ratio * 100)}%` }} />
        </div>
        <span className="muted">
          {completed}/{total} steps
        </span>
      </div>
      <div className="row">
        {mission.status === 'ready' && (
          <Button size="sm" variant="primary" icon={Play} onClick={() => actions.startMission(mission.id)}>
            Start mission
          </Button>
        )}
        <a className="btn btn--sm btn--ghost" href={hrefFor('missions', mission.id)}>
          <span>Open mission</span>
          <ArrowRight size={15} aria-hidden />
        </a>
      </div>
    </article>
  )
}

function ProposalCard({ proposalId }: { proposalId: string }) {
  const { state } = useStore()
  const proposal = state.proposals.find((p) => p.id === proposalId)
  if (!proposal) return <MissingCard text="This proposal is no longer available." />
  const kind = proposalKindMeta[proposal.kind]
  const status = proposalStatusMeta[proposal.status]
  return (
    <article className="rich rich--proposal">
      <header className="rich__head">
        <span className="rich__icon rich__icon--warm" aria-hidden>
          <kind.icon size={16} />
        </span>
        <span className="rich__kind">Proposed action · {kind.label}</span>
        <Badge tone={status.tone} icon={status.icon}>
          {status.label}
        </Badge>
      </header>
      <h4 className="rich__title">{proposal.title}</h4>
      <p className="rich__body">{proposal.summary}</p>
      <a className="btn btn--sm btn--quiet" href={hrefFor('approvals', proposal.id)}>
        <span>{proposal.status === 'pending' ? 'Review before deciding' : 'View in Approvals'}</span>
        <ArrowRight size={15} aria-hidden />
      </a>
    </article>
  )
}

function MemorySavedCard({ memoryId }: { memoryId: string }) {
  const { state } = useStore()
  const memory = state.memories.find((m) => m.id === memoryId)
  if (!memory) return <MissingCard text="Saved to memory earlier — since deleted." />
  const cat = memoryCategories[memory.category]
  return (
    <article className="rich rich--memory">
      <span className="rich__icon" aria-hidden>
        <Brain size={16} />
      </span>
      <div className="rich__inline">
        <p className="rich__kind">Saved to memory · {cat.label}</p>
        <p className="rich__title rich__title--sm">{memory.title}</p>
      </div>
      <a className="link-btn" href={hrefFor('memory', memory.id)}>
        View
      </a>
    </article>
  )
}

function MemoryListCard({ memoryIds }: { memoryIds: string[] }) {
  const { state } = useStore()
  const items = memoryIds.map((id) => state.memories.find((m) => m.id === id)).filter((m) => m !== undefined)
  if (!items.length) return <MissingCard text="These memories have since been deleted." />
  return (
    <article className="rich">
      <header className="rich__head">
        <span className="rich__icon" aria-hidden>
          <Brain size={16} />
        </span>
        <span className="rich__kind">From memory</span>
      </header>
      <ul className="rich__list">
        {items.map((m) => {
          const cat = memoryCategories[m.category]
          return (
            <li key={m.id}>
              <cat.icon size={15} aria-hidden />
              <span>
                <strong>{m.title}</strong>
                <span className="muted"> · {cat.label}</span>
              </span>
            </li>
          )
        })}
      </ul>
      <a className="link-btn" href={hrefFor('memory')}>
        Review all memories <ArrowRight size={14} aria-hidden />
      </a>
    </article>
  )
}

function ChecklistCard({ title, items }: { title: string; items: string[] }) {
  const [done, setDone] = useState<boolean[]>(() => items.map(() => false))
  const count = done.filter(Boolean).length
  return (
    <article className="rich rich--checklist">
      <header className="rich__head">
        <span className="rich__icon rich__icon--success" aria-hidden>
          <ListChecks size={16} />
        </span>
        <span className="rich__kind">{title}</span>
        <span className="muted rich__count">
          {count}/{items.length}
        </span>
      </header>
      <ul className="checklist">
        {items.map((item, i) => (
          <li key={item}>
            <label className={cx('checklist__item', done[i] && 'is-done')}>
              <input type="checkbox" checked={done[i]} onChange={() => setDone((d) => d.map((v, j) => (j === i ? !v : v)))} />
              <span className="checklist__box" aria-hidden>
                <Check size={13} />
              </span>
              <span>{item}</span>
            </label>
          </li>
        ))}
      </ul>
    </article>
  )
}

export function RichCardView({ card }: { card: RichCard }) {
  switch (card.kind) {
    case 'mission':
      return <MissionCard missionId={card.missionId} />
    case 'proposal':
      return <ProposalCard proposalId={card.proposalId} />
    case 'memory-saved':
      return <MemorySavedCard memoryId={card.memoryId} />
    case 'memory-list':
      return <MemoryListCard memoryIds={card.memoryIds} />
    case 'checklist':
      return <ChecklistCard title={card.title} items={card.items} />
  }
}
