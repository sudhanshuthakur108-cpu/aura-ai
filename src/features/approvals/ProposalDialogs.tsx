import { FlaskConical, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog, Dialog } from '../../components/ui/Dialog'
import { money } from '../../lib/utils'
import type { ActionProposal, EmailProposal, PurchaseProposal } from '../../types'
import { purchaseTotal } from './meta'

/** One plain sentence stating exactly what approval would authorise. */
export function exactAction(p: ActionProposal) {
  switch (p.kind) {
    case 'email':
      return `Send “${p.subject}” to ${p.to.join(', ')}${p.cc.length ? ` (cc ${p.cc.join(', ')})` : ''} from ${p.from}.`
    case 'purchase':
      return `Pay ${money(purchaseTotal(p), p.currency)} to ${p.merchant} using ${p.paymentLabel}.`
    case 'external':
      return `${p.operation} in ${p.service} (${p.destination}).`
  }
}

interface ApproveDialogProps {
  proposal: ActionProposal | null
  onClose: () => void
  onApprove: () => void
}

export function ApproveDialog({ proposal, onClose, onApprove }: ApproveDialogProps) {
  if (!proposal) return <ConfirmDialog open={false} onClose={onClose} onConfirm={onApprove} title="" confirmLabel="" />
  const ack =
    proposal.risk === 'high'
      ? proposal.kind === 'purchase'
        ? `I understand that in a live system this would charge ${money(purchaseTotal(proposal), proposal.currency)}.`
        : 'I understand this action would be hard to undo in a live system.'
      : undefined
  return (
    <ConfirmDialog open onClose={onClose} onConfirm={onApprove} title="Approve this action?" confirmLabel="Approve (demo)" tone="primary" acknowledgement={ack}>
      <div className="approve-summary">
        <p className="eyebrow">You are approving</p>
        <p className="approve-summary__action">{exactAction(proposal)}</p>
      </div>
      <div className="stack-2">
        <p className="eyebrow">Consequences</p>
        <ul className="consequence-list">
          {proposal.consequences.map((c) => (
            <li key={c}>
              <TriangleAlert size={14} aria-hidden /> {c}
            </li>
          ))}
        </ul>
      </div>
      <p className="notice">
        <FlaskConical size={16} aria-hidden />
        <span>
          <strong>Demo only.</strong> Approving records your decision in this tab. Nothing will actually be sent, bought or shared.
        </span>
      </p>
    </ConfirmDialog>
  )
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const splitList = (s: string) =>
  s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)

interface EditDialogProps {
  proposal: EmailProposal | PurchaseProposal | null
  onClose: () => void
  onSave: (patch: Partial<EmailProposal> | Partial<PurchaseProposal>) => void
}

export function EditProposalDialog({ proposal, onClose, onSave }: EditDialogProps) {
  return (
    <Dialog
      open={Boolean(proposal)}
      onClose={onClose}
      title={proposal?.kind === 'email' ? 'Edit email draft' : 'Edit order'}
      description="Changes stay in this demo. You’ll still need to approve before anything would happen."
      size="lg"
    >
      {proposal?.kind === 'email' && <EmailForm key={proposal.id} proposal={proposal} onCancel={onClose} onSave={onSave} />}
      {proposal?.kind === 'purchase' && <PurchaseForm key={proposal.id} proposal={proposal} onCancel={onClose} onSave={onSave} />}
    </Dialog>
  )
}

function EmailForm({ proposal, onCancel, onSave }: { proposal: EmailProposal; onCancel: () => void; onSave: EditDialogProps['onSave'] }) {
  const [to, setTo] = useState(proposal.to.join(', '))
  const [cc, setCc] = useState(proposal.cc.join(', '))
  const [subject, setSubject] = useState(proposal.subject)
  const [body, setBody] = useState(proposal.body)
  const [touched, setTouched] = useState(false)

  const toList = splitList(to)
  const ccList = splitList(cc)
  const errors = {
    to: toList.length === 0 ? 'Add at least one recipient.' : toList.some((e) => !EMAIL_RE.test(e)) ? 'Check the recipient addresses.' : '',
    cc: ccList.some((e) => !EMAIL_RE.test(e)) ? 'Check the cc addresses.' : '',
    subject: subject.trim() ? '' : 'Add a subject.',
    body: body.trim() ? '' : 'The email body can’t be empty.',
  }
  const invalid = Object.values(errors).some(Boolean)
  const err = (k: keyof typeof errors) =>
    touched && errors[k] ? (
      <p className="field__error" id={`email-${k}-err`}>
        {errors[k]}
      </p>
    ) : null

  return (
    <form
      className="stack-4"
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        setTouched(true)
        if (!invalid) onSave({ to: toList, cc: ccList, subject: subject.trim(), body })
      }}
    >
      <div className="field">
        <label className="field__label" htmlFor="email-to">
          To
        </label>
        <input id="email-to" className="input" value={to} onChange={(e) => setTo(e.target.value)} aria-invalid={touched && Boolean(errors.to)} />
        {err('to')}
      </div>
      <div className="field">
        <label className="field__label" htmlFor="email-cc">
          Cc <span className="muted">(optional, comma separated)</span>
        </label>
        <input id="email-cc" className="input" value={cc} onChange={(e) => setCc(e.target.value)} aria-invalid={touched && Boolean(errors.cc)} />
        {err('cc')}
      </div>
      <div className="field">
        <label className="field__label" htmlFor="email-subject">
          Subject
        </label>
        <input id="email-subject" className="input" value={subject} onChange={(e) => setSubject(e.target.value)} aria-invalid={touched && Boolean(errors.subject)} />
        {err('subject')}
      </div>
      <div className="field">
        <label className="field__label" htmlFor="email-body">
          Message
        </label>
        <textarea id="email-body" className="textarea email-body-input" value={body} onChange={(e) => setBody(e.target.value)} aria-invalid={touched && Boolean(errors.body)} />
        {err('body')}
      </div>
      <div className="row row--between form-actions">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary">
          Save draft
        </Button>
      </div>
    </form>
  )
}

function PurchaseForm({ proposal, onCancel, onSave }: { proposal: PurchaseProposal; onCancel: () => void; onSave: EditDialogProps['onSave'] }) {
  const [qty, setQty] = useState(proposal.items.map((i) => i.quantity))
  const items = proposal.items.map((item, i) => ({ ...item, quantity: qty[i] }))
  const total = purchaseTotal({ ...proposal, items })
  return (
    <form
      className="stack-4"
      onSubmit={(e) => {
        e.preventDefault()
        onSave({ items })
      }}
    >
      {proposal.items.map((item, i) => (
        <div key={item.name} className="field">
          <label className="field__label" htmlFor={`qty-${i}`}>
            Quantity · {item.name}
          </label>
          <select id={`qty-${i}`} className="select" value={qty[i]} onChange={(e) => setQty((q) => q.map((v, j) => (j === i ? Number(e.target.value) : v)))}>
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>
                {n} × {money(item.unitPrice, proposal.currency)}
              </option>
            ))}
          </select>
        </div>
      ))}
      <p className="purchase-total">
        New total <strong>{money(total, proposal.currency)}</strong>
      </p>
      <div className="row row--between form-actions">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary">
          Save order
        </Button>
      </div>
    </form>
  )
}
