import type { Memory } from '../../types'
import { ago } from './time'

export function seedMemories(now: number): Memory[] {
  const m = (
    id: string,
    category: Memory['category'],
    title: string,
    detail: string,
    tags: string[],
    when: { d?: number; h?: number },
    source: Memory['source'] = { type: 'seed' },
  ): Memory => ({ id, category, title, detail, tags, source, createdAt: ago(now, when), updatedAt: ago(now, when) })

  return [
    m('mem-veg', 'preference', 'Vegetarian, adventurous otherwise', 'Doesn’t eat meat or fish, but happy to try anything else — street food included.', ['food', 'travel'], { d: 21 }),
    m('mem-concise', 'preference', 'Short morning check-ins', 'Mornings: keep it to three lines or fewer. Longer conversations are welcome in the evening.', ['communication'], { d: 12 }),
    m('mem-window', 'preference', 'Window seat on flights', 'Prefers a window seat, ideally ahead of the wing.', ['travel'], { d: 30 }),
    m('mem-work', 'context', 'Product designer, works remotely', 'Designs mobile apps for a small team; most meetings are in the afternoon.', ['work'], { d: 40 }),
    m('mem-miso', 'context', 'Lives with Miso, a rescue dog', 'Miso is a four-year-old terrier mix who needs a long walk before 9am.', ['home', 'routine'], { d: 18 }),
    m('mem-evenings', 'context', 'Evenings are low-energy time', 'Gentler suggestions after 8pm; avoid planning-heavy conversations then.', ['wellbeing'], { d: 1 }, { type: 'chat', threadId: 't-evening' }),
    m('mem-halfmarathon', 'goal', 'Run a half-marathon in spring', 'Currently running three times a week; long run is up to 12 km.', ['health', 'running'], { d: 9 }),
    m('mem-books', 'goal', 'Read 20 books this year', '11 finished so far. Enjoys essays and short novels most.', ['reading'], { d: 6 }),
    m('mem-sam-bday', 'fact', 'Sam’s birthday is 14 March', 'Sam is a close friend; likes handwritten cards more than gifts.', ['people', 'dates'], { d: 15 }),
    m('mem-passport', 'fact', 'Passport renewal due next summer', 'Renew at least three months before any trip abroad after May.', ['admin', 'travel'], { d: 25 }),
  ]
}
