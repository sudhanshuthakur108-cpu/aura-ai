/* Domain types shared by demo data, state and UI. A future backend should map
   its payloads onto these shapes so views do not need to change. */

export type CompanionMood = 'idle' | 'listening' | 'thinking' | 'speaking' | 'celebrating'

/* ---------- Chat ---------- */

export type Role = 'user' | 'assistant'

export type RichCard =
  | { kind: 'mission'; missionId: string }
  | { kind: 'proposal'; proposalId: string }
  | { kind: 'memory-saved'; memoryId: string }
  | { kind: 'memory-list'; memoryIds: string[] }
  | { kind: 'checklist'; title: string; items: string[] }

export interface Message {
  id: string
  threadId: string
  role: Role
  text: string
  createdAt: number
  cards?: RichCard[]
  followUps?: string[]
  /** `error` marks a user message whose reply failed; the UI offers a retry. */
  status?: 'sent' | 'error'
  error?: string
}

export interface Thread {
  id: string
  title: string
  createdAt: number
  updatedAt: number
}

/* ---------- Memory ---------- */

export type MemoryCategory = 'preference' | 'context' | 'goal' | 'fact'

export type MemorySource =
  | { type: 'user' }
  | { type: 'chat'; threadId: string }
  | { type: 'seed' }

export interface Memory {
  id: string
  category: MemoryCategory
  title: string
  detail: string
  tags: string[]
  source: MemorySource
  createdAt: number
  updatedAt: number
}

/* ---------- Missions ---------- */

export type StepStatus = 'pending' | 'running' | 'completed' | 'blocked' | 'cancelled'
export type MissionStatus = 'ready' | 'running' | 'paused' | 'blocked' | 'completed' | 'cancelled'
export type StepTool = 'search' | 'read' | 'analyze' | 'draft' | 'approval' | 'input'

export interface MissionStep {
  id: string
  title: string
  detail: string
  tool: StepTool
  status: StepStatus
  /** Simulated duration of the step in the local demo engine. */
  durationMs: number
  elapsedMs: number
  /** Activity line logged when the step completes. */
  resultNote?: string
  /** Shown while blocked, e.g. waiting for approval or missing input. */
  blockedReason?: string
  /** For `approval` steps: the proposal this step raises and waits on. */
  proposal?: ActionProposal
}

export interface ActivityEntry {
  id: string
  at: number
  kind: 'info' | 'tool' | 'source' | 'warning' | 'result' | 'user'
  text: string
}

export interface SourceCard {
  id: string
  title: string
  publisher: string
  domain: string
  kind: 'review' | 'article' | 'dataset' | 'guide' | 'forum'
  excerpt: string
  /** Step whose completion reveals this source. */
  revealedByStepId: string
}

export interface Deliverable {
  title: string
  summary: string
  sections: { heading: string; body?: string; bullets?: string[] }[]
  table?: { columns: string[]; rows: string[][] }
}

export interface Mission {
  id: string
  title: string
  objective: string
  status: MissionStatus
  createdAt: number
  updatedAt: number
  steps: MissionStep[]
  sources: SourceCard[]
  activity: ActivityEntry[]
  deliverable: Deliverable
  /** True for missions built from the generic template (no curated findings). */
  templated?: boolean
}

/* ---------- Action proposals ---------- */

/** `withdrawn`: the mission that raised it was cancelled before you decided. */
export type ProposalStatus = 'pending' | 'approved' | 'rejected' | 'withdrawn'
export type RiskLevel = 'low' | 'medium' | 'high'

interface ProposalBase {
  id: string
  title: string
  summary: string
  status: ProposalStatus
  risk: RiskLevel
  createdAt: number
  decidedAt?: number
  /** What a live system would do if this were approved. */
  willHappen: string[]
  consequences: string[]
  origin: { label: string; missionId?: string; threadId?: string }
  edited?: boolean
}

export interface EmailProposal extends ProposalBase {
  kind: 'email'
  from: string
  to: string[]
  cc: string[]
  subject: string
  body: string
}

export interface PurchaseProposal extends ProposalBase {
  kind: 'purchase'
  merchant: string
  items: { name: string; quantity: number; unitPrice: number }[]
  currency: string
  shipping: number
  paymentLabel: string
  delivery: string
  returnPolicy: string
}

export interface ExternalProposal extends ProposalBase {
  kind: 'external'
  service: string
  operation: string
  destination: string
  permissions: string[]
  dataShared: string[]
}

export type ActionProposal = EmailProposal | PurchaseProposal | ExternalProposal

/* ---------- Settings ---------- */

export type CompanionStyle = 'lumen' | 'ember' | 'tide'
export type Tone = 'warm' | 'balanced' | 'direct'
export type ThemeName = 'ink' | 'plum' | 'midnight'
export type MotionPref = 'system' | 'reduced' | 'full'

export interface Settings {
  preferredName: string
  companionName: string
  companionStyle: CompanionStyle
  showHalo: boolean
  tone: Tone
  verbosity: 'concise' | 'detailed'
  theme: ThemeName
  motion: MotionPref
  memoryCapture: boolean
}
