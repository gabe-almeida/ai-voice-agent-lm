/**
 * Twilio Service
 * Handles phone call operations and TwiML generation
 */

import twilio from 'twilio';
import { config } from '../config';
import logger from '../utils/logger';

/**
 * Initialize Twilio client (only if valid credentials are provided)
 */
// Removed: let twilioClient: any = null;

export class TwilioService { // Renamed from TwilioServiceInternal and exported
  public static twilioClientInstance: any = null;
  private static availableTwilioNumbers: string[] = [];
  private static numbersInUse: Set<string> = new Set();
  private static callSidToFromNumber: Map<string, string> = new Map();

  static {
    try {
      if (config.twilio.accountSid && config.twilio.authToken &&
          config.twilio.accountSid.startsWith('AC')) {
        this.twilioClientInstance = twilio(config.twilio.accountSid, config.twilio.authToken);
        logger.info('Twilio client initialized successfully');

        if ((config.twilio as any).phoneNumbers) { // Temporary 'as any' until config type is updated
          this.availableTwilioNumbers = ((config.twilio as any).phoneNumbers as string).split(',').map((num: string) => num.trim()).filter((num: string) => num.length > 0);
          logger.info(`Loaded ${this.availableTwilioNumbers.length} Twilio numbers for outbound calls.`);
        } else {
          logger.warn('TWILIO_PHONE_NUMBERS not configured in config.twilio.phoneNumbers. Outbound calls using a pool will not work.');
        }
      } else {
        logger.warn('Twilio client not initialized - invalid or missing credentials');
      }
    } catch (error) {
      logger.error('Failed to initialize Twilio client', { error });
    }
  }

  private static getAvailableNumber(): string | null {
    for (const number of this.availableTwilioNumbers) {
      if (!this.numbersInUse.has(number)) {
        return number;
      }
    }
    logger.warn('No available Twilio numbers for an outbound call.');
    return null;
  }

  /**
   * Validate Twilio webhook signature
   */
  // Methods like validateWebhookSignature, createVoiceResponse etc. remain static methods of TwilioService
  static validateWebhookSignature(
    signature: string,
    url: string,
    params: any
  ): boolean {
    if (!config.twilio.authToken) {
      logger.warn('Skipping Twilio signature validation - no auth token configured');
      return true;
    }
    
    return twilio.validateRequest( // twilio.validateRequest is a static method from the 'twilio' library itself
      config.twilio.authToken,
      signature,
      url,
      params
    );
  }

  /**
   * Create a TwiML response for incoming calls
   */
  static createVoiceResponse(message: string): string {
    const twiml = new twilio.twiml.VoiceResponse();
    
    // For MVP, we'll use simple text-to-speech
    twiml.say({
      voice: 'alice',
      language: 'en-US'
    }, message);
    
    return twiml.toString();
  }

  /**
   * Create a TwiML response that gathers user input
   */
  static createGatherResponse(
    prompt: string,
    actionUrl: string,
    options: {
      numDigits?: number;
      timeout?: number;
      finishOnKey?: string;
      speechTimeout?: string;
      input?: Array<'dtmf' | 'speech'>;
    } = {}
  ): string {
    const twiml = new twilio.twiml.VoiceResponse();
    
    const gather = twiml.gather({
      action: actionUrl,
      method: 'POST',
      numDigits: options.numDigits || 1,
      timeout: options.timeout || 5,
      finishOnKey: options.finishOnKey || '#',
      speechTimeout: options.speechTimeout || 'auto',
      input: options.input || ['dtmf', 'speech'],
    });
    
    gather.say({
      voice: 'alice',
      language: 'en-US'
    }, prompt);
    
    // If no input, repeat the prompt
    twiml.redirect(actionUrl);
    
    return twiml.toString();
  }

  /**
   * Create a TwiML response that connects to a conference
   */
  static createConferenceResponse(
    conferenceName: string,
    options: {
      muted?: boolean;
      startConferenceOnEnter?: boolean;
      endConferenceOnExit?: boolean;
      waitUrl?: string;
    } = {}
  ): string {
    const twiml = new twilio.twiml.VoiceResponse();
    
    const dial = twiml.dial();
    dial.conference({
      muted: options.muted || false,
      startConferenceOnEnter: options.startConferenceOnEnter !== false,
      endConferenceOnExit: options.endConferenceOnExit || false,
      waitUrl: options.waitUrl,
    }, conferenceName);
    
    return twiml.toString();
  }

