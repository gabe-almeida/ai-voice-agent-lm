/**
 * Test script for Gemini Streaming Service V2
 * Tests the optimized streaming approach with parallel audio generation
 */

import { geminiStreamingServiceV2 } from '../src/services/gemini-streaming-v2.service';
import * as fs from 'fs';
import * as path from 'path';

async function testVoiceStreaming() {
  console.log('\n🎤 Testing Voice Streaming with Parallel Audio Generation...\n');
  
  const prompt = "Tell me a very short fun fact about space.";
  const config = geminiStreamingServiceV2.getOptimizedVoiceConfig();
  
  const audioChunks: Buffer[] = [];
  const metrics = {
    startTime: Date.now(),
    timeToFirstText: 0,
    timeToFirstAudio: 0,
    textChunks: [] as string[],
    audioChunkCount: 0,
    totalDuration: 0
  };
  
  try {
    console.log(`Prompt: "${prompt}"\n`);
    
    for await (const chunk of geminiStreamingServiceV2.generateVoiceStream(prompt, [], config)) {
      if (chunk.text && metrics.textChunks.length === 0) {
        metrics.timeToFirstText = Date.now() - metrics.startTime;
        console.log(`📝 First text received in ${metrics.timeToFirstText}ms`);
      }
      
      if (chunk.text) {
        metrics.textChunks.push(chunk.text);
        console.log(`Text chunk ${chunk.index}: "${chunk.text}"`);
      }
      
      if (chunk.audio) {
        if (metrics.audioChunkCount === 0) {
          metrics.timeToFirstAudio = Date.now() - metrics.startTime;
          console.log(`🔊 First audio received in ${metrics.timeToFirstAudio}ms`);
        }
        metrics.audioChunkCount++;
        audioChunks.push(chunk.audio);
        console.log(`Audio chunk ${chunk.index}: ${chunk.audio.length} bytes`);
      }
    }
    
    metrics.totalDuration = Date.now() - metrics.startTime;
    
    console.log('\n📊 Metrics:');
    console.log(`- Time to first text: ${metrics.timeToFirstText}ms`);
    console.log(`- Time to first audio: ${metrics.timeToFirstAudio}ms`);
    console.log(`- Total duration: ${metrics.totalDuration}ms`);
    console.log(`- Text chunks: ${metrics.textChunks.length}`);
    console.log(`- Audio chunks: ${metrics.audioChunkCount}`);
    console.log(`- Full response: ${metrics.textChunks.join(' ')}`);
    
    // Save combined audio
    if (audioChunks.length > 0) {
      const outputDir = path.join(__dirname, '..', 'output');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      const audioBuffer = Buffer.concat(audioChunks);
      const filename = `voice_stream_v2_${Date.now()}.wav`;
      const filepath = path.join(outputDir, filename);
      fs.writeFileSync(filepath, audioBuffer);
      console.log(`\n💾 Audio saved to: ${filepath} (${audioBuffer.length} bytes)`);
    }
    
    return metrics;
  } catch (error) {
    console.error('❌ Voice streaming failed:', error);
    throw error;
  }
}

async function testDifferentStrategies() {
  console.log('\n🔬 Testing Different Chunking Strategies...\n');
  
  const prompt = "Explain what makes a rainbow in simple terms.";
  const strategies: Array<'aggressive' | 'balanced' | 'quality'> = ['aggressive', 'balanced', 'quality'];
  
  for (const strategy of strategies) {
    console.log(`\n--- Testing ${strategy.toUpperCase()} strategy ---`);
    
    const config = {
      ...geminiStreamingServiceV2.getOptimizedVoiceConfig(),
      chunkingStrategy: strategy
    };
    
    const startTime = Date.now();
    let chunkCount = 0;
    let firstAudioTime = 0;
    
    try {
      for await (const chunk of geminiStreamingServiceV2.generateVoiceStream(prompt, [], config)) {
        if (chunk.audio) {
          chunkCount++;
          if (chunkCount === 1) {
            firstAudioTime = Date.now() - startTime;
          }
          console.log(`Chunk ${chunk.index}: ${chunk.text.substring(0, 30)}... (${chunk.audio.length} bytes)`);
        }
      }
      
      const totalTime = Date.now() - startTime;
      console.log(`\nResults for ${strategy}:`);
      console.log(`- First audio: ${firstAudioTime}ms`);
      console.log(`- Total time: ${totalTime}ms`);
      console.log(`- Chunks: ${chunkCount}`);
      
    } catch (error) {
      console.error(`Error with ${strategy} strategy:`, error);
    }
  }
}

async function testLatencyMeasurement() {
  console.log('\n⏱️ Measuring Latency...\n');
  
  try {
    const latency = await geminiStreamingServiceV2.measureLatency("Hi there!");
    
    console.log('Latency measurements:');
    console.log(`- Text stream latency: ${latency.textStreamLatency}ms`);
    console.log(`- First audio latency: ${latency.firstAudioLatency}ms`);
    console.log(`- Total latency: ${latency.totalLatency}ms`);
    
    // Calculate improvement over non-streaming approach
    const nonStreamingEstimate = 500 + 7000; // Text generation + TTS
    const improvement = Math.round((1 - latency.firstAudioLatency / nonStreamingEstimate) * 100);
    
    console.log(`\n🚀 Improvement: ${improvement}% faster than non-streaming approach`);
    
  } catch (error) {
    console.error('Error measuring latency:', error);
  }
}

async function testConversation() {
  console.log('\n💬 Testing Conversational Flow...\n');
  
  const conversation = [
    { role: 'user', content: "Hi, I'm learning about space." },
    { role: 'assistant', content: "That's wonderful! Space is fascinating. What would you like to know?" }
  ];
  
  const prompt = "What's the closest star to Earth?";
  
  console.log('Conversation history:');
  conversation.forEach(msg => console.log(`${msg.role}: ${msg.content}`));
  console.log(`\nNew prompt: "${prompt}"\n`);
  
  const startTime = Date.now();
  let fullResponse = '';
  
  try {
    for await (const chunk of geminiStreamingServiceV2.generateVoiceStream(prompt, conversation)) {
      if (chunk.text) {
        fullResponse += chunk.text + ' ';
      }
    }
    
    const duration = Date.now() - startTime;
    console.log(`\nResponse: ${fullResponse.trim()}`);
    console.log(`Duration: ${duration}ms`);
    
  } catch (error) {
    console.error('Error in conversation test:', error);
  }
}

async function main() {
  console.log('🚀 Gemini Streaming Service V2 Test Suite\n');
  console.log('Testing optimized streaming with parallel audio generation\n');
  
  // Test 1: Basic voice streaming
  await testVoiceStreaming();
  
  // Test 2: Different chunking strategies
  await testDifferentStrategies();
  
  // Test 3: Latency measurement
  await testLatencyMeasurement();
  
  // Test 4: Conversational flow
  await testConversation();
  
  console.log('\n✅ All tests completed!');
}

// Run tests
main().catch(console.error);