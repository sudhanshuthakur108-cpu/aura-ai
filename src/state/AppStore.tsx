import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react'
import { templateMission } from '../data/demo/missions'
import { threadTitleFrom, uid } from '../lib/utils'
import { services } from '../services'
import type { ActionProposal, CompanionMood, Memory, Message, Settings } from '../types'
import { useToast } from '../components/ui/Toast'
import { createDemoState, reducer, type AppState } from './reducer'

interface Actions {
  /** Sends a message, creating a thread when `threadId` is null. Returns the thread id. */
  sendMessage: (threadId: string | null, text: string) => string
  retryMessage: (messageId: string) => void
  createThread: () => string
  deleteThread: (threadId: string) => void
  addMemory: (input: Pick<Memory, 'category' | 'title' | 'detail' | 'tags'>) => void
  updateMemory: (id: string, patch: Pick<Memory, 'category' | 'title' | 'detail' | 'tags'>) => void
  deleteMemory: (id: string) => void
  clearMemories: () => void
  createMission: (objective: string) => string
  startMission: (id: string) => void
  pauseMission: (id: string) => void
  resumeMission: (id: string) => void
  cancelMission: (id: string) => void
  skipStep: (missionId: string, stepId: string) => void
  restartMission: (id: string) => void
  updateProposal: (id: string, patch: Partial<ActionProposal>) => void
  decideProposal: (id: string, decision: 'approved' | 'rejected') => Promise<void>
  reopenProposal: (id: string) => void
  updateSettings: (patch: Partial<Settings>) => void
  resetDemo: () => void
  setListening: (listening: boolean) => void
}

interface Store {
  state: AppState
  actions: Actions
  mood: CompanionMood
  responderLabel: string
  /** The conversation currently shown on Home (null = a fresh start). */
  homeThreadId: string | null
  setHomeThreadId: (id: string | null) => void
}

const StoreContext = createContext<Store | null>(null)

export function useStore() {
  const store = useContext(StoreContext)
  if (!store) throw new Error('useStore must be used inside <AppStoreProvider>')
  return store
}

