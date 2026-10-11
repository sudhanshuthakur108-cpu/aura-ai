import type { ActionProposal, PurchaseProposal } from '../../types'
import { ago } from './time'

/** Raised by the headphones mission when it reaches its approval step. */
export function headphonesPurchase(now: number): PurchaseProposal {
  return {
    id: 'p-headphones',
    kind: 'purchase',
    title: 'Buy Halden Q7 headphones',
    summary: 'Top pick from the headphone research: best comfort over long flights, within your $350 budget.',
    status: 'pending',
    risk: 'high',
    createdAt: now,
    merchant: 'Meridian Audio (fictional demo store)',
    items: [{ name: 'Halden Q7 wireless noise-cancelling headphones · Slate', quantity: 1, unitPrice: 329 }],
    currency: 'USD',
    shipping: 0,
    paymentLabel: 'Demo card ···· 0000 (not a real card)',
    delivery: 'Estimated 3–5 business days to your saved address',
    returnPolicy: '30-day returns (illustrative policy)',
    willHappen: [
      'Place an order with Meridian Audio for the item below',
      'Charge the total to the selected payment method',
      'Send the order confirmation to your inbox',
    ],
    consequences: [
      'Your card is charged $329.00 immediately',
      'The order can only be cancelled before it ships',
      'Your shipping address is shared with the merchant',
    ],
    origin: { label: 'Mission · Find travel headphones under $350', missionId: 'm-headphones' },
  }
}

export function seedProposals(now: number): ActionProposal[] {
  return [
    {
      id: 'p-email-sam',
      kind: 'email',
      title: 'Email the Lisbon plan to Sam',
      summary: 'A short note with the weekend outline so Sam can weigh in before anything is booked.',
      status: 'pending',
      risk: 'medium',
      createdAt: ago(now, { h: 2, m: 6 }),
      from: 'you@example.com',
      to: ['sam.rivera@example.com'],
      cc: [],
      subject: 'Lisbon long weekend — rough plan',
      body: [
        'Hi Sam,',
        '',
        'Here is a first pass at the Lisbon weekend — deliberately unhurried:',
        '',
        '• Friday: arrive, settle into Príncipe Real, sunset at a miradouro',
        '• Saturday: day trip to Sintra, back for a late dinner in Alfama',
        '• Sunday: LX Factory, the river walk to Belém, pastries on the way',
        '• Monday: slow breakfast, then the airport',
        '',
        'Nothing is booked yet. Anything you would swap?',
        '',
        'Talk soon',
      ].join('\n'),
      willHappen: [
        'Send this email from your connected email account',
        'Sam receives it straight away',
      ],
      consequences: [
        'A sent email cannot be unsent',
        'Shares your travel dates and plans with Sam',
      ],
      origin: { label: 'Chat · Long weekend in Lisbon', threadId: 't-lisbon', missionId: 'm-lisbon' },
    },
    {
      id: 'p-calendar-lisbon',
      kind: 'external',
      title: 'Add Lisbon weekend holds to your calendar',
      summary: 'Three all-day holds so the weekend is protected while plans firm up.',
      status: 'pending',
      risk: 'low',
      createdAt: ago(now, { h: 1, m: 50 }),
      service: 'Calendar',
      operation: 'Create 3 all-day events',
      destination: 'Your personal calendar',
      permissions: ['Create events'],
      dataShared: ['Event titles (“Lisbon — day 1/2/3”)', 'Dates', 'City as location'],
      willHappen: [
        'Create three all-day events titled “Lisbon — day 1”, “day 2” and “day 3”',
        'Mark them as busy so others see you as unavailable',
      ],
      consequences: [
        'People with access to your calendar will see the holds',
        'Events can be deleted later from your calendar',
      ],
      origin: { label: 'Mission · Plan a long weekend in Lisbon', missionId: 'm-lisbon' },
    },
    {
      id: 'p-price-alerts',
      kind: 'external',
      title: 'Subscribe to ticket price alerts',
      summary: 'Sign you up for daily price emails from a ticket resale site.',
      status: 'rejected',
      risk: 'medium',
      createdAt: ago(now, { d: 4, h: 3 }),
      decidedAt: ago(now, { d: 4, h: 2 }),
      service: 'Ticket resale site (fictional)',
      operation: 'Create an account and subscribe to alerts',
      destination: 'tickets.example',
      permissions: ['Create an account in your name', 'Send you marketing email'],
      dataShared: ['Your email address', 'Your name'],
      willHappen: ['Create an account on tickets.example', 'Subscribe your email to daily price alerts'],
      consequences: ['Your email is shared with a third party', 'You may receive marketing email'],
      origin: { label: 'Mission · Watch concert ticket prices', missionId: 'm-tickets' },
    },
  ]
}
