/**
 * Streaming Chat Routes
 * Provides real-time streaming responses for natural conversation flow
 */

import { Router, Request, Response } from 'express';
import { GeminiService } from '../services/gemini.service';
import { StreamingTTSService, streamingTTS } from '../services/streaming-tts.service';
import logger from '../utils/logger';
import { costTracker } from '../utils/cost-tracker';

const router = Router();

// Store active streaming sessions
const activeStreamingSessions = new Map<string, {
  geminiService: GeminiService;
  ttsProcessor: ReturnType<StreamingTTSService['createIncrementalProcessor']>;
}>();

/**
 * POST /api/chat/stream/start
 * Start a new streaming chat session
 */
router.post('/start', async (req: Request, res: Response) => {
  try {
    const sessionId = req.ip || 'default';
    
    // Create new services for this session
    const geminiService = new GeminiService();
    const ttsProcessor = streamingTTS.createIncrementalProcessor();
    
    // Store session
    activeStreamingSessions.set(sessionId, {
      geminiService,
      ttsProcessor
    });
    
    // Start conversation
    geminiService.startConversation(sessionId);
    
    // Initialize cost tracking
    costTracker.startSession(sessionId);
    
    logger.info('Started streaming chat session', { sessionId });
    
    res.json({ 
      success: true, 
      sessionId,
      message: 'Streaming chat session started'
    });
  } catch (error) {
    logger.error('Failed to start streaming chat session', { error });
    res.status(500).json({ error: 'Failed to start session' });
  }
});

/**
 * POST /api/chat/stream/message
 * Send a message and receive streaming audio chunks
 */
router.post('/message', async (req: Request, res: Response): Promise<void> => {
  const { message } = req.body;
  const sessionId = req.ip || 'default';
  
  const session = activeStreamingSessions.get(sessionId);
  if (!session) {
    res.status(400).json({ error: 'No active session' });
    return;
  }
  
  try {
    
    logger.info('Streaming chat message received', { sessionId, message });
    
    // Set up SSE (Server-Sent Events) for streaming
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });
    
    // Keep connection alive
    const keepAlive = setInterval(() => {
      res.write(':keepalive\n\n');
    }, 15000);
    
    try {
      // Get AI response
      const startTime = Date.now();
      const response = await session.geminiService.generateResponse(sessionId, message);
      const textGenerationTime = Date.now() - startTime;
      
      // Track chat cost
      costTracker.trackChatUsage(sessionId, message, response);
      
      // Send text response immediately
      res.write(`event: text\ndata: ${JSON.stringify({ 
        text: response,
        generationTime: textGenerationTime 
      })}\n\n`);
      
      // Process text into chunks and generate audio progressively
      const chunks = session.ttsProcessor.addText(response);
      const finalChunks = session.ttsProcessor.flush();
      const allChunks = [...chunks, ...finalChunks];
      
      logger.info('Streaming TTS: Processing response', {
        sessionId,
        responseLength: response.length,
        chunkCount: allChunks.length
      });
      
      // Generate and send audio chunks
      for (let i = 0; i < allChunks.length; i++) {
        const chunk = allChunks[i];
        const chunkStartTime = Date.now();
        
        try {
          // Generate audio for this chunk
          const audioBuffer = await streamingTTS.generateAudioForChunk(chunk);
          const audioGenerationTime = Date.now() - chunkStartTime;
          
          // Track TTS cost
          costTracker.trackTTSUsage(sessionId, chunk);
          
          // Send audio chunk as base64
          res.write(`event: audio\ndata: ${JSON.stringify({
            chunkIndex: i,
            totalChunks: allChunks.length,
            audio: audioBuffer.toString('base64'),
            text: chunk,
            generationTime: audioGenerationTime,
            isLast: i === allChunks.length - 1
          })}\n\n`);
          
          logger.info('Streaming TTS: Sent audio chunk', {
            sessionId,
            chunkIndex: i,
            chunkLength: chunk.length,
            audioSize: audioBuffer.length,
            generationTime: audioGenerationTime
          });
        } catch (error) {
          logger.error('Failed to generate audio chunk', {
            sessionId,
            chunkIndex: i,
            chunk,
            error
          });
          
          // Send error event but continue with other chunks
          res.write(`event: error\ndata: ${JSON.stringify({
            chunkIndex: i,
            error: 'Failed to generate audio for chunk'
          })}\n\n`);
        }
      }
      
      // Send completion event
      res.write(`event: complete\ndata: ${JSON.stringify({
        totalTime: Date.now() - startTime,
        textGenerationTime,
        chunkCount: allChunks.length
      })}\n\n`);
      
    } catch (error) {
      logger.error('Streaming chat error', { sessionId, error });
      res.write(`event: error\ndata: ${JSON.stringify({
        error: 'Failed to process message'
      })}\n\n`);
    } finally {
      clearInterval(keepAlive);
      res.end();
    }
  } catch (error) {
    logger.error('Failed to handle streaming message', { error });
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to process message' });
    }
  }
});

/**
 * POST /api/chat/stream/end
 * End a streaming chat session
 */
router.post('/end', async (req: Request, res: Response) => {
  try {
    const sessionId = req.ip || 'default';
    
    const session = activeStreamingSessions.get(sessionId);
    if (session) {
      session.geminiService.endConversation(sessionId);
      activeStreamingSessions.delete(sessionId);
    }
    
    // Get cost summary
    const costSummary = costTracker.endSession(sessionId);
    
    logger.info('Ended streaming chat session', { sessionId, ...costSummary });
    
    res.json({ 
      success: true,
      sessionId,
      cost: costSummary
    });
  } catch (error) {
    logger.error('Failed to end streaming chat session', { error });
    res.status(500).json({ error: 'Failed to end session' });
  }
});

export default router;