/**
 * Rate limiter for Gemini API calls
 * Uses semaphore for concurrency control + inter-request delay
 */

class GeminiRateLimiter {
  private rpm: number
  private semaphore: number
  private maxConcurrent: number
  private minInterval: number // ms between requests
  private lastRequest: number
  private waiting: Array<() => void>

  constructor(rpm: number = 100, maxConcurrent: number = 5) {
    this.rpm = rpm
    this.maxConcurrent = maxConcurrent
    this.semaphore = maxConcurrent
    this.minInterval = (60 * 1000) / rpm // ms
    this.lastRequest = 0
    this.waiting = []
  }

  async acquire(): Promise<void> {
    // Wait for semaphore slot
    if (this.semaphore <= 0) {
      await new Promise<void>(resolve => this.waiting.push(resolve))
    }
    this.semaphore--

    // Enforce minimum interval between requests
    const now = Date.now()
    const elapsed = now - this.lastRequest
    if (elapsed < this.minInterval) {
      await new Promise(resolve => setTimeout(resolve, this.minInterval - elapsed))
    }
    this.lastRequest = Date.now()
  }

  release(): void {
    this.semaphore++
    if (this.waiting.length > 0) {
      const next = this.waiting.shift()
      next?.()
    }
  }
}

let _limiter: GeminiRateLimiter | null = null

export function getRateLimiter(): GeminiRateLimiter {
  if (!_limiter) {
    const rpm = parseInt(process.env.GEMINI_RPM_LIMIT || '100', 10)
    _limiter = new GeminiRateLimiter(rpm)
  }
  return _limiter
}

export { GeminiRateLimiter }
