/**
 * Checkpoint Response API
 *
 * Allows the frontend to respond to checkpoints during the auto-apply process.
 * When a checkpoint is hit (login, captcha, review, etc.), the frontend receives
 * an event and can respond via this endpoint.
 */

import type { ApiRouteConfig, Handlers } from 'motia'
import { z, ZodError } from 'zod'
import type { CheckpointResponse } from '../services/computer-use'

// ============================================================================
// Schemas
// ============================================================================

const checkpointResponseBodySchema = z.object({
  continue: z.boolean(),
  approved: z.boolean().optional(),
  answers: z.any().optional(), // Record<string, string> - using z.any() for Zod v4 compatibility
  credentials: z
    .object({
      username: z.string().optional(),
      password: z.string().optional(),
    })
    .optional(),
  captchaSolution: z.string().optional(),
  action: z.string().optional(),
})

const successResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  checkpointId: z.string(),
})

const errorResponseSchema = z.object({
  error: z.string(),
})

// ============================================================================
// Configuration
// ============================================================================

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'CheckpointResponse',
  path: '/checkpoints/:checkpointId/respond',
  method: 'POST',
  description: 'Respond to a checkpoint during auto-apply process',
  bodySchema: checkpointResponseBodySchema,
  emits: [],
  responseSchema: {
    200: successResponseSchema,
    400: errorResponseSchema,
    404: errorResponseSchema,
  },
  flows: ['auto-apply'],
}

// ============================================================================
// Handler
// ============================================================================

export const handler: Handlers['CheckpointResponse'] = async (
  req,
  { state, logger }
) => {
  const { checkpointId } = req.pathParams

  try {
    const body = checkpointResponseBodySchema.parse(req.body)

    // Get the checkpoint from state
    const checkpoint = await state.get<{
      applicationId: string
      type: string
      data: unknown
      status: string
      createdAt: string
    }>('checkpoints', checkpointId)

    if (!checkpoint) {
      return {
        status: 404,
        body: { error: 'Checkpoint not found' },
      }
    }

    if (checkpoint.status !== 'waiting') {
      return {
        status: 400,
        body: {
          error: `Checkpoint is not waiting for response. Current status: ${checkpoint.status}`,
        },
      }
    }

    // Build the checkpoint response
    const response: CheckpointResponse = {
      continue: body.continue,
      approved: body.approved,
      answers: body.answers,
      credentials: body.credentials,
      captchaSolution: body.captchaSolution,
      action: body.action,
    }

    // Update checkpoint with response
    await state.set('checkpoints', checkpointId, {
      ...checkpoint,
      status: 'responded',
      response,
      respondedAt: new Date().toISOString(),
    })

    logger.info('Checkpoint response received', {
      checkpointId,
      applicationId: checkpoint.applicationId,
      type: checkpoint.type,
      continue: body.continue,
    })

    return {
      status: 200,
      body: {
        success: true,
        message: 'Checkpoint response recorded',
        checkpointId,
      },
    }
  } catch (error) {
    if (error instanceof ZodError) {
      logger.error('Validation failed', { error: error.message })
      return {
        status: 400,
        body: {
          error: 'Validation failed: ' + error.errors.map((e) => e.message).join(', '),
        },
      }
    }
    throw error
  }
}
