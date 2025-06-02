/**
 * Voice Agent Server Entry Point
 * Starts the Express server and initializes services
 */

import { createServer } from 'http';
import { createApp } from './app';
import { config, validateConfig } from './config';
import logger from './utils/logger';
import { initializeWebSocketServer } from './websocket/server';
import { initializeOpenAIRealtimeWebSocket } from './routes/openai-realtime.routes';

/**
 * Start the server
 */
async function startServer(): Promise<void> {
  try {
    // Validate configuration
    validateConfig();
    logger.info('Configuration validated successfully');

    // Create Express app
    const app = createApp();

    // Create HTTP server
    const httpServer = createServer(app);

    // Initialize WebSocket server
    const wsServer = initializeWebSocketServer(httpServer);
    
    // Initialize OpenAI Realtime WebSocket
    initializeOpenAIRealtimeWebSocket(httpServer);

    // Start listening
    httpServer.listen(config.port, () => {
      logger.info(`Voice Agent server started`, {
        port: config.port,
        environment: config.env,
        geminiModel: config.gemini.model,
        twilioConfigured: !!config.twilio.accountSid,
      });

      console.log(`
🚀 Voice Agent Server is running!
📞 Port: ${config.port}
🌍 Environment: ${config.env}
🤖 Gemini Model: ${config.gemini.model}
📱 Twilio: ${config.twilio.accountSid ? 'Configured' : 'Not configured (test mode)'}
🔌 WebSocket: ws://localhost:${config.port}/ws

Available endpoints:
- Health Check: http://localhost:${config.port}/health
- Twilio Voice Webhook: http://localhost:${config.port}/webhooks/twilio/voice
- Twilio Status Webhook: http://localhost:${config.port}/webhooks/twilio/status
- WebSocket: ws://localhost:${config.port}/ws

For testing with Twilio:
1. Use ngrok to expose your local server: ngrok http ${config.port}
2. Configure your Twilio phone number webhooks:
   - Voice URL: https://your-ngrok-url.ngrok.io/webhooks/twilio/voice
   - Status Callback: https://your-ngrok-url.ngrok.io/webhooks/twilio/status
      `);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      httpServer.close(() => {
        logger.info('HTTP server closed');
        wsServer.shutdown();
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully');
      httpServer.close(() => {
        logger.info('HTTP server closed');
        wsServer.shutdown();
        process.exit(0);
      });
    });

  } catch (error) {
    logger.error('Failed to start server', { error });
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();