import type { Mission, MissionStep } from '../../types'
import { headphonesPurchase } from './proposals'
import { ago } from './time'

type StepInput = Omit<MissionStep, 'elapsedMs' | 'status'> & Partial<Pick<MissionStep, 'status' | 'elapsedMs'>>

function step(input: StepInput): MissionStep {
  const status = input.status ?? 'pending'
  return { ...input, status, elapsedMs: input.elapsedMs ?? (status === 'completed' ? input.durationMs : 0) }
}

/* All findings below are illustrative: fictional products, publishers and
   `.example` domains. The demo engine never touches the network. */

function headphonesMission(now: number): Mission {
  return {
    id: 'm-headphones',
    title: 'Find travel headphones under $350',
    objective:
      'Shortlist noise-cancelling headphones that stay comfortable on 10+ hour flights, stay under $350, and propose the best pick for purchase.',
    status: 'ready',
    createdAt: ago(now, { d: 3, h: 1 }),
    updatedAt: ago(now, { d: 3, h: 1 }),
    steps: [
      step({
        id: 'hp-1',
        title: 'Scan recent reviews',
        detail: 'Search long-form reviews from the last 12 months that test over-ear models on flights.',
        tool: 'search',
        durationMs: 3600,
        resultNote: 'Found 14 candidate reviews; kept 6 that test on real flights.',
      }),
      step({
        id: 'hp-2',
        title: 'Read long-haul comfort reports',
        detail: 'Pull out clamping force, heat build-up and weight — the things that matter after hour six.',
        tool: 'read',
        durationMs: 4200,
        resultNote: 'Comfort notes extracted for 5 models.',
      }),
      step({
        id: 'hp-3',
        title: 'Compare noise cancelling, battery and fit',
        detail: 'Normalise measurements across reviewers and weigh comfort above raw cancellation.',
        tool: 'analyze',
        durationMs: 3800,
        resultNote: 'Scored 5 models; two dropped for exceeding budget.',
      }),
      step({
        id: 'hp-4',
        title: 'Shortlist the top three',
        detail: 'Rank by comfort, then cancellation, then price.',
        tool: 'draft',
        durationMs: 2600,
        resultNote: 'Shortlist: Halden Q7, Sonora Air Pro, Kestrel NC2.',
      }),
      step({
        id: 'hp-5',
        title: 'Propose purchase of the top pick',
        detail: 'Prepare an order for your review. Nothing is bought without your explicit approval.',
        tool: 'approval',
        durationMs: 1200,
        blockedReason: 'Waiting for your decision on the purchase proposal.',
        proposal: headphonesPurchase(now),
      }),
      step({
        id: 'hp-6',
        title: 'Write up the recommendation',
        detail: 'Summarise the trade-offs so you can revisit the decision later.',
        tool: 'draft',
        durationMs: 2400,
        resultNote: 'Recommendation ready.',
      }),
    ],
    sources: [
      {
        id: 'src-hp-1',
        title: 'Twelve hours over the Pacific: five headphones tested in economy',
        publisher: 'Carry-On Review',
        domain: 'carryon-review.example',
        kind: 'review',
        excerpt: 'The Q7 was the only pair nobody wanted to take off at the eight-hour mark.',
        revealedByStepId: 'hp-1',
      },
      {
        id: 'src-hp-2',
        title: 'Noise-cancelling roundup: lab measurements',
        publisher: 'Signal & Hush Lab',
        domain: 'signalhush.example',
        kind: 'dataset',
        excerpt: 'Low-frequency attenuation within 2 dB across the top three models.',
        revealedByStepId: 'hp-1',
      },
      {
        id: 'src-hp-3',
        title: 'Long-haul comfort: what reviewers miss',
        publisher: 'Frequent Flyer Forum',
        domain: 'flyerforum.example',
        kind: 'forum',
        excerpt: 'Heat build-up on protein-leather pads was the most common complaint after six hours.',
        revealedByStepId: 'hp-2',
      },
      {
        id: 'src-hp-4',
        title: 'Battery life under real use',
        publisher: 'Gadget Ledger',
        domain: 'gadgetledger.example',
        kind: 'article',
        excerpt: 'Advertised battery figures were 10–18% optimistic with cancellation on.',
        revealedByStepId: 'hp-3',
      },
    ],
    activity: [{ id: 'hp-a0', at: ago(now, { d: 3, h: 1 }), kind: 'info', text: 'Mission created from chat. Ready when you are.' }],
    deliverable: {
      title: 'Travel headphones: recommendation',
      summary:
        'Halden Q7 is the best fit for long flights within budget: lightest of the three, cool fabric pads, and cancellation on par with pricier models.',
      table: {
        columns: ['Model', 'Comfort (10h)', 'Cancellation', 'Battery', 'Price'],
        rows: [
          ['Halden Q7', 'Excellent', 'Very good', '28 h', '$329'],
          ['Sonora Air Pro', 'Good', 'Excellent', '24 h', '$349'],
          ['Kestrel NC2', 'Good', 'Good', '35 h', '$279'],
        ],
      },
      sections: [
        {
          heading: 'Why the Q7',
          bullets: [
            'Lowest clamping force of the shortlist — the main driver of fatigue past hour six',
            'Fabric pads avoid the heat build-up reviewers flagged on leather pads',
            'Folds flat, which matters with a small under-seat bag',
          ],
        },
        {
          heading: 'When to pick something else',
          body: 'If battery life matters most (multi-leg trips without charging), the Kestrel NC2 lasts longest and costs $50 less.',
        },
      ],
    },
  }
}