const TICK_MS = 250

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => createDemoState(Date.now()))
  const toast = useToast()
  const stateRef = useRef(state)
  stateRef.current = state

  const [homeThreadId, setHomeThreadId] = useState<string | null>(null)

  /* ---------- Companion mood (demo states driven by UI events) ---------- */
  const [listening, setListening] = useState(false)
  const [transient, setTransient] = useState<{ mood: 'speaking' | 'celebrating' } | null>(null)
  const transientTimer = useRef<number | undefined>(undefined)

  const flash = useCallback((mood: 'speaking' | 'celebrating', ms: number) => {
    window.clearTimeout(transientTimer.current)
    setTransient({ mood })
    transientTimer.current = window.setTimeout(() => setTransient(null), ms)
  }, [])

  useEffect(() => () => window.clearTimeout(transientTimer.current), [])

  const mood: CompanionMood =
    transient?.mood === 'celebrating'
      ? 'celebrating'
      : state.replyingTo
        ? 'thinking'
        : transient?.mood === 'speaking'
          ? 'speaking'
          : listening
            ? 'listening'
            : 'idle'

  /* ---------- Mission ticker: only runs while a mission is running ---------- */
  const anyRunning = state.missions.some((m) => m.status === 'running')
  useEffect(() => {
    if (!anyRunning) return
    let last = Date.now()
    const id = window.setInterval(() => {
      const now = Date.now()
      dispatch({ type: 'mission/tick', dt: now - last, now })
      last = now
    }, TICK_MS)
    return () => window.clearInterval(id)
  }, [anyRunning])

  // Celebrate when a mission finishes.
  const completedCount = state.missions.filter((m) => m.status === 'completed').length
  const prevCompleted = useRef(completedCount)
  useEffect(() => {
    if (completedCount > prevCompleted.current) {
      flash('celebrating', 2400)
      toast({ tone: 'success', title: 'Mission complete', body: 'The deliverable is ready to review in Missions.' })
    }
    prevCompleted.current = completedCount
  }, [completedCount, flash, toast])

  // Tell the user when a running mission raises something for approval.
  const pendingKey = state.proposals.filter((p) => p.status === 'pending').map((p) => p.id).join('|')
  const prevPending = useRef(new Set(pendingKey.split('|')))
  useEffect(() => {
    const ids = pendingKey.split('|').filter(Boolean)
    const fresh = stateRef.current.proposals.filter((p) => ids.includes(p.id) && !prevPending.current.has(p.id))
    fresh.forEach((p) => toast({ tone: 'info', title: 'Needs your approval', body: p.title }))
    prevPending.current = new Set(ids)
  }, [pendingKey, toast])

  /* ---------- Chat ---------- */
  const requestReply = useCallback(
    async (threadId: string, userMessage: Message, attempt: number) => {
      dispatch({ type: 'reply/start', threadId })
      const s = stateRef.current
      try {
        const reply = await services.chat.respond({
          text: userMessage.text,
          threadId,
          attempt,
          history: s.messages.filter((m) => m.threadId === threadId),
          context: { settings: s.settings, memories: s.memories, missions: s.missions, proposals: s.proposals },
        })
        const cards = [...(reply.cards ?? [])]
        let saved = false
        if (reply.memoryToSave && stateRef.current.settings.memoryCapture) {
          const now = Date.now()
          const memory: Memory = { ...reply.memoryToSave, id: uid('mem'), source: { type: 'chat', threadId }, createdAt: now, updatedAt: now }
          dispatch({ type: 'memory/add', memory })
          cards.push({ kind: 'memory-saved', memoryId: memory.id })
          saved = true
        }
        dispatch({
          type: 'message/add',
          message: { id: uid('msg'), threadId, role: 'assistant', text: reply.text, cards, followUps: reply.followUps, createdAt: Date.now() },
        })
        dispatch({ type: 'reply/end' })
        if (saved) flash('celebrating', 2000)
        else flash('speaking', Math.min(1200 + reply.text.length * 18, 3600))
      } catch (err) {
        dispatch({ type: 'reply/end' })
        dispatch({
          type: 'message/status',
          messageId: userMessage.id,
          status: 'error',
          error: err instanceof Error ? err.message : 'Something went wrong while generating a reply.',
        })
      }
    },
    [flash],
  )

  const createThread = useCallback(() => {
    // Reuse an untouched conversation instead of piling up empty ones.
    const s = stateRef.current
    const empty = s.threads.find((t) => !s.messages.some((m) => m.threadId === t.id))
    if (empty) return empty.id
    const now = Date.now()
    const id = uid('t')
    dispatch({ type: 'thread/create', thread: { id, title: 'New conversation', createdAt: now, updatedAt: now } })
    return id
  }, [])

  const sendMessage = useCallback(
    (threadId: string | null, text: string) => {
      const trimmed = text.trim()
      const now = Date.now()
      let id = threadId
      if (!id) {
        id = uid('t')
        dispatch({ type: 'thread/create', thread: { id, title: threadTitleFrom(trimmed), createdAt: now, updatedAt: now } })
      } else {
        const thread = stateRef.current.threads.find((t) => t.id === id)
        const isEmpty = !stateRef.current.messages.some((m) => m.threadId === id)
        if (thread && isEmpty) {
          // The first message names the thread.
          dispatch({ type: 'thread/rename', threadId: id, title: threadTitleFrom(trimmed) })
        }
      }
      const message: Message = { id: uid('msg'), threadId: id, role: 'user', text: trimmed, createdAt: now, status: 'sent' }
      dispatch({ type: 'message/add', message })
      void requestReply(id, message, 1)
      return id
    },
    [requestReply],
  )

  const retryMessage = useCallback(
    (messageId: string) => {
      const message = stateRef.current.messages.find((m) => m.id === messageId)
      if (!message || stateRef.current.replyingTo) return
      dispatch({ type: 'message/status', messageId, status: 'sent' })
      void requestReply(message.threadId, message, 2)
    },
    [requestReply],
  )

  const actions = useMemo<Actions>(
    () => ({
      sendMessage,
      retryMessage,
      createThread,
      deleteThread: (threadId) => dispatch({ type: 'thread/delete', threadId }),
      addMemory: (input) => {
        const now = Date.now()
        dispatch({ type: 'memory/add', memory: { ...input, id: uid('mem'), source: { type: 'user' }, createdAt: now, updatedAt: now } })
      },
      updateMemory: (id, patch) => dispatch({ type: 'memory/update', id, patch, now: Date.now() }),
      deleteMemory: (id) => dispatch({ type: 'memory/delete', id }),
      clearMemories: () => dispatch({ type: 'memory/clear' }),
      createMission: (objective) => {
        const id = uid('m')
        dispatch({ type: 'mission/create', mission: templateMission(id, objective.trim(), Date.now()) })
        return id
      },
      startMission: (id) => dispatch({ type: 'mission/start', id, now: Date.now() }),
      pauseMission: (id) => dispatch({ type: 'mission/pause', id, now: Date.now() }),
      resumeMission: (id) => dispatch({ type: 'mission/resume', id, now: Date.now() }),
      cancelMission: (id) => dispatch({ type: 'mission/cancel', id, now: Date.now() }),
      skipStep: (missionId, stepId) => dispatch({ type: 'mission/skip-step', id: missionId, stepId, now: Date.now() }),
      restartMission: (id) => dispatch({ type: 'mission/restart', id, now: Date.now() }),
      updateProposal: (id, patch) => dispatch({ type: 'proposal/update', id, patch }),
      decideProposal: async (id, decision) => {
        const proposal = stateRef.current.proposals.find((p) => p.id === id)
        if (!proposal || proposal.status !== 'pending') return
        const result = decision === 'approved' ? await services.actions.approve(proposal) : await services.actions.reject(proposal)
        dispatch({ type: 'proposal/decide', id, decision, now: Date.now() })
        if (decision === 'approved') flash('celebrating', 1800)
        toast({ tone: decision === 'approved' ? 'success' : 'info', title: decision === 'approved' ? 'Approved (demo)' : 'Rejected', body: result.note })
      },
      reopenProposal: (id) => dispatch({ type: 'proposal/reopen', id }),
      updateSettings: (patch) => dispatch({ type: 'settings/update', patch }),
      resetDemo: () => dispatch({ type: 'demo/reset', now: Date.now() }),
      setListening,
    }),
    [sendMessage, retryMessage, createThread, flash, toast],
  )

  // Forget the Home conversation if it was deleted or the demo was reset.
  const liveHomeThread = homeThreadId && state.threads.some((t) => t.id === homeThreadId) ? homeThreadId : null

  const value = useMemo<Store>(
    () => ({ state, actions, mood, responderLabel: services.chat.label, homeThreadId: liveHomeThread, setHomeThreadId }),
    [state, actions, mood, liveHomeThread],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}
