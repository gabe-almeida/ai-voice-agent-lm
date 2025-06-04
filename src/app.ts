/**
 * Express application setup
 * Configures middleware and routes
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { config } from './config';
import logger, { logRequest } from './utils/logger';
import healthRoutes from './routes/health.routes';
import twilioRoutes from './routes/twilio.routes';
import chatRoutes from './routes/chat.routes';
import chatStreamingRoutes from './routes/chat-streaming.routes';
import openaiRealtimeRoutes from './routes/openai-realtime.routes';
import appointmentCancellationRoutes from './routes/appointment-cancellation.routes';

/**
 * Create and configure Express application
 */
export function createApp(): Application {
  const app = express();

  // Security middleware with relaxed CSP for demo
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'", "blob:"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        mediaSrc: ["'self'", "blob:"],
        connectSrc: ["'self'"],
      },
    },
  }));
  
  // CORS configuration
  app.use(cors({
    origin: config.env === 'production' ? false : '*',
    credentials: true,
  }));

  // Body parsing middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Request logging
  app.use(logRequest);

  // Serve static files from public directory
  app.use(express.static(path.join(__dirname, '../public')));

  // Routes
  app.use('/health', healthRoutes);
  app.use('/webhooks/twilio', twilioRoutes);
  app.use('/api/chat', chatRoutes);
  app.use('/api/chat/stream', chatStreamingRoutes);
  app.use('/api/openai-realtime', openaiRealtimeRoutes);
  app.use('/api/appointments', appointmentCancellationRoutes);

  // Root endpoint - serve landing page
  app.get('/', (_req: Request, res: Response) => {
    res.sendFile('landing.html', { root: path.join(__dirname, '../public') });
  });

  // API info endpoint
  app.get('/api', (_req: Request, res: Response) => {
    res.json({
      message: 'Voice Agent API',
      version: '1.0.0',
      endpoints: {
        health: '/health',
        webhooks: {
          twilio: {
            voice: '/webhooks/twilio/voice',
            status: '/webhooks/twilio/status',
          },
        },
        chat: {
          start: '/api/chat/start',
          message: '/api/chat/message',
          end: '/api/chat/end',
          status: '/api/chat/status',
        },
        ui: 'http://localhost:3000/',
      },
    });
  });

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      error: 'Not Found',
      message: `Cannot ${req.method} ${req.path}`,
    });
  });

  // Error handling middleware
  app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    logger.error('Unhandled error', {
      error: err.message,
      stack: err.stack,
      url: req.url,
      method: req.method,
    });

    res.status(500).json({
      error: 'Internal Server Error',
      message: config.env === 'development' ? err.message : 'Something went wrong',
    });
  });

  return app;
}