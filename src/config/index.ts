/**
 * Configuration module for the Voice Agent system
 * Loads and validates environment variables
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

/**
 * Application configuration object
 * All environment variables are accessed through this module
 */
export const config = {
  // Server configuration
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  
  // Twilio configuration
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    phoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
    phoneNumbers: process.env.TWILIO_PHONE_NUMBERS?.split(',').map(num => num.trim()) || [],
  },
  
  // Google Gemini configuration
  gemini: {
    apiKey: process.env.GOOGLE_GEMINI_API_KEY || '',
    model: process.env.GOOGLE_GEMINI_MODEL || 'gemini-2.0-flash-exp',
  },
  
  // Call configuration
  call: {
    maxDuration: parseInt(process.env.MAX_CALL_DURATION || '7200', 10),
    timeout: parseInt(process.env.CALL_TIMEOUT || '300', 10),
  },
  
  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
  },
};

/**
 * Validate required configuration
 * Throws an error if required config is missing
 */
export function validateConfig(): void {
  const requiredConfig = [
    { key: 'GOOGLE_GEMINI_API_KEY', value: config.gemini.apiKey },
  ];
  
  // Only validate Twilio config if we're not in development mode
  if (config.env !== 'development') {
    requiredConfig.push(
      { key: 'TWILIO_ACCOUNT_SID', value: config.twilio.accountSid },
      { key: 'TWILIO_AUTH_TOKEN', value: config.twilio.authToken },
      { key: 'TWILIO_PHONE_NUMBER', value: config.twilio.phoneNumber }
    );
  }
  
  const missingConfig = requiredConfig.filter(item => !item.value);
  
  if (missingConfig.length > 0) {
    const missingKeys = missingConfig.map(item => item.key).join(', ');
    throw new Error(`Missing required configuration: ${missingKeys}`);
  }
}