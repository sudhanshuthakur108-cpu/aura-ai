import type { MemoryCategory, Tone } from '../../types'
import type { ChatReply, ChatRequest, ChatService } from '../types'

/* A transparent, rule-based responder. It matches keywords against a small set
   of curated replies — it is not a language model and never claims to be. */

type Toned = Record<Tone, string>

function pick(tone: Tone, text: Toned | string) {
  return typeof text === 'string' ? text : text[tone]
}

const has = (text: string, words: string[]) => words.some((w) => text.includes(w))

export function inferCategory(clause: string): MemoryCategory {
  const t = clause.toLowerCase()
  if (has(t, ['prefer', 'i like', 'i love', 'i hate', 'i don’t like', "i don't like", 'favourite', 'favorite', 'rather'])) return 'preference'
  if (has(t, ['goal', 'want to', 'trying to', 'plan to', 'hoping to', 'by the end of'])) return 'goal'
  if (has(t, ['birthday', 'anniversary', 'due', 'deadline', 'is on', 'expires']) || /\d/.test(t)) return 'fact'
  return 'context'
}

function memoryFromClause(clause: string): NonNullable<ChatReply['memoryToSave']> {
  const cleaned = clause.trim().replace(/[.!]+$/, '').replace(/^i\s/i, 'I ')
  const sentence = cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
  const title = sentence.length > 60 ? `${sentence.slice(0, 57).trimEnd()}…` : sentence
  return { category: inferCategory(cleaned), title, detail: `${sentence}.`, tags: ['from chat'] }
}