  /**
   * Make an outbound call using an available number from the pool
   */
  static async makeOutboundCall(
    to: string,
    // from: string, // 'from' is now determined by the pool
    url: string,
    statusCallbackUrl?: string // Optional: URL for status callbacks
  ): Promise<any> {
    if (!this.twilioClientInstance) { // Changed TwilioServiceInternal to 'this'
      throw new Error('Twilio client not initialized - missing credentials');
    }

    const fromNumber = this.getAvailableNumber(); // Changed TwilioServiceInternal to 'this'
    if (!fromNumber) {
      throw new Error('No available Twilio numbers to make outbound call.');
    }
    
    try {
      this.numbersInUse.add(fromNumber); // Changed TwilioServiceInternal to 'this'
      const callPayload: any = {
        to,
        from: fromNumber,
        url,
        method: 'POST',
      };
      if (statusCallbackUrl) {
        callPayload.statusCallback = statusCallbackUrl;
        callPayload.statusCallbackEvent = ['initiated', 'ringing', 'answered', 'completed', 'failed', 'canceled', 'no-answer']; // Added more events
        callPayload.statusCallbackMethod = 'POST';
      }

      const call = await this.twilioClientInstance.calls.create(callPayload); // Changed TwilioServiceInternal to 'this'
      
      this.callSidToFromNumber.set(call.sid, fromNumber); // Changed TwilioServiceInternal to 'this'

      logger.info('Initiated outbound call from pool', {
        callSid: call.sid,
        to,
        from: fromNumber,
      });
      
      return call;
    } catch (error) {
      this.numbersInUse.delete(fromNumber); // Changed TwilioServiceInternal to 'this'
      logger.error('Failed to make outbound call from pool', { error, to, from: fromNumber });
      throw error;
    }
  }

  /**
   * Release a Twilio number when a call ends.
   * To be called from your status callback handler.
   */
  static releaseNumberOnCallEnd(callSid: string): void {
    const fromNumber = this.callSidToFromNumber.get(callSid); // Changed TwilioServiceInternal to 'this'
    if (fromNumber) {
      this.numbersInUse.delete(fromNumber); // Changed TwilioServiceInternal to 'this'
      this.callSidToFromNumber.delete(callSid); // Changed TwilioServiceInternal to 'this'
      logger.info(`Released Twilio number ${fromNumber} from call ${callSid}. Numbers in use: ${this.numbersInUse.size}`); // Changed TwilioServiceInternal to 'this'
    } else {
      logger.warn(`Could not find 'fromNumber' for callSid ${callSid} to release.`);
    }
  }

  /**
   * Get call details
   */
  static async getCallDetails(callSid: string): Promise<any> {
    if (!this.twilioClientInstance) { // Changed TwilioServiceInternal to 'this'
      throw new Error('Twilio client not initialized - missing credentials');
    }
    
    try {
      const call = await this.twilioClientInstance.calls(callSid).fetch(); // Changed TwilioServiceInternal to 'this'
      return call;
    } catch (error) {
      logger.error('Failed to get call details', { error, callSid });
      throw error;
    }
  }

  /**
   * End a call
   */
  static async endCall(callSid: string): Promise<void> {
    if (!this.twilioClientInstance) { // Changed TwilioServiceInternal to 'this'
      throw new Error('Twilio client not initialized - missing credentials');
    }
    
    try {
      await this.twilioClientInstance.calls(callSid).update({ // Changed TwilioServiceInternal to 'this'
        status: 'completed',
      });
      
      logger.info('Ended call', { callSid });
    } catch (error) {
      logger.error('Failed to end call', { error, callSid });
      throw error;
    }
  }
}
// Expose the TwilioService client instance for direct use if needed elsewhere, though prefer service methods.
export const twilioClient = TwilioService.twilioClientInstance; // Changed TwilioServiceInternal to TwilioService