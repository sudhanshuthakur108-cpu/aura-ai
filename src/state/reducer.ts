import { brand } from '../config/brand'
import { seedMemories } from '../data/demo/memories'
import { seedMissions } from '../data/demo/missions'
import { seedProposals } from '../data/demo/proposals'
import { seedThreads } from '../data/demo/threads'
import type { ActionProposal, Memory, Message, Mission, Settings, Thread } from '../types'
import {
  advanceMission,
  cancelMission,
  pauseMission,
  resolveApproval,
  restartMission,
  resumeMission,
  skipBlockedStep,
  startMission,
  type EngineResult,
} from './missionEngine'

export interface AppState {
  threads: Thread[]
  messages: Message[]
  memories: Memory[]
  missions: Mission[]
  proposals: ActionProposal[]
  settings: Settings
  /** Thread currently waiting on a reply, if any. */
  replyingTo: string | null
}

export const defaultSettings: Settings = {
  preferredName: 'Alex',
  companionName: brand.companionName,
  companionStyle: 'lumen',
  showHalo: true,
  tone: 'warm',
  verbosity: 'concise',
  theme: 'ink',
  motion: 'system',
  memoryCapture: true,
}

export function createDemoState(now: number, settings: Settings = defaultSettings): AppState {
  const { threads, messages } = seedThreads(now)
  return {
    threads,
    messages,
    memories: seedMemories(now),
    missions: seedMissions(now),
    proposals: seedProposals(now),
    settings,
    replyingTo: null,
  }
}

export type Action =
  | { type: 'thread/create'; thread: Thread }
  | { type: 'thread/rename'; threadId: string; title: string }
  | { type: 'thread/delete'; threadId: string }
  | { type: 'message/add'; message: Message }
  | { type: 'message/status'; messageId: string; status: Message['status']; error?: string }
  | { type: 'reply/start'; threadId: string }
  | { type: 'reply/end' }
  | { type: 'memory/add'; memory: Memory }
  | { type: 'memory/update'; id: string; patch: Partial<Pick<Memory, 'title' | 'detail' | 'category' | 'tags'>>; now: number }
  | { type: 'memory/delete'; id: string }
  | { type: 'memory/clear' }
  | { type: 'mission/create'; mission: Mission }
  | { type: 'mission/start'; id: string; now: number }
  | { type: 'mission/pause'; id: string; now: number }
  | { type: 'mission/resume'; id: string; now: number }
  | { type: 'mission/cancel'; id: string; now: number }
  | { type: 'mission/skip-step'; id: string; stepId: string; now: number }
  | { type: 'mission/restart'; id: string; now: number }
  | { type: 'mission/tick'; dt: number; now: number }
  | { type: 'proposal/update'; id: string; patch: Partial<ActionProposal> }
  | { type: 'proposal/decide'; id: string; decision: 'approved' | 'rejected'; now: number }
  | { type: 'proposal/reopen'; id: string }
  | { type: 'settings/update'; patch: Partial<Settings> }
  | { type: 'demo/reset'; now: number }

function addRaised(proposals: ActionProposal[], raised: ActionProposal[]) {
  if (!raised.length) return proposals
  const ids = new Set(raised.map((p) => p.id))
  return [...raised, ...proposals.filter((p) => !ids.has(p.id))]
}

function applyToMission(state: AppState, id: string, fn: (m: Mission) => EngineResult): AppState {
  let raised: ActionProposal[] = []
  const missions = state.missions.map((m) => {
    if (m.id !== id) return m
    const result = fn(m)
    raised = result.raised
    return result.mission
  })
  return { ...state, missions, proposals: addRaised(state.proposals, raised) }
}

