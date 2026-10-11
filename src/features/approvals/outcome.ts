import type { ActionProposal } from '../../types'

/** Plain statement of what did NOT happen after a demo approval. Never implies
    that an email was sent, a payment made or an external system changed. */
export function demoOutcome(p: ActionProposal) {
  switch (p.kind) {
    case 'email':
      return 'Demo only — no email was sent.'
    case 'purchase':
      return 'Demo only — no order was placed and no payment was made.'
    case 'external':
      return `Demo only — nothing was changed in ${p.service}.`
  }
}
