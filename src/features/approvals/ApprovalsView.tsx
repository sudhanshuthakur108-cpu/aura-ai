import { Check, CircleCheck, Inbox, Pencil, PlugZap, RotateCcw, ShieldCheck, TriangleAlert, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { proposalStatusMeta } from '../../components/ui/status'
import { hrefFor } from '../../lib/useRoute'
import { cx, money, relativeTime } from '../../lib/utils'
import { useStore } from '../../state/AppStore'
import { isLockedToMission } from '../../state/reducer'
import type { ActionProposal, EmailProposal, PurchaseProposal } from '../../types'
import { proposalKindMeta, purchaseTotal, riskMeta } from './meta'
import { demoOutcome } from './outcome'
import { ApproveDialog, EditProposalDialog } from './ProposalDialogs'
import './approvals.css'

type Filter = 'pending' | 'decided' | 'all'

export function ApprovalsView({ proposalId }: { proposalId?: string }) {
  const { state, actions } = useStore()
  const [filter, setFilter] = useState<Filter>(() => {
    const target = state.proposals.find((p) => p.id === proposalId)
    return target && target.status !== 'pending' ? 'all' : 'pending'
  })
  const [approving, setApproving] = useState<ActionProposal | null>(null)
  const [editing, setEditing] = useState<EmailProposal | PurchaseProposal | null>(null)
  // Cards decided during this visit stay in place so the status change is visible.
  const [justDecided, setJustDecided] = useState<string[]>([])

  const pending = state.proposals.filter((p) => p.status === 'pending')
  const decided = state.proposals.filter((p) => p.status !== 'pending')
  const visible = useMemo(() => {
    const list =
      filter === 'pending'
        ? state.proposals.filter((p) => p.status === 'pending' || justDecided.includes(p.id))
        : filter === 'decided'
          ? decided
          : state.proposals
    return [...list].sort((a, b) => b.createdAt - a.createdAt)
  }, [filter, decided, state.proposals, justDecided])

  const decide = (id: string, decision: 'approved' | 'rejected') => {
    setJustDecided((ids) => [...ids, id])
    void actions.decideProposal(id, decision)
  }

  return (
    <div className="page approvals-page">
      <header className="page-header">
        <div>
          <h1>Approvals</h1>
          <p>Anything that would act outside this app waits here. You see exactly what would happen first — silence is never a yes.</p>
        </div>
      </header>

      <p className="notice approvals-notice">
        <ShieldCheck size={16} aria-hidden />
        <span>
          <strong>Demo boundary.</strong> Approving records your decision in this tab only. No email is sent, no payment is made and no third party is contacted — no integrations are connected.
        </span>
      </p>

      <div className="segmented approvals-filter" role="group" aria-label="Filter proposals">
        <button type="button" aria-pressed={filter === 'pending'} onClick={() => setFilter('pending')}>
          Awaiting review <span className="count">{pending.length}</span>
        </button>
        <button type="button" aria-pressed={filter === 'decided'} onClick={() => setFilter('decided')}>
          Decided <span className="count">{decided.length}</span>
        </button>
        <button type="button" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>
          All <span className="count">{state.proposals.length}</span>
        </button>
      </div>

      {visible.length === 0 ? (
        <div className="card">
          <EmptyState icon={filter === 'pending' ? CircleCheck : Inbox} title={filter === 'pending' ? 'You’re all caught up' : 'Nothing here yet'}>
            {filter === 'pending' ? 'New proposals from chats and missions will appear here for review.' : 'Decisions you make will be listed here.'}
          </EmptyState>
        </div>
      ) : (
        <ul className="proposal-list">
          {visible.map((p) => (
            <li key={p.id}>
              <ProposalCard
                proposal={p}
                highlighted={p.id === proposalId}
                locked={isLockedToMission(state, p.id)}
                onApprove={() => setApproving(p)}
                onReject={() => decide(p.id, 'rejected')}
                onEdit={p.kind === 'external' ? undefined : () => setEditing(p)}
                onReopen={() => actions.reopenProposal(p.id)}
              />
            </li>
          ))}
        </ul>
      )}

      <ApproveDialog
        proposal={approving}
        onClose={() => setApproving(null)}
        onApprove={() => {
          if (approving) decide(approving.id, 'approved')
        }}
      />
      <EditProposalDialog
        proposal={editing}
        onClose={() => setEditing(null)}
        onSave={(patch) => {
          if (editing) actions.updateProposal(editing.id, patch as Partial<ActionProposal>)
          setEditing(null)
        }}
      />
    </div>
  )
}

interface ProposalCardProps {
  proposal: ActionProposal
  highlighted: boolean
  locked: boolean
  onApprove: () => void
  onReject: () => void
  onEdit?: () => void
  onReopen: () => void
}

function ProposalCard({ proposal: p, highlighted, locked, onApprove, onReject, onEdit, onReopen }: ProposalCardProps) {
  const ref = useRef<HTMLElement>(null)
  const kind = proposalKindMeta[p.kind]
  const status = proposalStatusMeta[p.status]
  const risk = riskMeta[p.risk]

  useEffect(() => {
    if (highlighted && ref.current) {
      ref.current.scrollIntoView({ block: 'start', behavior: 'smooth' })
      ref.current.focus({ preventScroll: true })
    }
  }, [highlighted])

  return (
    <article ref={ref} tabIndex={-1} className={cx('proposal card', `proposal--${p.status}`, highlighted && 'proposal--highlight')} aria-labelledby={`${p.id}-title`}>
      <header className="proposal__head">
        <span className="proposal__icon" aria-hidden>
          <kind.icon size={18} />
        </span>
        <div className="proposal__heading">
          <p className="proposal__kind">
            {kind.label} ·{' '}
            {p.origin.missionId ? (
              <a href={hrefFor('missions', p.origin.missionId)}>{p.origin.label}</a>
            ) : p.origin.threadId ? (
              <a href={hrefFor('chat', p.origin.threadId)}>{p.origin.label}</a>
            ) : (
              p.origin.label
            )}
          </p>
          <h2 id={`${p.id}-title`} className="proposal__title">
            {p.title}
          </h2>
        </div>
        <div className="proposal__badges">
          <Badge tone={status.tone} icon={status.icon}>
            {status.label}
          </Badge>
          <Badge tone={risk.tone}>{risk.label}</Badge>
        </div>
      </header>

      <p className="proposal__summary">{p.summary}</p>

      <div className="proposal__grid">
        <section className="proposal__section">
          <h3 className="eyebrow">What would happen</h3>
          <ol className="will-list">
            {p.willHappen.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ol>
          <h3 className="eyebrow proposal__subhead">Consequences</h3>
          <ul className="consequence-list">
            {p.consequences.map((c) => (
              <li key={c}>
                <TriangleAlert size={14} aria-hidden /> {c}
              </li>
            ))}
          </ul>
        </section>
        <section className="proposal__section proposal__details">
          <h3 className="eyebrow">
            Details {p.edited && <Badge tone="accent">Edited by you</Badge>}
          </h3>
          <ProposalDetails proposal={p} />
        </section>
      </div>

      <footer className="proposal__footer">
        {p.status === 'pending' ? (
          <>
            {onEdit && (
              <Button variant="ghost" icon={Pencil} onClick={onEdit}>
                {p.kind === 'email' ? 'Edit draft' : 'Edit order'}
              </Button>
            )}
            <span className="spacer" />
            <Button variant="danger" icon={X} onClick={onReject}>
              Reject
            </Button>
            <Button variant="primary" icon={Check} onClick={onApprove}>
              Review &amp; approve
            </Button>
          </>
        ) : (
          <>
            <p className="proposal__outcome">
              {p.status === 'approved' && `Approved by you. ${demoOutcome(p)}`}
              {p.status === 'rejected' && 'Rejected. Nothing will happen.'}
              {p.status === 'withdrawn' && 'Withdrawn because its mission was cancelled. Nothing will happen.'}
              {p.decidedAt && <span className="muted"> · {relativeTime(p.decidedAt)}</span>}
            </p>
            {(p.status === 'approved' || p.status === 'rejected') && !locked && (
              <Button size="sm" variant="ghost" icon={RotateCcw} onClick={onReopen}>
                Move back to review
              </Button>
            )}
          </>
        )}
      </footer>
    </article>
  )
}

function ProposalDetails({ proposal: p }: { proposal: ActionProposal }) {
  switch (p.kind) {
    case 'email':
      return (
        <div className="mail-preview">
          <dl className="kv">
            <div>
              <dt>From</dt>
              <dd>{p.from}</dd>
            </div>
            <div>
              <dt>To</dt>
              <dd>{p.to.join(', ')}</dd>
            </div>
            {p.cc.length > 0 && (
              <div>
                <dt>Cc</dt>
                <dd>{p.cc.join(', ')}</dd>
              </div>
            )}
            <div>
              <dt>Subject</dt>
              <dd>{p.subject}</dd>
            </div>
          </dl>
          <div className="mail-preview__body">{p.body}</div>
        </div>
      )
    case 'purchase':
      return (
        <div className="stack-3">
          <dl className="kv">
            <div>
              <dt>Merchant</dt>
              <dd>{p.merchant}</dd>
            </div>
          </dl>
          <ul className="line-items">
            {p.items.map((i) => (
              <li key={i.name}>
                <span>
                  {i.quantity} × {i.name}
                </span>
                <span>{money(i.unitPrice * i.quantity, p.currency)}</span>
              </li>
            ))}
            <li>
              <span>Shipping</span>
              <span>{p.shipping ? money(p.shipping, p.currency) : 'Free'}</span>
            </li>
            <li className="line-items__total">
              <span>Total</span>
              <span>{money(purchaseTotal(p), p.currency)}</span>
            </li>
          </ul>
          <dl className="kv">
            <div>
              <dt>Payment</dt>
              <dd>{p.paymentLabel}</dd>
            </div>
            <div>
              <dt>Delivery</dt>
              <dd>{p.delivery}</dd>
            </div>
            <div>
              <dt>Returns</dt>
              <dd>{p.returnPolicy}</dd>
            </div>
          </dl>
        </div>
      )
    case 'external':
      return (
        <div className="stack-3">
          <dl className="kv">
            <div>
              <dt>Service</dt>
              <dd>
                {p.service}{' '}
                <Badge tone="muted" icon={PlugZap}>
                  Not connected
                </Badge>
              </dd>
            </div>
            <div>
              <dt>Action</dt>
              <dd>{p.operation}</dd>
            </div>
            <div>
              <dt>Destination</dt>
              <dd>{p.destination}</dd>
            </div>
            <div>
              <dt>Permissions</dt>
              <dd>{p.permissions.join(', ')}</dd>
            </div>
            <div>
              <dt>Data shared</dt>
              <dd>{p.dataShared.join(', ')}</dd>
            </div>
          </dl>
        </div>
      )
  }
}
