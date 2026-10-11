import type { ActionProposal, ActivityEntry, Mission, MissionStep } from '../types'

/* Pure, local simulation of an agent working through a plan. Nothing here
   searches, reads or contacts anything — steps just advance on a timer. A real
   backend would stream step/activity updates into the same Mission shape. */

export interface EngineResult {
  mission: Mission
  /** Proposals a step raised; the store adds them to the approval center. */
  raised: ActionProposal[]
}

let seq = 0
function entry(missionId: string, now: number, kind: ActivityEntry['kind'], text: string): ActivityEntry {
  seq += 1
  return { id: `${missionId}-act-${now.toString(36)}-${seq.toString(36)}`, at: now, kind, text }
}

function withLog(m: Mission, now: number, ...entries: [ActivityEntry['kind'], string][]): Mission {
  return { ...m, updatedAt: now, activity: [...m.activity, ...entries.map(([k, t]) => entry(m.id, now, k, t))] }
}

function replaceStep(m: Mission, index: number, step: MissionStep): Mission {
  return { ...m, steps: m.steps.map((s, i) => (i === index ? step : s)) }
}

export function startNextStep(m: Mission, now: number): EngineResult {
  const index = m.steps.findIndex((s) => s.status === 'pending')
  if (index === -1) {
    const done = withLog(
      { ...m, status: 'completed' },
      now,
      ['result', m.templated ? 'Mission finished. Placeholder deliverable ready (template plan — no real research).' : 'Mission complete. Deliverable ready.'],
    )
    return { mission: done, raised: [] }
  }
  const step = m.steps[index]
  const started = replaceStep({ ...m, status: 'running' }, index, { ...step, status: 'running', elapsedMs: 0 })
  return { mission: withLog(started, now, ['info', `Started: ${step.title}`]), raised: [] }
}

export function advanceMission(m: Mission, dt: number, now: number): EngineResult {
  if (m.status !== 'running') return { mission: m, raised: [] }
  const index = m.steps.findIndex((s) => s.status === 'running')
  if (index === -1) return startNextStep(m, now)

  const step = m.steps[index]
  const elapsed = step.elapsedMs + dt
  if (elapsed < step.durationMs) {
    return { mission: replaceStep(m, index, { ...step, elapsedMs: elapsed }), raised: [] }
  }

  // Steps that need the user stop here instead of completing.
  if (step.tool === 'approval' || step.tool === 'input') {
    const blocked = replaceStep({ ...m, status: 'blocked' }, index, { ...step, elapsedMs: step.durationMs, status: 'blocked' })
    const raised = step.proposal ? [{ ...step.proposal, status: 'pending' as const, createdAt: now, decidedAt: undefined }] : []
    const note = step.proposal ? `Waiting for your approval: ${step.proposal.title}` : `Blocked: ${step.blockedReason ?? step.title}`
    return { mission: withLog(blocked, now, ['warning', note]), raised }
  }

  const completed = replaceStep(m, index, { ...step, elapsedMs: step.durationMs, status: 'completed' })
  const revealed = m.sources.filter((s) => s.revealedByStepId === step.id)
  const logged = withLog(
    completed,
    now,
    ...(step.resultNote ? [['tool', step.resultNote] as [ActivityEntry['kind'], string]] : []),
    ...revealed.map((s) => ['source', `Source added: ${s.title}`] as [ActivityEntry['kind'], string]),
  )
  return startNextStep(logged, now)
}

export function startMission(m: Mission, now: number): EngineResult {
  if (m.status !== 'ready') return { mission: m, raised: [] }
  return startNextStep(withLog(m, now, ['user', 'Started by you.']), now)
}

export function pauseMission(m: Mission, now: number): Mission {
  if (m.status !== 'running') return m
  return withLog({ ...m, status: 'paused' }, now, ['user', 'Paused by you.'])
}

export function resumeMission(m: Mission, now: number): Mission {
  if (m.status !== 'paused') return m
  return withLog({ ...m, status: 'running' }, now, ['user', 'Resumed by you.'])
}

/** Cancels the mission and returns proposals that should be withdrawn. */
export function cancelMission(m: Mission, now: number): { mission: Mission; withdraw: string[] } {
  if (m.status === 'completed' || m.status === 'cancelled') return { mission: m, withdraw: [] }
  const withdraw = m.steps.filter((s) => s.status === 'blocked' && s.proposal).map((s) => s.proposal!.id)
  const steps = m.steps.map((s) => (s.status === 'completed' ? s : { ...s, status: 'cancelled' as const }))
  return { mission: withLog({ ...m, status: 'cancelled', steps }, now, ['user', 'Mission cancelled by you.']), withdraw }
}

export function skipBlockedStep(m: Mission, stepId: string, now: number): EngineResult {
  const index = m.steps.findIndex((s) => s.id === stepId && s.status === 'blocked')
  if (index === -1 || m.status !== 'blocked') return { mission: m, raised: [] }
  const step = m.steps[index]
  const skipped = withLog(replaceStep(m, index, { ...step, status: 'cancelled' }), now, ['user', `You skipped: ${step.title}`])
  return startNextStep(skipped, now)
}

/** Unblocks the approval step waiting on `proposalId`, if any. */
export function resolveApproval(m: Mission, proposalId: string, decision: 'approved' | 'rejected', now: number): EngineResult {
  const index = m.steps.findIndex((s) => s.proposal?.id === proposalId && s.status === 'blocked')
  if (index === -1) return { mission: m, raised: [] }
  const step = m.steps[index]
  const updated = replaceStep(m, index, { ...step, status: decision === 'approved' ? 'completed' : 'cancelled' })
  const note =
    decision === 'approved'
      ? `You approved “${step.proposal!.title}” (demo only — nothing was executed).`
      : `You rejected “${step.proposal!.title}”. Continuing without it.`
  const logged = withLog(updated, now, ['user', note])
  if (m.status !== 'blocked') return { mission: logged, raised: [] }
  return startNextStep({ ...logged, status: 'running' }, now)
}

/** Resets a mission so the demo can be replayed. Returns proposals it had raised. */
export function restartMission(m: Mission, now: number): { mission: Mission; removeProposals: string[] } {
  const removeProposals = m.steps.filter((s) => s.proposal).map((s) => s.proposal!.id)
  const steps = m.steps.map((s) => ({ ...s, status: 'pending' as const, elapsedMs: 0 }))
  return { mission: withLog({ ...m, status: 'ready', steps }, now, ['info', 'Reset for another run.']), removeProposals }
}

export const visibleSources = (m: Mission) =>
  m.sources.filter((src) => m.steps.some((s) => s.id === src.revealedByStepId && s.status === 'completed'))

export function missionProgress(m: Mission) {
  const total = m.steps.length
  const completed = m.steps.filter((s) => s.status === 'completed').length
  const running = m.steps.find((s) => s.status === 'running')
  const partial = running ? Math.min(running.elapsedMs / running.durationMs, 1) : 0
  return { total, completed, ratio: total ? (completed + partial) / total : 0 }
}
