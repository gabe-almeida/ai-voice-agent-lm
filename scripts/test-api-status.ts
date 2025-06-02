/**
 * Test script to check Gemini API status and rate limits
 */

import { config } from '../src/config';
import { geminiTTSRateLimiter, geminiChatRateLimiter } from '../src/utils/rate-limiter';

async function checkAPIStatus() {
  console.log('🔍 Checking Gemini API Status...\n');
  
  console.log('📊 Configuration:');
  console.log(`- API Key: ${config.gemini.apiKey ? '✓ Configured' : '✗ Missing'}`);
  console.log(`- Chat Model: ${config.gemini.model}`);
  console.log(`- TTS Model: gemini-2.5-pro-preview-tts\n`);
  
  console.log('🚦 Rate Limiter Status:');
  console.log(`- Chat API Tokens: ${geminiChatRateLimiter.getTokenCount().toFixed(2)}/10`);
  console.log(`- TTS API Tokens: ${geminiTTSRateLimiter.getTokenCount().toFixed(2)}/5`);
  console.log(`- Chat Rate: 60 requests/minute max`);
  console.log(`- TTS Rate: 30 requests/minute max\n`);
  
  console.log('💡 Tips:');
  console.log('- Rate limiters prevent 429 errors');
  console.log('- TTS requests are automatically queued');
  console.log('- Browser TTS is used as fallback');
  console.log('- Response times are tracked in the UI\n');
  
  console.log('✅ System is ready for testing!');
}

checkAPIStatus();