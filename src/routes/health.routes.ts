/**
 * Health check routes
 * Provides endpoints for monitoring system health
 */

import { Router, Request, Response } from 'express';
import { config } from '../config';

const router = Router();

/**
 * Basic health check endpoint
 * GET /health
 */
router.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: config.env,
    version: '1.0.0',
  });
});

/**
 * Detailed health check with service status
 * GET /health/detailed
 */
router.get('/detailed', async (_req: Request, res: Response) => {
  const healthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: config.env,
    version: '1.0.0',
    services: {
      gemini: {
        status: config.gemini.apiKey ? 'configured' : 'not configured',
        model: config.gemini.model,
      },
      twilio: {
        status: config.twilio.accountSid ? 'configured' : 'not configured',
        phoneNumber: config.twilio.phoneNumber ? 'configured' : 'not configured',
      },
    },
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  };

  res.json(healthStatus);
});

export default router;