function lisbonMission(now: number): Mission {
  const done = (id: string, title: string, detail: string, tool: MissionStep['tool'], resultNote: string) =>
    step({ id, title, detail, tool, durationMs: 3000, status: 'completed', resultNote })
  return {
    id: 'm-lisbon',
    title: 'Plan a long weekend in Lisbon',
    objective: 'An unhurried four-day plan with one day trip, vegetarian-friendly food and plenty of slack.',
    status: 'completed',
    createdAt: ago(now, { h: 2, m: 30 }),
    updatedAt: ago(now, { h: 2, m: 8 }),
    steps: [
      done('lx-1', 'Check what you already like', 'Use saved preferences: vegetarian, slow mornings, window seats.', 'analyze', 'Applied 3 saved preferences.'),
      done('lx-2', 'Research neighbourhoods', 'Compare walkable bases near tram lines.', 'search', 'Príncipe Real chosen: quiet, central, close to viewpoints.'),
      done('lx-3', 'Pick one day trip', 'Weigh Sintra, Cascais and Setúbal against travel time.', 'read', 'Sintra on Saturday; earliest train avoids crowds.'),
      done('lx-4', 'Draft the itinerary', 'Keep each day to one anchor plan plus free time.', 'draft', 'Itinerary drafted with two open afternoons.'),
    ],
    sources: [
      {
        id: 'src-lx-1',
        title: 'Where to stay in Lisbon if you hate hills (a little)',
        publisher: 'Slow Cities Journal',
        domain: 'slowcities.example',
        kind: 'guide',
        excerpt: 'Príncipe Real rewards walkers: flat-ish streets, gardens, and a short descent to Chiado.',
        revealedByStepId: 'lx-2',
      },
      {
        id: 'src-lx-2',
        title: 'Sintra without the queues',
        publisher: 'Day Trip Notes',
        domain: 'daytripnotes.example',
        kind: 'article',
        excerpt: 'The first train out gets you to the palaces before the tour buses do.',
        revealedByStepId: 'lx-3',
      },
      {
        id: 'src-lx-3',
        title: 'Vegetarian eating in Alfama and Mouraria',
        publisher: 'Green Plate Guide',
        domain: 'greenplate.example',
        kind: 'guide',
        excerpt: 'Petiscos menus usually have three or four vegetarian plates worth ordering.',
        revealedByStepId: 'lx-2',
      },
    ],
    activity: [
      { id: 'lx-a1', at: ago(now, { h: 2, m: 30 }), kind: 'info', text: 'Mission started from chat.' },
      { id: 'lx-a2', at: ago(now, { h: 2, m: 28 }), kind: 'tool', text: 'Applied 3 saved preferences.' },
      { id: 'lx-a3', at: ago(now, { h: 2, m: 22 }), kind: 'source', text: 'Source added: Where to stay in Lisbon if you hate hills (a little)' },
      { id: 'lx-a4', at: ago(now, { h: 2, m: 15 }), kind: 'tool', text: 'Sintra on Saturday; earliest train avoids crowds.' },
      { id: 'lx-a5', at: ago(now, { h: 2, m: 8 }), kind: 'result', text: 'Itinerary ready. Proposed an email to Sam and calendar holds for your review.' },
    ],
    deliverable: {
      title: 'Lisbon, four slow days',
      summary: 'Base in Príncipe Real, one anchor plan per day, two afternoons left deliberately open.',
      sections: [
        { heading: 'Friday — arrive', bullets: ['Check in, walk the Príncipe Real garden', 'Sunset at Miradouro de São Pedro de Alcântara'] },
        { heading: 'Saturday — Sintra', bullets: ['First train from Rossio', 'Pena Palace, then the Moorish Castle walk', 'Late dinner in Alfama (vegetarian petiscos)'] },
        { heading: 'Sunday — river day', bullets: ['LX Factory in the morning', 'Riverside walk to Belém', 'Open afternoon'] },
        { heading: 'Monday — leave gently', body: 'Slow breakfast, then a 25-minute metro ride to the airport.' },
      ],
    },
  }
}

