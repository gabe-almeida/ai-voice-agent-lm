/**
 * Test script to compare Gemini Pro TTS vs Flash TTS performance
 */

import { GeminiTTSService, GeminiVoice } from '../src/services/gemini-tts.service';
import { GeminiFlashTTSService } from '../src/services/gemini-flash-tts.service';

async function compareLatency() {
  console.log('🏁 Gemini TTS Model Comparison\n');
  console.log('Testing latency between Pro and Flash models...\n');

  const testPhrases = [
    "Hi!",
    "Hello, how are you?",
    "The weather is nice today.",
    "Tell me about your favorite book.",
    "What's the meaning of life, the universe, and everything?"
  ];

  const proTTS = new GeminiTTSService(GeminiVoice.CALLIRRHOE);
  const flashTTS = new GeminiFlashTTSService(GeminiVoice.CALLIRRHOE);

  const results = {
    pro: [] as number[],
    flash: [] as number[],
    errors: {
      pro: 0,
      flash: 0
    }
  };

  for (const phrase of testPhrases) {
    console.log(`\nTesting: "${phrase}" (${phrase.length} chars)`);
    
    // Test Pro model
    try {
      const proStart = Date.now();
      const proAudio = await proTTS.textToSpeech(phrase);
      const proLatency = Date.now() - proStart;
      results.pro.push(proLatency);
      console.log(`  Pro TTS: ${proLatency}ms (${proAudio.length} bytes)`);
    } catch (error: any) {
      console.log(`  Pro TTS: ERROR - ${error.message}`);
      results.errors.pro++;
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test Flash model
    try {
      const flashStart = Date.now();
      const flashAudio = await flashTTS.textToSpeech(phrase);
      const flashLatency = Date.now() - flashStart;
      results.flash.push(flashLatency);
      console.log(`  Flash TTS: ${flashLatency}ms (${flashAudio.length} bytes)`);
    } catch (error: any) {
      console.log(`  Flash TTS: ERROR - ${error.message}`);
      results.errors.flash++;
    }

    // Delay between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Calculate averages
  const avgPro = results.pro.length > 0 
    ? Math.round(results.pro.reduce((a, b) => a + b, 0) / results.pro.length)
    : 0;
  
  const avgFlash = results.flash.length > 0
    ? Math.round(results.flash.reduce((a, b) => a + b, 0) / results.flash.length)
    : 0;

  console.log('\n📊 Summary:');
  console.log('═══════════════════════════════════════');
  console.log(`Pro TTS (gemini-2.5-pro-preview-tts):`);
  console.log(`  - Average latency: ${avgPro}ms`);
  console.log(`  - Successful: ${results.pro.length}/${testPhrases.length}`);
  console.log(`  - Errors: ${results.errors.pro}`);
  console.log(`\nFlash TTS (gemini-2.5-flash-tts-preview):`);
  console.log(`  - Average latency: ${avgFlash}ms`);
  console.log(`  - Successful: ${results.flash.length}/${testPhrases.length}`);
  console.log(`  - Errors: ${results.errors.flash}`);

  if (avgPro > 0 && avgFlash > 0) {
    const improvement = Math.round((1 - avgFlash / avgPro) * 100);
    console.log(`\n🚀 Flash is ${improvement > 0 ? improvement + '% faster' : Math.abs(improvement) + '% slower'} than Pro`);
  }
}

async function testStreamingWithFlash() {
  console.log('\n\n🔄 Testing Streaming with Flash TTS...\n');

  // Import the streaming service and update it to use Flash
  const { GeminiStreamingServiceV2 } = await import('../src/services/gemini-streaming-v2.service');
  
  // Create a modified version that uses Flash TTS
  class FlashStreamingService extends GeminiStreamingServiceV2 {
    constructor() {
      super(GeminiVoice.CALLIRRHOE);
      // Override the TTS service with Flash
      (this as any).ttsService = new GeminiFlashTTSService(GeminiVoice.CALLIRRHOE);
    }
  }

  const flashStreaming = new FlashStreamingService();
  const prompt = "Tell me a quick fact.";
  
  console.log(`Prompt: "${prompt}"\n`);
  
  const startTime = Date.now();
  let timeToFirstAudio = 0;
  let chunkCount = 0;

  try {
    for await (const chunk of flashStreaming.generateVoiceStream(prompt)) {
      if (chunk.audio && timeToFirstAudio === 0) {
        timeToFirstAudio = Date.now() - startTime;
        console.log(`⚡ First audio chunk in ${timeToFirstAudio}ms!`);
      }
      
      if (chunk.audio) {
        chunkCount++;
        console.log(`  Chunk ${chunk.index}: ${chunk.audio.length} bytes`);
      }
    }
    
    const totalTime = Date.now() - startTime;
    console.log(`\n✅ Streaming completed:`);
    console.log(`  - Time to first audio: ${timeToFirstAudio}ms`);
    console.log(`  - Total time: ${totalTime}ms`);
    console.log(`  - Audio chunks: ${chunkCount}`);
    
  } catch (error) {
    console.error('❌ Streaming failed:', error);
  }
}

async function testRealTimeConversation() {
  console.log('\n\n💬 Testing Real-Time Conversation Flow...\n');
  
  const flashTTS = new GeminiFlashTTSService(GeminiVoice.CALLIRRHOE);
  
  // Simulate a conversation
  const exchanges = [
    { user: "Hi!", expected: 1000 },
    { user: "What's 2+2?", expected: 1500 },
    { user: "Thanks!", expected: 1000 }
  ];
  
  let totalLatency = 0;
  
  for (const exchange of exchanges) {
    console.log(`User: "${exchange.user}"`);
    
    const start = Date.now();
    try {
      // Simulate getting AI response (would come from Gemini)
      const aiResponse = getAIResponse(exchange.user);
      const textLatency = Date.now() - start;
      
      // Generate audio
      await flashTTS.textToSpeech(aiResponse);
      const totalTime = Date.now() - start;
      const ttsLatency = totalTime - textLatency;
      
      totalLatency += totalTime;
      
      console.log(`AI: "${aiResponse}"`);
      console.log(`  - Text generation: ${textLatency}ms`);
      console.log(`  - TTS generation: ${ttsLatency}ms`);
      console.log(`  - Total: ${totalTime}ms (Target: <${exchange.expected}ms) ${totalTime <= exchange.expected ? '✅' : '❌'}`);
      
    } catch (error) {
      console.error(`  Error: ${error}`);
    }
    
    // Pause between exchanges
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  const avgLatency = Math.round(totalLatency / exchanges.length);
  console.log(`\n📊 Average response time: ${avgLatency}ms`);
  console.log(`🎯 Target for natural conversation: <1000ms`);
  console.log(`${avgLatency <= 1000 ? '✅ Suitable for real-time!' : '❌ Too slow for natural conversation'}`);
}

function getAIResponse(userInput: string): string {
  // Simulate AI responses
  const responses: { [key: string]: string } = {
    "Hi!": "Hello! How can I help you today?",
    "What's 2+2?": "2 plus 2 equals 4.",
    "Thanks!": "You're welcome! Have a great day!"
  };
  return responses[userInput] || "I'm here to help!";
}

async function main() {
  console.log('🚀 Gemini TTS Performance Test Suite\n');
  console.log('Comparing gemini-2.5-pro-preview-tts vs gemini-2.5-flash-tts-preview\n');
  
  // Test 1: Direct latency comparison
  await compareLatency();
  
  // Test 2: Streaming with Flash TTS
  await testStreamingWithFlash();
  
  // Test 3: Real-time conversation simulation
  await testRealTimeConversation();
  
  console.log('\n\n✅ All tests completed!');
}

// Run tests
main().catch(console.error);