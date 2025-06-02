/**
 * Test script for Gemini integration
 * Verifies that the Gemini API is working correctly
 */

import { config } from '../src/config';
import { GeminiService } from '../src/services/gemini.service';

async function testGemini() {
  console.log('🧪 Testing Gemini integration...\n');
  
  try {
    // Create a new Gemini service instance
    const gemini = new GeminiService(
      'You are a helpful voice assistant. Be friendly and concise.'
    );
    
    // Start a conversation
    const sessionId = 'test-session';
    gemini.startConversation(sessionId);
    console.log('✅ Successfully started conversation\n');
    
    // Test sending messages
    const testMessages = [
      'Hello, can you hear me?',
      'What is 2 + 2?',
      'Tell me a very short joke',
    ];
    
    for (const message of testMessages) {
      console.log(`👤 User: ${message}`);
      const response = await gemini.generateResponse(sessionId, message);
      console.log(`🤖 Assistant: ${response}\n`);
    }
    
    // End conversation
    gemini.endConversation(sessionId);
    console.log('✅ Conversation ended successfully');
    
    console.log('\n🎉 Gemini integration test completed successfully!');
    console.log(`📊 Model: ${config.gemini.model}`);
    
  } catch (error) {
    console.error('❌ Gemini test failed:', error);
    process.exit(1);
  }
}

// Run the test
testGemini();