function leaseMission(now: number): Mission {
  return {
    id: 'm-lease',
    title: 'Prepare for the lease renewal conversation',
    objective: 'Gather local rent benchmarks and draft calm, specific talking points before Thursday.',
    status: 'blocked',
    createdAt: ago(now, { d: 1, h: 4 }),
    updatedAt: ago(now, { d: 1, h: 3 }),
    steps: [
      step({
        id: 'ls-1',
        title: 'Gather local rent benchmarks',
        detail: 'Compare listings for similar one-bedroom flats within a 15-minute walk.',
        tool: 'search',
        durationMs: 3000,
        status: 'completed',
        resultNote: 'Benchmarks gathered from 2 illustrative sources.',
      }),
      step({
        id: 'ls-2',
        title: 'Review your current lease',
        detail: 'Check the renewal clause, notice period and any cap on increases.',
        tool: 'input',
        durationMs: 3000,
        status: 'blocked',
        blockedReason: 'Needs a copy of your lease. File upload isn’t available in this demo, so you can skip this step or cancel the mission.',
      }),
      step({
        id: 'ls-3',
        title: 'Draft talking points',
        detail: 'Three points, each backed by a benchmark, plus a fallback position.',
        tool: 'draft',
        durationMs: 3200,
        resultNote: 'Talking points drafted.',
      }),
      step({
        id: 'ls-4',
        title: 'Rehearse likely responses',
        detail: 'Prepare short answers to the three most likely pushbacks.',
        tool: 'analyze',
        durationMs: 2800,
        resultNote: 'Rehearsal notes ready.',
      }),
    ],
    sources: [
      {
        id: 'src-ls-1',
        title: 'Neighbourhood rent index, Q3',
        publisher: 'City Housing Observatory',
        domain: 'housing-observatory.example',
        kind: 'dataset',
        excerpt: 'Median one-bedroom rent in the area rose 3.1% year on year.',
        revealedByStepId: 'ls-1',
      },
      {
        id: 'src-ls-2',
        title: 'How to negotiate a renewal without souring things',
        publisher: 'Renters’ Handbook',
        domain: 'rentershandbook.example',
        kind: 'guide',
        excerpt: 'Lead with your record as a tenant, then the numbers.',
        revealedByStepId: 'ls-1',
      },
    ],
    activity: [
      { id: 'ls-a1', at: ago(now, { d: 1, h: 4 }), kind: 'info', text: 'Mission started.' },
      { id: 'ls-a2', at: ago(now, { d: 1, h: 3, m: 50 }), kind: 'source', text: 'Source added: Neighbourhood rent index, Q3' },
      { id: 'ls-a3', at: ago(now, { d: 1, h: 3, m: 40 }), kind: 'tool', text: 'Benchmarks gathered from 2 illustrative sources.' },
      { id: 'ls-a4', at: ago(now, { d: 1, h: 3 }), kind: 'warning', text: 'Blocked: needs a copy of your lease.' },
    ],
    deliverable: {
      title: 'Lease renewal: talking points',
      summary: 'Open with your track record, anchor on the 3.1% local benchmark, and have a fallback ready.',
      sections: [
        {
          heading: 'Talking points',
          bullets: [
            'Two years of on-time payments and no maintenance disputes',
            'Local one-bedroom rents rose about 3% — a larger increase is above market',
            'Happy to sign for 18 months in exchange for holding the increase at 3%',
          ],
        },
        { heading: 'Fallback', body: 'If they won’t move, ask for the increase to start in three months instead of now.' },
      ],
    },
  }
}

