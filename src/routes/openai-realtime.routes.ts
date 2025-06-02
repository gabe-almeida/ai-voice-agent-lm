/**
 * OpenAI Realtime API Routes
 * Handles WebSocket upgrade for OpenAI Realtime connections
 */

import { Router } from 'express';
import { WebSocketServer } from 'ws';
import { handleOpenAIRealtimeWebSocket } from '../websocket/openai-realtime.ws';
import logger from '../utils/logger';

const router = Router();

// Store WebSocket server instance
let wss: WebSocketServer | null = null;

/**
 * Initialize OpenAI Realtime WebSocket server
 */
export function initializeOpenAIRealtimeWebSocket(server: any) {
  wss = new WebSocketServer({
    noServer: true,
    path: '/ws/openai-realtime'
  });

  // Handle upgrade requests - check if already has upgrade listeners
  const existingListeners = server.listeners('upgrade');
  
  if (existingListeners.length > 0) {
    // Wrap existing upgrade handler
    const originalHandler = existingListeners[0];
    server.removeListener('upgrade', originalHandler);
    
    server.on('upgrade', (request: any, socket: any, head: any) => {
      const pathname = request.url;
      
      if (pathname === '/ws/openai-realtime') {
        wss?.handleUpgrade(request, socket, head, (ws) => {
          wss?.emit('connection', ws, request);
        });
      } else {
        // Call original handler for other paths
        originalHandler(request, socket, head);
      }
    });
  } else {
    // No existing handler, add our own
    server.on('upgrade', (request: any, socket: any, head: any) => {
      const pathname = request.url;
      
      if (pathname === '/ws/openai-realtime') {
        wss?.handleUpgrade(request, socket, head, (ws) => {
          wss?.emit('connection', ws, request);
        });
      } else {
        // Close socket for unknown paths
        socket.destroy();
      }
    });
  }

  // Handle connections
  wss.on('connection', (ws, request) => {
    logger.info('New OpenAI Realtime WebSocket connection');
    handleOpenAIRealtimeWebSocket(ws, request);
  });

  logger.info('OpenAI Realtime WebSocket server initialized');
}

// HTTP endpoint to check status
router.get('/status', (_req, res) => {
  res.json({
    service: 'OpenAI Realtime API',
    status: 'ready',
    websocket: '/ws/openai-realtime',
    features: [
      '300-800ms response time',
      'Bidirectional audio streaming',
      'Emma system prompt integration',
      'Voice Activity Detection'
    ]
  });
});

export default router;