/** True when a proposal is tied to a mission step that has already moved on. */
export function isLockedToMission(state: Pick<AppState, 'missions'>, proposalId: string) {
  return state.missions.some((m) => m.steps.some((s) => s.proposal?.id === proposalId && s.status !== 'blocked'))
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'thread/create':
      return { ...state, threads: [action.thread, ...state.threads] }

    case 'thread/rename':
      return { ...state, threads: state.threads.map((t) => (t.id === action.threadId ? { ...t, title: action.title } : t)) }

    case 'thread/delete':
      return {
        ...state,
        threads: state.threads.filter((t) => t.id !== action.threadId),
        messages: state.messages.filter((m) => m.threadId !== action.threadId),
        replyingTo: state.replyingTo === action.threadId ? null : state.replyingTo,
      }

    case 'message/add': {
      const { message } = action
      if (!state.threads.some((t) => t.id === message.threadId)) return state
      return {
        ...state,
        messages: [...state.messages, message],
        threads: state.threads.map((t) => (t.id === message.threadId ? { ...t, updatedAt: message.createdAt } : t)),
      }
    }

    case 'message/status':
      return {
        ...state,
        messages: state.messages.map((m) => (m.id === action.messageId ? { ...m, status: action.status, error: action.error } : m)),
      }

    case 'reply/start':
      return { ...state, replyingTo: action.threadId }

    case 'reply/end':
      return { ...state, replyingTo: null }

    case 'memory/add':
      return { ...state, memories: [action.memory, ...state.memories] }

    case 'memory/update':
      return {
        ...state,
        memories: state.memories.map((m) => (m.id === action.id ? { ...m, ...action.patch, updatedAt: action.now } : m)),
      }

    case 'memory/delete':
      return { ...state, memories: state.memories.filter((m) => m.id !== action.id) }

    case 'memory/clear':
      return { ...state, memories: [] }

    case 'mission/create':
      return { ...state, missions: [action.mission, ...state.missions] }

    case 'mission/start':
      return applyToMission(state, action.id, (m) => startMission(m, action.now))

    case 'mission/pause':
      return applyToMission(state, action.id, (m) => ({ mission: pauseMission(m, action.now), raised: [] }))

    case 'mission/resume':
      return applyToMission(state, action.id, (m) => ({ mission: resumeMission(m, action.now), raised: [] }))

    case 'mission/skip-step':
      return applyToMission(state, action.id, (m) => skipBlockedStep(m, action.stepId, action.now))

    case 'mission/cancel': {
      let withdraw: string[] = []
      const missions = state.missions.map((m) => {
        if (m.id !== action.id) return m
        const result = cancelMission(m, action.now)
        withdraw = result.withdraw
        return result.mission
      })
      const proposals = state.proposals.map((p) =>
        withdraw.includes(p.id) && p.status === 'pending' ? { ...p, status: 'withdrawn' as const, decidedAt: action.now } : p,
      )
      return { ...state, missions, proposals }
    }

    case 'mission/restart': {
      let remove: string[] = []
      const missions = state.missions.map((m) => {
        if (m.id !== action.id) return m
        const result = restartMission(m, action.now)
        remove = result.removeProposals
        return result.mission
      })
      return { ...state, missions, proposals: state.proposals.filter((p) => !remove.includes(p.id)) }
    }

    case 'mission/tick': {
      if (!state.missions.some((m) => m.status === 'running')) return state
      let raised: ActionProposal[] = []
      const missions = state.missions.map((m) => {
        if (m.status !== 'running') return m
        const result = advanceMission(m, action.dt, action.now)
        raised = [...raised, ...result.raised]
        return result.mission
      })
      return { ...state, missions, proposals: addRaised(state.proposals, raised) }
    }

    case 'proposal/update':
      return {
        ...state,
        proposals: state.proposals.map((p) =>
          p.id === action.id && p.status === 'pending' ? ({ ...p, ...action.patch, edited: true } as ActionProposal) : p,
        ),
      }

    case 'proposal/decide': {
      const target = state.proposals.find((p) => p.id === action.id)
      if (!target || target.status !== 'pending') return state
      const proposals = state.proposals.map((p) =>
        p.id === action.id ? { ...p, status: action.decision, decidedAt: action.now } : p,
      )
      let raised: ActionProposal[] = []
      const missions = state.missions.map((m) => {
        const result = resolveApproval(m, action.id, action.decision, action.now)
        raised = [...raised, ...result.raised]
        return result.mission
      })
      return { ...state, proposals: addRaised(proposals, raised), missions }
    }

    case 'proposal/reopen': {
      if (isLockedToMission(state, action.id)) return state
      return {
        ...state,
        proposals: state.proposals.map((p) =>
          p.id === action.id && (p.status === 'approved' || p.status === 'rejected') ? { ...p, status: 'pending', decidedAt: undefined } : p,
        ),
      }
    }

    case 'settings/update':
      return { ...state, settings: { ...state.settings, ...action.patch } }

    case 'demo/reset':
      return createDemoState(action.now, state.settings)
  }
}
