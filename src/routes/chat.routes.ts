/**
 * Chat API routes for browser-based testing
 * Provides a simple interface to interact with the voice agent
 */

import { Router, Request, Response } from 'express';
import { GeminiService } from '../services/gemini.service';
import { GeminiTTSService, GeminiVoice } from '../services/gemini-tts.service';
import logger from '../utils/logger';
import { costTracker } from '../utils/cost-tracker';

const router = Router();

// Store active chat sessions (in production, use Redis)
const activeSessions = new Map<string, GeminiService>();
const ttsService = new GeminiTTSService(GeminiVoice.CALLIRRHOE); // Using Callirrhoe for more natural conversation

// Track active TTS requests to prevent overlapping
const activeTTSRequests = new Set<string>();

/**
 * Start a new chat session
 * POST /api/chat/start
 */
router.post('/start', async (req: Request, res: Response) => {
  try {
    // Generate a simple session ID (in production, use proper session management)
    const sessionId = req.ip || 'default';
    
    // Create a new Gemini service instance for this session
    const geminiService = new GeminiService(
      `You are a helpful voice assistant having a phone conversation. 
      Be friendly, professional, and conversational. 
      Keep your responses brief and natural - as if you're speaking on the phone.
      Don't use any formatting, markdown, or bullet points.
      Respond as if you're having a natural conversation.`
    );
    
    // Store the session
    activeSessions.set(sessionId, geminiService);
    
    // Start the conversation
    await geminiService.startConversation('User connected via web interface');
    
    // Get initial greeting
    const greeting = await geminiService.sendMessage(
      'A user just connected to speak with you. Please greet them warmly and ask how you can help.'
    );
    
    // Start cost tracking
    costTracker.startSession(sessionId);
    
    // Track the greeting cost
    costTracker.trackChatUsage(
      sessionId,
      'A user just connected to speak with you. Please greet them warmly and ask how you can help.',
      greeting
    );
    
    logger.info('Started chat session', { sessionId });
    
    res.json({
      success: true,
      sessionId,
      greeting,
    });
  } catch (error) {
    logger.error('Error starting chat session', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to start conversation',
    });
  }
});

/**
 * Send a message in the chat
 * POST /api/chat/message
 */
router.post('/message', async (req: Request, res: Response): Promise<void> => {
  try {
    const { message } = req.body;
    const sessionId = req.ip || 'default';
    
    if (!message) {
      res.status(400).json({
        success: false,
        error: 'Message is required',
      });
      return;
    }
    
    // Get the session
    let geminiService = activeSessions.get(sessionId);
    
    // If no session exists, create one
    if (!geminiService) {
      geminiService = new GeminiService();
      await geminiService.startConversation('User reconnected');
      activeSessions.set(sessionId, geminiService);
    }
    
    logger.info('Chat message received', { sessionId, message });
    
    // Send message to Gemini and get response
    const response = await geminiService.sendMessage(message);
    
    // Track chat cost
    costTracker.trackChatUsage(sessionId, message, response);
    
    logger.info('Chat response sent', { sessionId, response });
    
    res.json({
      success: true,
      response,
    });
  } catch (error) {
    logger.error('Error processing chat message', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to process message',
    });
  }
});

/**
 * Get TTS audio for text
 * POST /api/chat/tts
 */
router.post('/tts', async (req: Request, res: Response): Promise<void> => {
  try {
    const { text, voice } = req.body;
    
    if (!text) {
      res.status(400).json({
        success: false,
        error: 'Text is required',
      });
      return;
    }
    
    const sessionId = req.ip || 'default';
    
    // Check if TTS is already in progress for this session
    if (activeTTSRequests.has(sessionId)) {
      logger.warn('TTS request already in progress', { sessionId });
      res.status(429).json({
        success: false,
        error: 'TTS request already in progress',
      });
      return;
    }
    
    // Mark TTS as active
    activeTTSRequests.add(sessionId);
    
    logger.info('TTS request received', { text: text.substring(0, 50) + '...', voice });
    
    try {
      // Generate audio using Gemini TTS
      const audioBuffer = await ttsService.textToSpeech(text, voice);
      
      // Track TTS cost
      costTracker.trackTTSUsage(sessionId, text);
    
      // Send audio as response
      res.set({
        'Content-Type': 'audio/wav',
        'Content-Length': audioBuffer.length.toString(),
      });
      
      res.send(audioBuffer);
    } finally {
      // Always remove from active requests
      activeTTSRequests.delete(sessionId);
    }
  } catch (error) {
    logger.error('Error generating TTS', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to generate speech',
    });
  }
});

/**
 * End a chat session
 * POST /api/chat/end
 */
router.post('/end', async (req: Request, res: Response) => {
  try {
    const sessionId = req.ip || 'default';
    
    // Get and end the session
    const geminiService = activeSessions.get(sessionId);
    if (geminiService) {
      geminiService.endConversation(sessionId);
      activeSessions.delete(sessionId);
    }
    
    // End cost tracking and get final cost
    const sessionCost = costTracker.endSession(sessionId);
    
    logger.info('Ended chat session', {
      sessionId,
      totalCost: sessionCost?.totalCost || 0,
      chatCost: sessionCost?.chatCosts.totalCost || 0,
      ttsCost: sessionCost?.ttsCosts.totalCost || 0,
    });
    
    res.json({
      success: true,
      message: 'Chat session ended',
    });
  } catch (error) {
    logger.error('Error ending chat session', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to end session',
    });
  }
});

/**
 * Get session status
 * GET /api/chat/status
 */
router.get('/status', (req: Request, res: Response) => {
  const sessionId = req.ip || 'default';
  const hasActiveSession = activeSessions.has(sessionId);
  const sessionCost = costTracker.getSessionCost(sessionId);
  
  res.json({
    success: true,
    sessionId,
    active: hasActiveSession,
    totalSessions: activeSessions.size,
    currentCost: sessionCost?.totalCost || 0,
    costBreakdown: sessionCost ? {
      chat: sessionCost.chatCosts.totalCost,
      tts: sessionCost.ttsCosts.totalCost,
    } : null,
  });
});

/**
 * Get available TTS voices
 * GET /api/chat/voices
 */
router.get('/voices', (_req: Request, res: Response) => {
  res.json({
    success: true,
    voices: GeminiTTSService.getAvailableVoices(),
  });
});

/**
 * Get cost summary
 * GET /api/chat/costs
 */
router.get('/costs', (_req: Request, res: Response) => {
  const costs = costTracker.getTotalCosts();
  
  res.json({
    success: true,
    ...costs,
    note: 'Costs are estimates based on current Gemini API pricing',
  });
});

export default router;