import {
  Ban,
  CircleCheck,
  CircleDashed,
  CirclePause,
  CirclePlay,
  CircleX,
  Hand,
  Hourglass,
  LoaderCircle,
  Undo2,
  type LucideIcon,
} from 'lucide-react'
import type { MissionStatus, ProposalStatus, StepStatus } from '../../types'
import type { Tone } from './Badge'

export interface StatusMeta {
  label: string
  tone: Tone
  icon: LucideIcon
  spin?: boolean
}

export const missionStatusMeta: Record<MissionStatus, StatusMeta> = {
  ready: { label: 'Ready to start', tone: 'neutral', icon: CirclePlay },
  running: { label: 'Running', tone: 'accent', icon: LoaderCircle, spin: true },
  paused: { label: 'Paused', tone: 'warning', icon: CirclePause },
  blocked: { label: 'Needs you', tone: 'warning', icon: Hand },
  completed: { label: 'Completed', tone: 'success', icon: CircleCheck },
  cancelled: { label: 'Cancelled', tone: 'muted', icon: CircleX },
}

export const stepStatusMeta: Record<StepStatus, StatusMeta> = {
  pending: { label: 'Pending', tone: 'muted', icon: CircleDashed },
  running: { label: 'Running', tone: 'accent', icon: LoaderCircle, spin: true },
  completed: { label: 'Completed', tone: 'success', icon: CircleCheck },
  blocked: { label: 'Blocked', tone: 'warning', icon: Hand },
  cancelled: { label: 'Cancelled', tone: 'muted', icon: CircleX },
}

export const proposalStatusMeta: Record<ProposalStatus, StatusMeta> = {
  pending: { label: 'Awaiting your review', tone: 'warning', icon: Hourglass },
  approved: { label: 'Approved · demo only', tone: 'success', icon: CircleCheck },
  rejected: { label: 'Rejected', tone: 'muted', icon: Ban },
  withdrawn: { label: 'Withdrawn', tone: 'muted', icon: Undo2 },
}
