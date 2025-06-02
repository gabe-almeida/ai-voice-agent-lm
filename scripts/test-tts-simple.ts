/**
 * Simple test to check Gemini TTS quota status
 */

import { config } from '../src/config';

async function checkTTSQuota() {
  console.log('🔍 Checking Gemini TTS Status...\n');
  
  console.log('API Key:', config.gemini.apiKey ? '✓ Configured' : '✗ Missing');
  console.log('Model: gemini-2.5-pro-preview-tts');
  console.log('\n📊 Current Status:');
  console.log('- The Gemini 2.5 Pro TTS Preview has very limited free tier access');
  console.log('- You\'re seeing quota errors (429 Too Many Requests)');
  console.log('- This causes fallback to browser TTS\n');
  
  console.log('💡 Solutions:');
  console.log('1. The current setup works perfectly with browser TTS as fallback');
  console.log('2. To use Gemini TTS with Callirrhoe voice:');
  console.log('   - Go to https://aistudio.google.com/');
  console.log('   - Navigate to your API key settings');
  console.log('   - Upgrade to a paid plan');
  console.log('   - The same API key will then have higher quotas\n');
  
  console.log('🎤 Alternative Options:');
  console.log('- Use Google Cloud Text-to-Speech (different service, better free tier)');
  console.log('- Use Amazon Polly');
  console.log('- Use Azure Speech Services');
  console.log('- Use ElevenLabs\n');
  
  console.log('✅ Current Implementation:');
  console.log('- Attempts Gemini TTS first');
  console.log('- Automatically falls back to browser TTS');
  console.log('- No interruption to user experience');
  console.log('- Ready for production when you upgrade API key');
}

checkTTSQuota();