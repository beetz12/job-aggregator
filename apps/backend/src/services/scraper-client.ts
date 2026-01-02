/**
 * Scraper API Client
 *
 * HTTP client for the Python Scraper API that aggregates jobs from multiple sources.
 * Uses Zod for request/response validation.
 *
 * Environment Variables:
 * - SCRAPER_API_URL: Base URL of the Python scraper API (default: http://localhost:8000)
 */

import { z } from 'zod'
import {
  scraperSourceEnum,
  SCRAPER_SOURCES,
  type ScraperSource
} from './sources'

// ============================================================================
// Re-export from sources.ts for backwards compatibility
// ============================================================================

export { scraperSourceEnum as jobSourceSchema }
export type JobSource = ScraperSource
export const ALL_SOURCES = [...SCRAPER_SOURCES]

/**
 * Employment type enum
 */
export const employmentTypeSchema = z.enum([
  'full-time',
  'part-time',
  'contract',
  'internship'
])

export type EmploymentType = z.infer<typeof employmentTypeSchema>

/**
 * Experience level enum
 */
export const experienceLevelSchema = z.enum([
  'entry',
  'mid',
  'senior',
  'lead',
  'executive'
])

export type ExperienceLevel = z.infer<typeof experienceLevelSchema>

/**
 * Raw job schema from the Python scraper API
 */
export const rawJobSchema = z.object({
  source_id: z.string(),
  title: z.string(),
  company: z.string(),
  url: z.string().url(),
  company_url: z.string().url().optional(),
  location_raw: z.string().optional(),
  description_html: z.string().optional(),
  description_text: z.string().optional(),
  posted_at: z.string().datetime({ offset: true }).optional(),
  salary_raw: z.string().optional(),
  salary_min: z.number().optional(),
  salary_max: z.number().optional(),
  salary_currency: z.string().optional(),
  employment_type: employmentTypeSchema.optional(),
  remote: z.boolean().optional(),
  experience_level: experienceLevelSchema.optional(),
  tags: z.array(z.string()).default([])
})

export type RawJob = z.infer<typeof rawJobSchema>

/**
 * Scrape request schema
 */
export interface ScrapeRequest {
  source: JobSource
  params?: Record<string, string>
  limit?: number
  test_mode?: boolean
}

/**
 * Scrape response schema from the Python API
 */
export const scrapeResponseSchema = z.object({
  success: z.boolean(),
  source: z.string(),
  count: z.number().optional(),
  jobs: z.array(rawJobSchema).optional(),
  scraped_at: z.string().datetime({ offset: true }).optional(),
  scrape_duration_ms: z.number().optional(),
  error: z.string().optional(),
  error_code: z.string().optional(),
  retry_after_seconds: z.number().optional()
})

export type ScrapeResponse = z.infer<typeof scrapeResponseSchema>

// ============================================================================
// Batch Scraping Types
// ============================================================================

/**
 * Request for batch scraping multiple sources
 */
export interface BatchScrapeRequest {
  sources: JobSource[]
  params?: Record<string, string>
  limit_per_source?: number
  test_mode?: boolean
}

/**
 * Result for a single source in batch operation
 */
export interface SourceResult {
  success: boolean
  source: string
  count: number
  jobs: RawJob[]
  scrape_duration_ms: number
  error?: string
  error_code?: string
}

/**
 * Response from batch scrape operation
 */
export interface BatchScrapeResponse {
  success: boolean
  total_sources: number
  successful_sources: number
  failed_sources: number
  total_jobs: number
  results: Record<string, SourceResult>
  scraped_at: string
  total_duration_ms: number
  errors_summary?: string[]
}

// ============================================================================
// Configuration
// ============================================================================

const SCRAPER_API_URL = process.env.SCRAPER_API_URL || 'http://localhost:8000'
const DEFAULT_TIMEOUT_MS = 30000

// ============================================================================
// Scraper Client Class
// ============================================================================

/**
 * HTTP client for the Python Scraper API
 */
export class ScraperClient {
  private readonly baseUrl: string
  private readonly timeout: number

