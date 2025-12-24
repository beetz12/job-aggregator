/**
 * Calculates a health score (0-100) based on job freshness
 * - 100: Posted today
 * - 75-99: Posted within last week
 * - 50-74: Posted within last month
 * - 25-49: Posted within last 3 months
 * - 0-24: Older than 3 months
 */
export function calculateHealthScore(postedAt: string): number {
  const posted = new Date(postedAt)
  const now = new Date()
  const diffMs = now.getTime() - posted.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)

  if (diffDays <= 1) return 100
  if (diffDays <= 7) return Math.round(100 - (diffDays * 3.5))
  if (diffDays <= 30) return Math.round(75 - ((diffDays - 7) * 1.1))
  if (diffDays <= 90) return Math.round(50 - ((diffDays - 30) * 0.4))
  return Math.max(0, Math.round(25 - ((diffDays - 90) * 0.1)))
}