function ticketsMission(now: number): Mission {
  return {
    id: 'm-tickets',
    title: 'Watch concert ticket prices',
    objective: 'Track resale prices for the October show and flag anything under $90.',
    status: 'cancelled',
    createdAt: ago(now, { d: 4, h: 5 }),
    updatedAt: ago(now, { d: 4, h: 1 }),
    steps: [
      step({
        id: 'tk-1',
        title: 'Find resale listings',
        detail: 'Check two resale sites for the show.',
        tool: 'search',
        durationMs: 3000,
        status: 'completed',
        resultNote: 'Lowest listing found: $142.',
      }),
      step({
        id: 'tk-2',
        title: 'Set up price alerts',
        detail: 'Requires signing up to a resale site — proposed for your approval.',
        tool: 'approval',
        durationMs: 1000,
        status: 'cancelled',
      }),
      step({ id: 'tk-3', title: 'Check prices daily', detail: 'Compare each morning and notify you.', tool: 'analyze', durationMs: 3000, status: 'cancelled' }),
    ],
    sources: [],
    activity: [
      { id: 'tk-a1', at: ago(now, { d: 4, h: 5 }), kind: 'info', text: 'Mission started.' },
      { id: 'tk-a2', at: ago(now, { d: 4, h: 4 }), kind: 'tool', text: 'Lowest listing found: $142.' },
      { id: 'tk-a3', at: ago(now, { d: 4, h: 2 }), kind: 'user', text: 'You rejected the price-alert sign-up.' },
      { id: 'tk-a4', at: ago(now, { d: 4, h: 1 }), kind: 'user', text: 'Mission cancelled by you.' },
    ],
    deliverable: { title: 'Ticket price watch', summary: 'Cancelled before any results were gathered.', sections: [] },
  }
}

export function seedMissions(now: number): Mission[] {
  return [headphonesMission(now), leaseMission(now), lisbonMission(now), ticketsMission(now)]
}

/** Generic plan for user-created missions. The demo can't research new topics,
    so the output is explicitly a placeholder. */
export function templateMission(id: string, objective: string, now: number): Mission {
  const title = objective.length > 60 ? `${objective.slice(0, 57).trimEnd()}…` : objective
  return {
    id,
    title,
    objective,
    status: 'ready',
    createdAt: now,
    updatedAt: now,
    templated: true,
    steps: [
      step({ id: `${id}-1`, title: 'Clarify the goal', detail: 'Restate the objective and success criteria.', tool: 'analyze', durationMs: 2400, resultNote: 'Goal restated.' }),
      step({ id: `${id}-2`, title: 'Gather sources', detail: 'A live agent would search and read here.', tool: 'search', durationMs: 3200, resultNote: 'Simulated — no sources were fetched.' }),
      step({ id: `${id}-3`, title: 'Analyse findings', detail: 'Compare options against your criteria.', tool: 'analyze', durationMs: 3000, resultNote: 'Simulated analysis step.' }),
      step({ id: `${id}-4`, title: 'Draft the deliverable', detail: 'Summarise into something you can act on.', tool: 'draft', durationMs: 2400, resultNote: 'Placeholder deliverable prepared.' }),
    ],
    sources: [],
    activity: [{ id: `${id}-a0`, at: now, kind: 'info', text: 'Mission created from the template plan.' }],
    deliverable: {
      title,
      summary:
        'This demo can’t research new topics, so no real findings exist here. A connected agent would place its summary, evidence and recommendation in this panel.',
      sections: [],
    },
  }
}