  /**
   * Create a new ScraperClient instance
   *
   * @param baseUrl - Base URL of the scraper API (default: from env or localhost:8000)
   * @param timeout - Request timeout in milliseconds (default: 30000)
   */
  constructor(
    baseUrl: string = SCRAPER_API_URL,
    timeout: number = DEFAULT_TIMEOUT_MS
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, '') // Remove trailing slash
    this.timeout = timeout
  }

  /**
   * Scrape jobs from specified source
   *
   * @param request - Scrape request with source and optional params/limit
   * @returns ScrapeResponse with jobs or error details
   */
  async scrapeJobs(request: ScrapeRequest): Promise<ScrapeResponse> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      console.log(`[ScraperClient] Scraping from source: ${request.source}`)

      const response = await fetch(`${this.baseUrl}/api/jobs/scrape`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'JobAggregator/1.0'
        },
        body: JSON.stringify({
          source: request.source,
          params: request.params || {},
          limit: request.limit || 100,
          test_mode: request.test_mode ?? false
        }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')
        console.error(`[ScraperClient] API error: ${response.status} - ${errorText}`)

        return this.createErrorResponse(
          request.source,
          `HTTP ${response.status}: ${errorText}`,
          `HTTP_${response.status}`
        )
      }

      const data = await response.json()

      // Validate response (lenient - log warnings but return data)
      const validatedResponse = scrapeResponseSchema.safeParse(data)

      if (!validatedResponse.success) {
        console.warn('[ScraperClient] Response validation warning:', validatedResponse.error.issues)
        // Return raw data even if validation fails
        return data as ScrapeResponse
      }

      console.log(`[ScraperClient] Successfully scraped ${validatedResponse.data.count || 0} jobs from ${request.source}`)
      return validatedResponse.data

    } catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.error(`[ScraperClient] Request timed out for ${request.source}`)
          return this.createErrorResponse(
            request.source,
            `Request timed out after ${this.timeout}ms`,
            'TIMEOUT'
          )
        }

        console.error(`[ScraperClient] Request failed for ${request.source}: ${error.message}`)
        return this.createErrorResponse(
          request.source,
          error.message,
          'NETWORK_ERROR'
        )
      }

      console.error('[ScraperClient] Unknown error:', error)
      return this.createErrorResponse(
        request.source,
        'Unknown error occurred',
        'UNKNOWN_ERROR'
      )
    }
  }

  /**
   * Scrape jobs from multiple sources in a single batch request
   *
   * @param request - Batch scrape request with sources array
   * @returns BatchScrapeResponse with per-source results
   */
  async scrapeBatch(request: BatchScrapeRequest): Promise<BatchScrapeResponse> {
    const controller = new AbortController()
    // Longer timeout for batch operations (2x default)
    const timeoutId = setTimeout(() => controller.abort(), this.timeout * 2)

    try {
      console.log(`[ScraperClient] Batch scraping ${request.sources.length} sources: ${request.sources.join(', ')}`)

      const response = await fetch(`${this.baseUrl}/api/jobs/scrape-batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'JobAggregator/1.0'
        },
        body: JSON.stringify({
          sources: request.sources,
          params: request.params || {},
          limit_per_source: request.limit_per_source || 100,
          test_mode: request.test_mode ?? false
        }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')
        console.error(`[ScraperClient] Batch API error: ${response.status} - ${errorText}`)

        // Return error response
        return {
          success: false,
          total_sources: request.sources.length,
          successful_sources: 0,
          failed_sources: request.sources.length,
          total_jobs: 0,
          results: {},
          scraped_at: new Date().toISOString(),
          total_duration_ms: 0,
          errors_summary: [`HTTP ${response.status}: ${errorText}`]
        }
      }

      const data = await response.json()
      console.log(`[ScraperClient] Batch scrape completed: ${data.successful_sources}/${data.total_sources} sources, ${data.total_jobs} jobs`)

      return data as BatchScrapeResponse

    } catch (error) {
      clearTimeout(timeoutId)

      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      const isTimeout = error instanceof Error && error.name === 'AbortError'

      console.error(`[ScraperClient] Batch request failed: ${errorMessage}`)

      return {
        success: false,
        total_sources: request.sources.length,
        successful_sources: 0,
        failed_sources: request.sources.length,
        total_jobs: 0,
        results: {},
        scraped_at: new Date().toISOString(),
        total_duration_ms: 0,
        errors_summary: [isTimeout ? `Request timed out after ${this.timeout * 2}ms` : errorMessage]
      }
    }
  }

  /**
   * Check if the scraper API is healthy
   *
   * @returns true if the API is reachable and healthy
   */
  async healthCheck(): Promise<boolean> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout for health check

    try {
      const response = await fetch(`${this.baseUrl}/api/jobs/health`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        console.warn(`[ScraperClient] Health check failed: ${response.status}`)
        return false
      }

      const data = await response.json()
      console.log('[ScraperClient] Health check passed:', data)
      return data.status === 'healthy' || data.status === 'ok' || response.ok

    } catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof Error && error.name === 'AbortError') {
        console.warn('[ScraperClient] Health check timed out')
      } else {
        console.warn('[ScraperClient] Health check failed:', error)
      }

      return false
    }
  }

  /**
   * Get available sources from the scraper API
   */
  async getSources(): Promise<Array<{
    name: string
    display_name: string
    type: string
    enabled: boolean
    rate_limit_per_minute: number
    requires_proxy: boolean
  }>> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    try {
      const response = await fetch(`${this.baseUrl}/api/jobs/sources`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      return data.sources || []
    } catch (error) {
      clearTimeout(timeoutId)
      console.error('[ScraperClient] Failed to get sources:', error)
      return []
    }
  }

  /**
   * Get the base URL of the scraper API
   */
  getBaseUrl(): string {
    return this.baseUrl
  }

  /**
   * Create an error response object
   */
  private createErrorResponse(
    source: string,
    error: string,
    errorCode: string
  ): ScrapeResponse {
    return {
      success: false,
      source,
      error,
      error_code: errorCode
    }
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

/**
 * Singleton scraper client instance
 */
export const scraperClient = new ScraperClient()
