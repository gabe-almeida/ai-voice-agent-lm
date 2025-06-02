/**
 * Test script for Gemini Streaming Service
 * Verifies multimodal streaming capabilities
 */

import { geminiStreamingService } from '../src/services/gemini-streaming.service';
import { GeminiVoice } from '../src/services/gemini-tts.service';
import * as fs from 'fs';
import * as path from 'path';

async function testTextStreaming() {
  console.log('\n🧪 Testing Text Streaming...\n');
  
  const prompt = "Tell me a very short joke about programming.";
  let fullText = '';
  let chunkCount = 0;
  const startTime = Date.now();
  
  try {
    for await (const textChunk of geminiStreamingService.generateTextStream(prompt)) {
      chunkCount++;
      fullText += textChunk;
      console.log(`Chunk ${chunkCount}: "${textChunk}"`);
    }
    
    const duration = Date.now() - startTime;
    console.log(`\n✅ Text streaming completed in ${duration}ms`);
    console.log(`Total chunks: ${chunkCount}`);
    console.log(`Full response: ${fullText}`);
  } catch (error) {
    console.error('❌ Text streaming failed:', error);
  }
}

async function testMultimodalStreaming() {
  console.log('\n🧪 Testing Multimodal Streaming (Text + Audio)...\n');
  
  const prompt = "Say 'Hello, I am your AI assistant' in a friendly tone.";
  const config = geminiStreamingService.getOptimizedVoiceConfig();
  
  let fullText = '';
  let audioChunks: Buffer[] = [];
  let textChunkCount = 0;
  let audioChunkCount = 0;
  const startTime = Date.now();
  
  try {
    for await (const chunk of geminiStreamingService.generateMultimodalStream(prompt, [], config)) {
      if (chunk.text) {
        textChunkCount++;
        fullText += chunk.text;
        console.log(`Text chunk ${textChunkCount}: "${chunk.text}"`);
      }
      
      if (chunk.audio) {
        audioChunkCount++;
        audioChunks.push(chunk.audio);
        console.log(`Audio chunk ${audioChunkCount}: ${chunk.audio.length} bytes`);
      }
      
      if (chunk.isFinal) {
        console.log('Stream completed');
      }
    }
    
    const duration = Date.now() - startTime;
    console.log(`\n✅ Multimodal streaming completed in ${duration}ms`);
    console.log(`Text chunks: ${textChunkCount}`);
    console.log(`Audio chunks: ${audioChunkCount}`);
    console.log(`Full text: ${fullText}`);
    
    // Save audio if we got any
    if (audioChunks.length > 0) {
      const outputDir = path.join(__dirname, '..', 'output');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      const audioBuffer = Buffer.concat(audioChunks);
      const filename = `multimodal_test_${Date.now()}.wav`;
      const filepath = path.join(outputDir, filename);
      fs.writeFileSync(filepath, audioBuffer);
      console.log(`Audio saved to: ${filepath}`);
    }
  } catch (error) {
    console.error('❌ Multimodal streaming failed:', error);
  }
}

async function testTextToAudioStreaming() {
  console.log('\n🧪 Testing Text-to-Audio Streaming...\n');
  
  // Create a simple text stream
  async function* createTextStream() {
    const sentences = [
      "Hello there! ",
      "This is a test of streaming audio. ",
      "Each sentence should be converted to audio separately."
    ];
    
    for (const sentence of sentences) {
      yield sentence;
      // Simulate streaming delay
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  const audioChunks: Buffer[] = [];
  let chunkCount = 0;
  const startTime = Date.now();
  
  try {
    for await (const audioChunk of geminiStreamingService.textToAudioStream(
      createTextStream(), 
      GeminiVoice.CALLIRRHOE
    )) {
      chunkCount++;
      audioChunks.push(audioChunk);
      console.log(`Audio chunk ${chunkCount}: ${audioChunk.length} bytes`);
    }
    
    const duration = Date.now() - startTime;
    console.log(`\n✅ Text-to-audio streaming completed in ${duration}ms`);
    console.log(`Total audio chunks: ${chunkCount}`);
    
    // Save combined audio
    if (audioChunks.length > 0) {
      const outputDir = path.join(__dirname, '..', 'output');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      const audioBuffer = Buffer.concat(audioChunks);
      const filename = `text_to_audio_stream_${Date.now()}.wav`;
      const filepath = path.join(outputDir, filename);
      fs.writeFileSync(filepath, audioBuffer);
      console.log(`Audio saved to: ${filepath} (${audioBuffer.length} bytes)`);
    }
  } catch (error) {
    console.error('❌ Text-to-audio streaming failed:', error);
  }
}

async function measureLatency() {
  console.log('\n📊 Measuring Streaming Latency...\n');
  
  const prompts = [
    "Hi",
    "What's 2+2?",
    "Tell me a fact"
  ];
  
  for (const prompt of prompts) {
    console.log(`\nTesting prompt: "${prompt}"`);
    
    const startTime = Date.now();
    let timeToFirstText = 0;
    let timeToFirstAudio = 0;
    let firstText = false;
    let firstAudio = false;
    
    try {
      for await (const chunk of geminiStreamingService.generateMultimodalStream(prompt)) {
        if (chunk.text && !firstText) {
          timeToFirstText = Date.now() - startTime;
          firstText = true;
          console.log(`  Time to first text: ${timeToFirstText}ms`);
        }
        
        if (chunk.audio && !firstAudio) {
          timeToFirstAudio = Date.now() - startTime;
          firstAudio = true;
          console.log(`  Time to first audio: ${timeToFirstAudio}ms`);
        }
        
        if (chunk.isFinal) {
          const totalTime = Date.now() - startTime;
          console.log(`  Total time: ${totalTime}ms`);
          break;
        }
      }
    } catch (error) {
      console.error(`  Error: ${error}`);
    }
  }
}

async function main() {
  console.log('🚀 Gemini Streaming Service Test Suite\n');
  console.log('This will test various streaming capabilities of Gemini 2.5 Pro\n');
  
  // Test 1: Text streaming
  await testTextStreaming();
  
  // Test 2: Multimodal streaming (if supported)
  await testMultimodalStreaming();
  
  // Test 3: Text-to-audio streaming
  await testTextToAudioStreaming();
  
  // Test 4: Latency measurements
  await measureLatency();
  
  console.log('\n✅ All tests completed!');
}

// Run tests
main().catch(console.error);