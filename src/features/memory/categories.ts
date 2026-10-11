import { Bookmark, Flag, Heart, UserRound, type LucideIcon } from 'lucide-react'
import type { MemoryCategory } from '../../types'

export const memoryCategories: Record<MemoryCategory, { label: string; plural: string; icon: LucideIcon; hint: string }> = {
  preference: { label: 'Preference', plural: 'Preferences', icon: Heart, hint: 'How you like things done' },
  context: { label: 'Personal context', plural: 'Personal context', icon: UserRound, hint: 'Your life, routines and people' },
  goal: { label: 'Goal', plural: 'Goals', icon: Flag, hint: 'What you’re working towards' },
  fact: { label: 'Saved fact', plural: 'Saved facts', icon: Bookmark, hint: 'Dates and details to keep' },
}

export const categoryOrder: MemoryCategory[] = ['preference', 'context', 'goal', 'fact']
