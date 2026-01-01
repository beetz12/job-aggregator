/**
 * Circuit Breaker Pattern Implementation
 *
 * Prevents cascading failures by temporarily stopping requests to failing services.
 * Implements the standard circuit breaker states: CLOSED, OPEN, and HALF_OPEN.
 *
 * State transitions:
 * - CLOSED -> OPEN: When failure count exceeds threshold
 * - OPEN -> HALF_OPEN: After reset timeout expires
 * - HALF_OPEN -> CLOSED: When half-open requests succeed
 * - HALF_OPEN -> OPEN: When half-open requests fail
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Circuit breaker states
 */
export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN'

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  /**
   * Number of failures before opening the circuit (default: 5)
   */
  failureThreshold: number

  /**
   * Time in ms to wait before attempting to close the circuit (default: 60000)
   */
  resetTimeoutMs: number

  /**
   * Number of successful requests needed in HALF_OPEN state to close the circuit (default: 3)
   */
  halfOpenRequests: number

  /**
   * Optional name for logging purposes
   */
  name?: string
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeoutMs: 60000,
  halfOpenRequests: 3
}

/**
 * Circuit breaker statistics
 */
export interface CircuitBreakerStats {
  state: CircuitState
  failureCount: number
  successCount: number
  lastFailureTime?: Date
  lastSuccessTime?: Date
  openedAt?: Date
  halfOpenSuccessCount: number
}

// ============================================================================
// Circuit Breaker Class
// ============================================================================

/**
 * Circuit Breaker implementation
 *
 * Usage:
 * ```typescript
 * const breaker = new CircuitBreaker({ failureThreshold: 5, resetTimeoutMs: 60000 })
 *
 * try {
 *   const result = await breaker.execute(() => fetchFromService())
 * } catch (error) {
 *   // Handle error (circuit open or request failed)
 * }
 * ```
 */
export class CircuitBreaker {
  private state: CircuitState = 'CLOSED'
  private failureCount: number = 0
  private successCount: number = 0
  private halfOpenSuccessCount: number = 0
  private lastFailureTime?: Date
  private lastSuccessTime?: Date
  private openedAt?: Date
  private readonly config: CircuitBreakerConfig

  /**
   * Create a new CircuitBreaker instance
   *
   * @param config - Circuit breaker configuration
   */
  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Execute a function with circuit breaker protection
   *
   * @param fn - Async function to execute
   * @returns The result of the function
   * @throws Error if circuit is open or function fails
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit should transition from OPEN to HALF_OPEN
    if (this.state === 'OPEN') {
      if (this.shouldAttemptReset()) {
        this.transitionToHalfOpen()
      } else {
        throw new CircuitOpenError(
          `Circuit breaker is OPEN${this.config.name ? ` for ${this.config.name}` : ''}`,
          this.getTimeUntilReset()
        )
      }
    }

    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  /**
   * Record a successful operation
   */
  onSuccess(): void {
    this.successCount++
    this.lastSuccessTime = new Date()

    if (this.state === 'HALF_OPEN') {
      this.halfOpenSuccessCount++

      if (this.halfOpenSuccessCount >= this.config.halfOpenRequests) {
        this.transitionToClosed()
      }
    } else if (this.state === 'CLOSED') {
      // Reset failure count on success in CLOSED state
      this.failureCount = 0
    }

    this.logStateChange('success recorded')
  }

  /**
   * Record a failed operation
   */
  onFailure(): void {
    this.failureCount++
    this.lastFailureTime = new Date()

    if (this.state === 'HALF_OPEN') {
      // Any failure in HALF_OPEN immediately opens the circuit
      this.transitionToOpen()
    } else if (this.state === 'CLOSED') {
      if (this.failureCount >= this.config.failureThreshold) {
        this.transitionToOpen()
      }
    }

    this.logStateChange('failure recorded')
  }

  /**
   * Get the current state of the circuit breaker
   */
  getState(): CircuitState {
    // Check if we should auto-transition from OPEN to HALF_OPEN
    if (this.state === 'OPEN' && this.shouldAttemptReset()) {
      this.transitionToHalfOpen()
    }
    return this.state
  }

