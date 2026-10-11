import type { ActionProposal, Memory, MemoryCategory, Message, Mission, RichCard, Settings } from '../types'

/* Service seams. The UI only talks to these interfaces; `services/index.ts`
   wires in the demo implementations. A future backend replaces those
   implementations without touching views or the store. */

export interface ChatRequest {
  text: string
  threadId: string
  /** 1 for a first send, 2+ for retries. */
  attempt: number
  history: Message[]
  context: {
    settings: Settings
    memories: Memory[]
    missions: Mission[]
    proposals: ActionProposal[]
  }
}

export interface ChatReply {
  text: string
  cards?: RichCard[]
  followUps?: string[]
  /** The store saves this (if memory capture is on) and attaches a card. */
  memoryToSave?: { category: MemoryCategory; title: string; detail: string; tags: string[] }
}

export interface ChatService {
  /** Human-readable description shown in the UI, e.g. "Scripted demo responder". */
  readonly label: string
  respond(request: ChatRequest): Promise<ChatReply>
}

export interface ActionDecisionResult {
  /** Whether anything happened outside this browser tab. Always false in the demo. */
  executedExternally: boolean
  note: string
}

/** Where approved actions would be handed to real integrations (email, payments,
    calendar…). The demo implementation never performs external work. */
export interface ActionGateway {
  approve(proposal: ActionProposal): Promise<ActionDecisionResult>
  reject(proposal: ActionProposal): Promise<ActionDecisionResult>
}
