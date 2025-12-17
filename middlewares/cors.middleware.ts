import type { ApiMiddleware } from 'motia'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
}

export const corsMiddleware: ApiMiddleware = async (req, ctx, next) => {
  // Handle preflight OPTIONS requests
  if (req.headers['access-control-request-method']) {
    ctx.logger.debug('Handling CORS preflight request')
    return {
      status: 204,
      headers: CORS_HEADERS,
      body: '',
    }
  }

  // Call next middleware/handler and add CORS headers to response
  const response = await next()

  // Merge CORS headers with existing response headers
  response.headers = {
    ...response.headers,
    ...CORS_HEADERS,
  }

  return response
}

export default corsMiddleware
