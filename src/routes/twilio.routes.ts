/**
 * Twilio webhook routes
 * Handles incoming calls and call status updates
 */

import { Router, Request, Response } from 'express';
import { TwilioService } from '../services/twilio.service';
import { GeminiService } from '../services/gemini.service';
import logger from '../utils/logger';

const router = Router();

// Store active conversations (in production, use Redis)
const activeConversations = new Map<string, GeminiService>();

/**
 * Handle incoming voice calls
 * POST /webhooks/twilio/voice
 */
router.post('/voice', async (req: Request, res: Response) => {
  try {
    const { CallSid, From, To, CallStatus } = req.body;
    
    logger.info('Incoming call webhook', {
      callSid: CallSid,
      from: From,
      to: To,
      status: CallStatus,
    });

    // For MVP, we'll create a simple conversation flow
    if (CallStatus === 'ringing' || CallStatus === 'in-progress') {
      // Initialize Gemini conversation for this call
      const geminiService = new GeminiService(
        'You are a helpful voice assistant answering a phone call. Be friendly and professional. Keep responses brief and conversational.'
      );
      activeConversations.set(CallSid, geminiService);
      
      // Start the conversation
      await geminiService.startConversation(`Incoming call from ${From}`);
      
      // Create initial greeting
      const greeting = await geminiService.sendMessage('The caller just connected. Please greet them.');
      
      // Create TwiML response with greeting and gather input
      const twiml = TwilioService.createGatherResponse(
        greeting,
        `/webhooks/twilio/gather?CallSid=${CallSid}`,
        {
          input: ['speech'],
          speechTimeout: '2',
        }
      );
      
      res.type('text/xml');
      res.send(twiml);
    } else {
      // Call ended, clean up
      const geminiService = activeConversations.get(CallSid);
      if (geminiService) {
        geminiService.endConversation(CallSid);
        activeConversations.delete(CallSid);
      }
      
      res.type('text/xml');
      res.send(TwilioService.createVoiceResponse('Thank you for calling. Goodbye!'));
    }
  } catch (error) {
    logger.error('Error handling voice webhook', { error });
    res.type('text/xml');
    res.send(TwilioService.createVoiceResponse('I apologize, but I\'m having technical difficulties. Please try again later.'));
  }
});

/**
 * Handle gathered speech input
 * POST /webhooks/twilio/gather
 */
router.post('/gather', async (req: Request, res: Response) => {
  try {
    const { CallSid, SpeechResult, Digits } = req.body;
    const userInput = SpeechResult || Digits || '';
    
    logger.info('Gathered input', {
      callSid: CallSid,
      input: userInput,
    });
    
    // Get the conversation for this call
    const geminiService = activeConversations.get(CallSid);
    if (!geminiService) {
      throw new Error('No active conversation found for this call');
    }
    
    // Send user input to Gemini and get response
    const response = await geminiService.sendMessage(userInput);
    
    // Continue gathering input
    const twiml = TwilioService.createGatherResponse(
      response,
      `/webhooks/twilio/gather?CallSid=${CallSid}`,
      {
        input: ['speech'],
        speechTimeout: '2',
      }
    );
    
    res.type('text/xml');
    res.send(twiml);
  } catch (error) {
    logger.error('Error handling gather webhook', { error });
    res.type('text/xml');
    res.send(TwilioService.createVoiceResponse('I apologize, but I didn\'t understand that. Could you please repeat?'));
  }
});

/**
 * Handle call status updates
 * POST /webhooks/twilio/status
 */
router.post('/status', async (req: Request, res: Response) => {
  try {
    const { CallSid, CallStatus, CallDuration } = req.body;
    
    logger.info('Call status update', {
      callSid: CallSid,
      status: CallStatus,
      duration: CallDuration,
    });
    
    // Clean up completed calls
    if (CallStatus === 'completed' || CallStatus === 'failed' || CallStatus === 'canceled') {
      const geminiService = activeConversations.get(CallSid);
      if (geminiService) {
        geminiService.endConversation(CallSid);
        activeConversations.delete(CallSid);
      }
      
      // Release the phone number back to the pool
      TwilioService.releaseNumberOnCallEnd(CallSid);
    }
    
    res.status(200).send('OK');
  } catch (error) {
    logger.error('Error handling status webhook', { error });
    res.status(500).send('Internal Server Error');
  }
});

export default router;