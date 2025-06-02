/**
 * Test script for simulating a phone conversation
 * Tests the Gemini integration with voice-like interactions
 */

import { GeminiService } from '../src/services/gemini.service';

async function simulatePhoneConversation() {
  console.log('📞 Simulating Phone Conversation...\n');
  
  // Create a Gemini service instance with voice agent instructions
  const agent = new GeminiService(
    `You are a helpful customer service agent for a tech company called TechSupport Pro. 
    You're answering a phone call from a customer. Be friendly, professional, and helpful.
    Keep your responses concise and natural for phone conversations.
    Don't use any formatting, bullet points, or markdown - just plain conversational text.`
  );
  
  try {
    // Start the conversation
    const sessionId = 'test-call-123';
    agent.startConversation(sessionId);
    
    // Get initial greeting
    console.log('📞 [SYSTEM] Call connected...');
    const greeting = await agent.generateResponse(sessionId, 'The customer just connected to the call. Please greet them professionally.');
    console.log(`🎧 [AGENT]: ${greeting}\n`);
    
    // Simulate customer interactions
    const customerMessages = [
      "Hi, I'm having trouble with my internet connection. It's been really slow all day.",
      "I've already tried restarting the router twice, but it didn't help.",
      "My plan is supposed to be 100 Mbps, but I'm only getting about 10.",
      "Can you help me fix this?",
    ];
    
    for (const message of customerMessages) {
      console.log(`📱 [CUSTOMER]: ${message}`);
      const response = await agent.generateResponse(sessionId, message);
      console.log(`🎧 [AGENT]: ${response}\n`);
      
      // Simulate a small delay between exchanges
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // End the call
    console.log('📞 [SYSTEM] Customer ending call...');
    const farewell = await agent.generateResponse(sessionId, 'The customer is satisfied and is about to end the call. Please provide a professional closing.');
    console.log(`🎧 [AGENT]: ${farewell}\n`);
    
    agent.endConversation(sessionId);
    console.log('✅ Call simulation completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during conversation:', error);
  }
}

// Run the simulation
simulatePhoneConversation();