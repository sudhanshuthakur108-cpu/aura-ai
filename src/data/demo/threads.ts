import type { Message, Thread } from '../../types'
import { ago } from './time'

export function seedThreads(now: number): { threads: Thread[]; messages: Message[] } {
  const threads: Thread[] = [
    { id: 't-lisbon', title: 'Long weekend in Lisbon', createdAt: ago(now, { h: 2, m: 32 }), updatedAt: ago(now, { h: 2, m: 6 }) },
    { id: 't-evening', title: 'Winding down after a long week', createdAt: ago(now, { d: 1, h: 2 }), updatedAt: ago(now, { d: 1, h: 1 }) },
    { id: 't-headphones', title: 'Headphones for long flights', createdAt: ago(now, { d: 3, h: 1 }), updatedAt: ago(now, { d: 3, h: 1 }) },
  ]

  const messages: Message[] = [
    {
      id: 'msg-l1',
      threadId: 't-lisbon',
      role: 'user',
      text: 'Can you help me plan a long weekend in Lisbon next month? Nothing too packed.',
      createdAt: ago(now, { h: 2, m: 32 }),
    },
    {
      id: 'msg-l2',
      threadId: 't-lisbon',
      role: 'assistant',
      text: 'An unhurried Lisbon weekend — lovely. I kept each day to one anchor plan, picked Sintra as the single day trip, and leaned on your vegetarian preference for food. The research ran as a mission so you can see every step and source.',
      createdAt: ago(now, { h: 2, m: 31 }),
      cards: [{ kind: 'mission', missionId: 'm-lisbon' }],
    },
    {
      id: 'msg-l3',
      threadId: 't-lisbon',
      role: 'user',
      text: 'Perfect. Can you send it to Sam?',
      createdAt: ago(now, { h: 2, m: 7 }),
    },
    {
      id: 'msg-l4',
      threadId: 't-lisbon',
      role: 'assistant',
      text: 'I drafted a short email to Sam with the highlights. It’s waiting for you in Approvals — nothing goes out unless you approve it.',
      createdAt: ago(now, { h: 2, m: 6 }),
      cards: [{ kind: 'proposal', proposalId: 'p-email-sam' }],
      followUps: ['Add the trip to my calendar', 'What do you remember about me?'],
    },
    {
      id: 'msg-e1',
      threadId: 't-evening',
      role: 'user',
      text: 'Long week. My brain feels like static.',
      createdAt: ago(now, { d: 1, h: 2 }),
    },
    {
      id: 'msg-e2',
      threadId: 't-evening',
      role: 'assistant',
      text: 'That sounds draining. Do you want to talk it through, or would something lighter help right now?',
      createdAt: ago(now, { d: 1, h: 2 }),
    },
    {
      id: 'msg-e3',
      threadId: 't-evening',
      role: 'user',
      text: 'Maybe just help me wind down.',
      createdAt: ago(now, { d: 1, h: 1, m: 58 }),
    },
    {
      id: 'msg-e4',
      threadId: 't-evening',
      role: 'assistant',
      text: 'Let’s keep it gentle. Here’s a ten-minute wind-down — skip anything that doesn’t feel right. I also noted that evenings are your low-energy time, so I’ll keep things lighter after 8pm.',
      createdAt: ago(now, { d: 1, h: 1, m: 57 }),
      cards: [
        {
          kind: 'checklist',
          title: 'Ten-minute wind-down',
          items: ['Dim the lights and put your phone face down', 'Two minutes of slow breathing: in for 4, out for 6', 'Write down one thing that went okay today', 'Short stretch for your neck and shoulders'],
        },
        { kind: 'memory-saved', memoryId: 'mem-evenings' },
      ],
    },
    {
      id: 'msg-h1',
      threadId: 't-headphones',
      role: 'user',
      text: 'I need noise-cancelling headphones for long flights, under $350.',
      createdAt: ago(now, { d: 3, h: 1 }),
    },
    {
      id: 'msg-h2',
      threadId: 't-headphones',
      role: 'assistant',
      text: 'Got it — comfort after hour six matters more than specs on a page. I set up a research mission. Start it whenever you like; you’ll see each step, the sources it reads, and anything that needs your approval before it happens.',
      createdAt: ago(now, { d: 3, h: 1 }),
      cards: [{ kind: 'mission', missionId: 'm-headphones' }],
      followUps: ['What will you need my approval for?', 'Remember that I prefer a window seat'],
    },
  ]

  return { threads, messages }
}
