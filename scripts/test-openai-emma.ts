/**
 * Test script for OpenAI Realtime API with Emma system prompt
 */

import { OpenAIRealtimeService } from '../src/services/openai-realtime.service';
import { EMMA_SYSTEM_PROMPT } from '../src/config/emma-prompt';
import * as dotenv from 'dotenv';

dotenv.config();

async function testEmmaIntegration() {
  console.log('🎤 Testing Emma Voice Agent with OpenAI Realtime API\n');

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY not found in environment');
    process.exit(1);
  }

  // Initialize service with Emma's prompt
  const realtime = new OpenAIRealtimeService(apiKey, {
    voice: 'alloy',
    instructions: EMMA_SYSTEM_PROMPT,
    temperature: 0.8,
    maxResponseLength: 4096
  });

  console.log('📋 Configuration:');
  console.log('- Voice: alloy');
  console.log('- System prompt: Emma (Luxury Makeover)');
  console.log('- Expected latency: 300-800ms\n');

  // Set up event handlers
  realtime.on('session.created', (session) => {
    console.log('✅ Session created successfully');
    console.log(`- Session ID: ${session.id}`);
    console.log(`- Model: ${session.model}\n`);
  });

  realtime.on('text', (text) => {
    console.log('💬 Emma:', text.text);
  });

  realtime.on('audio', (audio) => {
    if (audio.isFinal) {
      console.log('🔊 Audio response complete');
    }
  });

  realtime.on('error', (error) => {
    console.error('❌ Error:', error);
  });

  try {
    // Connect to OpenAI
    console.log('🔌 Connecting to OpenAI Realtime API...');
    await realtime.connect();

    // Send a test message
    console.log('\n📤 Sending test message...');
    const testMessage = "Hi Emma, I'm interested in remodeling my bathroom";
    console.log(`User: ${testMessage}\n`);
    
    realtime.sendText(testMessage);

    // Wait for response
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Send another message
    console.log('\n📤 Sending follow-up...');
    const followUp = "Yes, I'd like to schedule a consultation";
    console.log(`User: ${followUp}\n`);
    
    realtime.sendText(followUp);

    // Wait for response
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Disconnect
    console.log('\n🔌 Disconnecting...');
    realtime.disconnect();
    
    console.log('✅ Test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testEmmaIntegration();