  /**
   * Get detailed statistics about the circuit breaker
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.getState(),
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      openedAt: this.openedAt,
      halfOpenSuccessCount: this.halfOpenSuccessCount
    }
  }

  /**
   * Manually reset the circuit breaker to CLOSED state
   */
  reset(): void {
    this.state = 'CLOSED'
    this.failureCount = 0
    this.successCount = 0
    this.halfOpenSuccessCount = 0
    this.openedAt = undefined
    this.logStateChange('manually reset')
  }

  /**
   * Check if circuit is allowing requests
   */
  isAvailable(): boolean {
    const currentState = this.getState()
    return currentState === 'CLOSED' || currentState === 'HALF_OPEN'
  }

  /**
   * Get time remaining until reset attempt (in ms)
   */
  getTimeUntilReset(): number {
    if (this.state !== 'OPEN' || !this.openedAt) {
      return 0
    }

    const elapsed = Date.now() - this.openedAt.getTime()
    return Math.max(0, this.config.resetTimeoutMs - elapsed)
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private shouldAttemptReset(): boolean {
    if (!this.openedAt) {
      return true
    }

    const elapsed = Date.now() - this.openedAt.getTime()
    return elapsed >= this.config.resetTimeoutMs
  }

  private transitionToOpen(): void {
    this.state = 'OPEN'
    this.openedAt = new Date()
    this.halfOpenSuccessCount = 0
    this.logStateChange('transitioned to OPEN')
  }

  private transitionToHalfOpen(): void {
    this.state = 'HALF_OPEN'
    this.halfOpenSuccessCount = 0
    this.logStateChange('transitioned to HALF_OPEN')
  }

  private transitionToClosed(): void {
    this.state = 'CLOSED'
    this.failureCount = 0
    this.halfOpenSuccessCount = 0
    this.openedAt = undefined
    this.logStateChange('transitioned to CLOSED')
  }

  private logStateChange(action: string): void {
    const name = this.config.name ? `[${this.config.name}]` : ''
    console.log(
      `[CircuitBreaker]${name} ${action} - state: ${this.state}, failures: ${this.failureCount}, half-open success: ${this.halfOpenSuccessCount}`
    )
  }
}

// ============================================================================
// Custom Error
// ============================================================================

/**
 * Error thrown when circuit breaker is open
 */
export class CircuitOpenError extends Error {
  readonly timeUntilReset: number

  constructor(message: string, timeUntilReset: number = 0) {
    super(message)
    this.name = 'CircuitOpenError'
    this.timeUntilReset = timeUntilReset
  }
}

// ============================================================================
// Circuit Breaker Manager
// ============================================================================

/**
 * Map of source-specific circuit breakers
 */
const circuitBreakers: Map<string, CircuitBreaker> = new Map()

/**
 * Get or create a circuit breaker for a specific source
 *
 * @param source - Source identifier (e.g., 'arbeitnow', 'hackernews')
 * @param config - Optional custom configuration
 * @returns CircuitBreaker instance for the source
 */
export function getCircuitBreaker(
  source: string,
  config?: Partial<CircuitBreakerConfig>
): CircuitBreaker {
  const existing = circuitBreakers.get(source)

  if (existing) {
    return existing
  }

  const breaker = new CircuitBreaker({
    ...config,
    name: source
  })

  circuitBreakers.set(source, breaker)
  console.log(`[CircuitBreaker] Created new circuit breaker for source: ${source}`)

  return breaker
}

/**
 * Get all circuit breaker stats
 */
export function getAllCircuitBreakerStats(): Record<string, CircuitBreakerStats> {
  const stats: Record<string, CircuitBreakerStats> = {}

  circuitBreakers.forEach((breaker, source) => {
    stats[source] = breaker.getStats()
  })

  return stats
}

/**
 * Reset all circuit breakers
 */
export function resetAllCircuitBreakers(): void {
  circuitBreakers.forEach((breaker, source) => {
    breaker.reset()
    console.log(`[CircuitBreaker] Reset circuit breaker for: ${source}`)
  })
}

/**
 * Clear all circuit breakers (useful for testing)
 */
export function clearAllCircuitBreakers(): void {
  circuitBreakers.clear()
  console.log('[CircuitBreaker] Cleared all circuit breakers')
}
