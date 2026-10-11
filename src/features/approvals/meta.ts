import { CreditCard, Globe, Mail, type LucideIcon } from 'lucide-react'
import type { ActionProposal, PurchaseProposal, RiskLevel } from '../../types'
import type { Tone } from '../../components/ui/Badge'

export const proposalKindMeta: Record<ActionProposal['kind'], { label: string; icon: LucideIcon }> = {
  email: { label: 'Email', icon: Mail },
  purchase: { label: 'Purchase', icon: CreditCard },
  external: { label: 'External action', icon: Globe },
}

export const riskMeta: Record<RiskLevel, { label: string; tone: Tone }> = {
  low: { label: 'Low impact', tone: 'info' },
  medium: { label: 'Medium impact', tone: 'warning' },
  high: { label: 'High impact', tone: 'danger' },
}

export function purchaseTotal(p: PurchaseProposal) {
  return p.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0) + p.shipping
}
