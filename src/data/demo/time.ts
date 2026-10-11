const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** Builds a timestamp relative to the moment demo data is created. */
export function ago(now: number, { d = 0, h = 0, m = 0 }: { d?: number; h?: number; m?: number }) {
  return now - d * DAY - h * HOUR - m * MINUTE
}