export function buildReply(req: ChatRequest): ChatReply {
  const { settings, memories, missions, proposals } = req.context
  const tone = settings.tone
  const detailed = settings.verbosity === 'detailed'
  const name = settings.preferredName.trim()
  const raw = req.text.trim()
  const t = raw.toLowerCase()
  const mission = (id: string) => missions.find((m) => m.id === id)
  const proposal = (id: string) => proposals.find((p) => p.id === id)
  const pending = proposals.filter((p) => p.status === 'pending')

  // Explicit memory request: "remember that …"
  const remember = raw.match(/^(?:please\s+)?(?:can you\s+)?remember(?:\s+that)?\s+(.{3,})/i)
  if (remember) {
    if (!settings.memoryCapture) {
      return {
        text: 'Memory saving is turned off in Settings, so I won’t keep this. You can turn it back on any time.',
        followUps: ['What do you remember about me?'],
      }
    }
    return {
      text: pick(tone, {
        warm: 'Noted — I’ll hold on to that. You can see or change it any time in Memory.',
        balanced: 'Saved to memory. You can edit or delete it in Memory.',
        direct: 'Saved. Edit or delete it in Memory.',
      }),
      memoryToSave: memoryFromClause(remember[1]),
    }
  }

  if (has(t, ['what do you remember', 'about me', 'my memories', 'what do you know'])) {
    if (memories.length === 0) {
      return { text: 'I don’t have anything saved about you right now. Tell me something to remember, or add it in Memory.' }
    }
    const recent = [...memories].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 4)
    return {
      text: pick(tone, {
        warm: `Here’s some of what I keep in mind${name ? `, ${name}` : ''}. Anything out of date is easy to fix in Memory.`,
        balanced: 'A few of the most recent things I’ve saved. You can review all of them in Memory.',
        direct: 'Most recent memories:',
      }),
      cards: [{ kind: 'memory-list', memoryIds: recent.map((m) => m.id) }],
    }
  }

  if (has(t, ['approval', 'approve', 'permission', 'what will you need'])) {
    const first = pending[0]
    return {
      text:
        `Anything that leaves this app — sending email, spending money, changing a calendar — waits for your explicit approval. You see exactly what would happen first, and silence never counts as a yes. ${pending.length ? `${pending.length} proposal${pending.length === 1 ? ' is' : 's are'} waiting right now.` : 'Nothing is waiting right now.'}` +
        (detailed ? ' In this demo, approving only records your decision locally; no integrations are connected.' : ''),
      cards: first ? [{ kind: 'proposal', proposalId: first.id }] : undefined,
    }
  }

  if (has(t, ['headphone'])) {
    const m = mission('m-headphones')
    if (!m) return { text: 'That headphone mission no longer exists in this demo session. You can reset the demo in Settings.' }
    const status: Record<string, string> = {
      ready: 'The headphone mission is ready — start it from the card below and watch each step in Missions.',
      running: 'The headphone mission is running now. The activity log in Missions shows each step as it happens.',
      paused: 'The headphone mission is paused. Resume it whenever you like.',
      blocked: 'The headphone mission is waiting on you — there’s a purchase proposal to review.',
      completed: 'The headphone mission is done. The recommendation is in the deliverable panel.',
      cancelled: 'You cancelled the headphone mission. You can restart it from Missions.',
    }
    return { text: status[m.status], cards: [{ kind: 'mission', missionId: m.id }] }
  }

  if (has(t, ['calendar'])) {
    const p = proposal('p-calendar-lisbon')
    if (p) {
      return {
        text:
          p.status === 'pending'
            ? 'I prepared three all-day holds for the Lisbon weekend. Your calendar isn’t connected in this demo, so approving only records your decision.'
            : p.status === 'approved'
              ? 'You approved the calendar holds in this demo — nothing was added to a real calendar.'
              : `The calendar holds were ${p.status}. Nothing was added.`,
        cards: [{ kind: 'proposal', proposalId: p.id }],
      }
    }
  }

  if (has(t, ['email', 'send it']) || /\bsam\b/.test(t)) {
    const p = proposal('p-email-sam')
    if (p) {
      return {
        text: 'Here’s the draft to Sam. Review or edit it before deciding — nothing is sent from this demo either way.',
        cards: [{ kind: 'proposal', proposalId: p.id }],
      }
    }
  }

  if (has(t, ['lisbon', 'trip', 'itinerary'])) {
    const m = mission('m-lisbon')
    if (m) return { text: 'Here’s the Lisbon plan. The mission shows the steps and illustrative sources behind it.', cards: [{ kind: 'mission', missionId: m.id }] }
  }

  if (has(t, ['wind down', 'relax', 'calm down'])) {
    return {
      text: pick(tone, {
        warm: 'Of course. Let’s go slowly — take whatever feels useful from this.',
        balanced: 'Here’s a short wind-down routine.',
        direct: 'Ten-minute wind-down:',
      }),
      cards: [{ kind: 'checklist', title: 'Ten-minute wind-down', items: ['Lower the lights and silence notifications', 'Slow breathing: in for 4, out for 6, for two minutes', 'Write one line about something that went okay', 'Stretch your neck and shoulders'] }],
    }
  }

  if (has(t, ['tired', 'stress', 'anxious', 'overwhelm', 'sad', 'lonely', 'exhausted', 'static', 'long day', 'rough day'])) {
    return {
      text: pick(tone, {
        warm: `I’m sorry it’s been heavy${name ? `, ${name}` : ''}. You don’t have to sort anything out right now. Would it help to talk it through, or to do something small and calming together?`,
        balanced: 'That sounds like a lot. Do you want to talk it through, or switch to something lighter?',
        direct: 'Understood. Talk it through, or take a break?',
      }),
      followUps: ['Help me wind down', 'Just keep me company for a minute'],
    }
  }

  if (has(t, ['keep me company', 'company'])) {
    return {
      text: pick(tone, {
        warm: 'I’m right here. No agenda — we can sit with it, or you can tell me about one small good thing from today.',
        balanced: 'Happy to. We can chat about anything, or just take it slow.',
        direct: 'Sure. What’s on your mind?',
      }),
    }
  }

  if (has(t, ['plan my', 'my day', 'my week', 'today'])) {
    const items = [
      memories.some((m) => m.id === 'mem-miso') ? 'Long walk with Miso before 9am' : 'A short walk before you start',
      'One focused design block before lunch',
      'Afternoon: meetings, keep one 30-minute buffer',
      memories.some((m) => m.id === 'mem-halfmarathon') ? 'Easy 5 km run (half-marathon training)' : 'Something that moves your body',
      'Evening: low-key, no planning after 8pm',
    ]
    return {
      text: 'A gentle shape for the day, built from what you’ve told me. Change anything that doesn’t fit.',
      cards: [{ kind: 'checklist', title: 'Today, roughly', items }],
    }
  }

  if (has(t, ['research', 'find me', 'compare', 'look into', 'mission'])) {
    return {
      text: 'Research tasks run as missions, so you can follow every step and approve anything consequential. In this demo you can create one from Missions — it runs a simulated template plan and can’t research new topics.',
      followUps: ['What will you need my approval for?'],
    }
  }

  if (has(t, ['who are you', 'what can you do', 'are you real', 'are you an ai', 'live model', 'chatgpt', 'llm'])) {
    return {
      text: `I’m ${settings.companionName}. In this prototype I run on a scripted demo responder — not a live language model — so my replies come from a small set of curated responses. What I can show you is how conversation, memory, missions and approvals fit together.`,
      followUps: ['What do you remember about me?', 'Help me plan my day'],
    }
  }

  if (/^(hi|hey|hello|good (morning|afternoon|evening))\b/.test(t)) {
    return {
      text: pick(tone, {
        warm: `Hi${name ? ` ${name}` : ''} — it’s good to see you. How are you arriving today?`,
        balanced: `Hi${name ? ` ${name}` : ''}. What would you like to do?`,
        direct: 'Hi. What do you need?',
      }),
      followUps: ['Help me plan my day', 'What do you remember about me?'],
    }
  }

  return {
    text: pick(tone, {
      warm: 'I want to give you a real answer, but I’m running on a scripted demo responder and that’s outside what it covers. Here are a few things I can genuinely show you:',
      balanced: 'That’s outside what this scripted demo responder covers. Try one of these:',
      direct: 'Not covered by the demo responder. Try:',
    }),
    followUps: ['Help me plan my day', 'What do you remember about me?', 'How are the headphones going?'],
  }
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const demoChatService: ChatService = {
  label: 'Scripted demo responder',
  async respond(req) {
    await wait(650 + Math.min(req.text.length * 6, 650))
    // Lets reviewers see the genuine error path: the first attempt fails, a retry succeeds.
    if (req.text.includes('/error') && req.attempt === 1) {
      throw new Error('The demo responder was asked to fail (/error). Retry to send it again.')
    }
    return buildReply({ ...req, text: req.text.replace('/error', '').trim() || 'hello' })
  },
}
