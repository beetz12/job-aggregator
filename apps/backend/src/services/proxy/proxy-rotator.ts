/**
 * Proxy Rotator for Playwright scrapers
 *
 * Manages datacenter proxy rotation to avoid rate limiting and detection.
 * Supports loading proxies from environment variables (PROXY_1, PROXY_2, etc.)
 */

export interface PlaywrightProxyConfig {
  server: string
  username?: string
  password?: string
}

export class ProxyRotator {
  private proxies: string[]
  private currentIndex: number
  private requestCounts: Map<string, number>
  private failedProxies: Set<string>
  private maxRequestsPerProxy: number

  constructor(proxies?: string[], maxRequestsPerProxy: number = 200) {
    this.proxies = proxies || this.loadProxiesFromEnv()
    this.currentIndex = 0
    this.requestCounts = new Map()
    this.failedProxies = new Set()
    this.maxRequestsPerProxy = maxRequestsPerProxy

    // Initialize request counts
    for (const proxy of this.proxies) {
      this.requestCounts.set(proxy, 0)
    }
  }

  /**
   * Load proxies from environment variables
   * Looks for PROXY_1, PROXY_2, PROXY_3, etc.
   * Format: http://user:pass@host:port or http://host:port
   */
  private loadProxiesFromEnv(): string[] {
    const proxies: string[] = []
    let index = 1

    while (true) {
      const proxy = process.env[`PROXY_${index}`]
      if (!proxy) break
      proxies.push(proxy)
      index++
    }

    // Also check for a comma-separated PROXIES env var
    const proxiesEnv = process.env.PROXIES
    if (proxiesEnv) {
      const additionalProxies = proxiesEnv.split(',').map(p => p.trim()).filter(Boolean)
      proxies.push(...additionalProxies)
    }

    return proxies
  }

  /**
   * Get next proxy in rotation (round-robin)
   * Skips failed proxies and rotates after maxRequestsPerProxy
   */
  getNextProxy(): string | null {
    const availableProxies = this.getAvailableProxies()
    if (availableProxies.length === 0) return null

    // Find a proxy that hasn't exceeded max requests
    for (let i = 0; i < availableProxies.length; i++) {
      const proxyIndex = (this.currentIndex + i) % availableProxies.length
      const proxy = availableProxies[proxyIndex]
      const count = this.requestCounts.get(proxy) || 0

      if (count < this.maxRequestsPerProxy) {
        this.currentIndex = (proxyIndex + 1) % availableProxies.length
        this.requestCounts.set(proxy, count + 1)
        return proxy
      }
    }

    // All proxies have exceeded max requests, reset counts and try again
    this.resetRequestCounts()
    return this.getNextProxy()
  }

  /**
   * Get a random proxy (better for anti-detection)
   */
  getRandomProxy(): string | null {
    const availableProxies = this.getAvailableProxies()
    if (availableProxies.length === 0) return null

    // Find proxies under the request limit
    const underLimitProxies = availableProxies.filter(
      p => (this.requestCounts.get(p) || 0) < this.maxRequestsPerProxy
    )

    if (underLimitProxies.length === 0) {
      this.resetRequestCounts()
      return this.getRandomProxy()
    }

    const randomIndex = Math.floor(Math.random() * underLimitProxies.length)
    const proxy = underLimitProxies[randomIndex]
    this.requestCounts.set(proxy, (this.requestCounts.get(proxy) || 0) + 1)
    return proxy
  }

  /**
   * Mark a proxy as failed (removes from rotation)
   */
  markProxyFailed(proxy: string): void {
    this.failedProxies.add(proxy)
    console.warn(`[ProxyRotator] Proxy marked as failed: ${this.maskProxy(proxy)}`)
  }

  /**
   * Reset a failed proxy (add back to rotation)
   */
  resetProxy(proxy: string): void {
    this.failedProxies.delete(proxy)
    this.requestCounts.set(proxy, 0)
  }

  /**
   * Check if any proxies are available
   */
  hasAvailableProxies(): boolean {
    return this.getAvailableProxies().length > 0
  }

  /**
   * Get count of available proxies
   */
  getAvailableProxyCount(): number {
    return this.getAvailableProxies().length
  }

  /**
   * Get total proxy count (including failed)
   */
  getTotalProxyCount(): number {
    return this.proxies.length
  }

  /**
   * Parse proxy URL and return Playwright proxy config
   * Supports formats:
   * - http://user:pass@host:port
   * - http://host:port
   * - socks5://user:pass@host:port
   */
  getPlaywrightProxyConfig(proxy: string): PlaywrightProxyConfig {
    try {
      const url = new URL(proxy)
      const server = `${url.protocol}//${url.hostname}:${url.port || 80}`

      const config: PlaywrightProxyConfig = { server }

      if (url.username) {
        config.username = decodeURIComponent(url.username)
      }
      if (url.password) {
        config.password = decodeURIComponent(url.password)
      }

      return config
    } catch (error) {
      // If URL parsing fails, try to extract manually
      const match = proxy.match(/^(https?|socks5):\/\/(?:([^:]+):([^@]+)@)?([^:]+):(\d+)$/)
      if (match) {
        const [, protocol, username, password, host, port] = match
        const config: PlaywrightProxyConfig = {
          server: `${protocol}://${host}:${port}`
        }
        if (username) config.username = username
        if (password) config.password = password
        return config
      }

      // Fallback: assume it's just host:port
      return { server: proxy.startsWith('http') ? proxy : `http://${proxy}` }
    }
  }

  /**
   * Get proxy configuration for use without authentication (for logging)
   */
  private maskProxy(proxy: string): string {
    try {
      const url = new URL(proxy)
      if (url.password) {
        return `${url.protocol}//${url.username}:****@${url.host}`
      }
      return proxy
    } catch {
      return proxy.replace(/:[^:@]+@/, ':****@')
    }
  }

  /**
   * Get available (non-failed) proxies
   */
  private getAvailableProxies(): string[] {
    return this.proxies.filter(p => !this.failedProxies.has(p))
  }

  /**
   * Reset all request counts
   */
  private resetRequestCounts(): void {
    for (const proxy of this.proxies) {
      this.requestCounts.set(proxy, 0)
    }
  }

  /**
   * Get stats about proxy usage
   */
  getStats(): {
    total: number
    available: number
    failed: number
    requestCounts: Record<string, number>
  } {
    const requestCountsObj: Record<string, number> = {}
    this.requestCounts.forEach((count, proxy) => {
      requestCountsObj[this.maskProxy(proxy)] = count
    })

    return {
      total: this.proxies.length,
      available: this.getAvailableProxies().length,
      failed: this.failedProxies.size,
      requestCounts: requestCountsObj
    }
  }
}

// Singleton instance for shared use across scrapers
let sharedRotator: ProxyRotator | null = null

export function getSharedProxyRotator(): ProxyRotator {
  if (!sharedRotator) {
    sharedRotator = new ProxyRotator()
  }
  return sharedRotator
}
