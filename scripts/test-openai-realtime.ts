/**
 * Test script for OpenAI Realtime API
 * Demonstrates low-latency voice streaming (300-800ms)
 */

import { OpenAIRealtimeService } from '../src/services/openai-realtime.service';
import * as fs from 'fs';
import * as path from 'path';

async function testRealtimeAPI() {
  console.log('🚀 OpenAI Realtime API Test\n');
  console.log('Expected latency: 300-800ms to first audio chunk\n');

  // Initialize the service
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY environment variable not set');
    process.exit(1);
  }

  const realtime = new OpenAIRealtimeService(apiKey, {
    voice: 'alloy',
    instructions: 'You are Emma, a friendly and helpful AI assistant. Keep responses concise.',
    temperature: 0.8
  });

  // Track metrics
  let connectionTime = 0;
  let firstAudioTime = 0;
  let totalAudioChunks = 0;
  let totalTextLength = 0;
  const audioChunks: Buffer[] = [];

  // Set up event handlers
  realtime.on('session.created', (session) => {
    console.log('✅ Session created:', {
      id: session.id,
      model: session.model,
      voice: session.voice
    });
  });

  realtime.on('audio', (chunk) => {
    if (!chunk.isFinal) {
      if (totalAudioChunks === 0) {
        firstAudioTime = Date.now() - connectionTime;
        console.log(`\n⚡ First audio chunk received in ${firstAudioTime}ms!`);
      }
      totalAudioChunks++;
      audioChunks.push(Buffer.from(chunk.audio));
      console.log(`  Audio chunk ${totalAudioChunks}: ${chunk.audio.byteLength} bytes`);
    } else {
      console.log('\n✅ Audio generation complete');
    }
  });

  realtime.on('text', (chunk) => {
    if (!chunk.isFinal) {
      process.stdout.write(chunk.text || '');
      totalTextLength += (chunk.text || '').length;
    } else {
      console.log('\n');
    }
  });

  realtime.on('transcription', (transcript) => {
    console.log(`\n📝 User transcription: "${transcript}"`);
  });

  realtime.on('error', (error) => {
    console.error('\n❌ Error:', error.message);
  });

  realtime.on('response.done', (_response) => {
    const totalTime = Date.now() - connectionTime;
    console.log('\n📊 Response complete:', {
      totalTime: `${totalTime}ms`,
      firstAudioLatency: `${firstAudioTime}ms`,
      audioChunks: totalAudioChunks,
      textLength: totalTextLength
    });
  });

  try {
    // Connect to the API
    console.log('🔌 Connecting to OpenAI Realtime API...');
    connectionTime = Date.now();
    await realtime.connect();
    
    // Wait a moment for session setup
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 1: Simple text input
    console.log('\n📤 Test 1: Sending text input...');
    connectionTime = Date.now();
    totalAudioChunks = 0;
    totalTextLength = 0;
    realtime.sendText('Hello! Can you introduce yourself in one sentence?');

    // Wait for response
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Test 2: Another text input
    console.log('\n📤 Test 2: Testing response speed...');
    connectionTime = Date.now();
    totalAudioChunks = 0;
    totalTextLength = 0;
    audioChunks.length = 0;
    realtime.sendText('What is 2+2?');

    // Wait for response
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Save audio if we got any
    if (audioChunks.length > 0) {
      const outputDir = path.join(__dirname, '..', 'output');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const audioBuffer = Buffer.concat(audioChunks);
      const outputPath = path.join(outputDir, `openai_realtime_${Date.now()}.pcm`);
      fs.writeFileSync(outputPath, audioBuffer);
      console.log(`\n💾 Audio saved to: ${outputPath}`);
      console.log(`   (PCM16 format, 24kHz sample rate)`);
    }

    // Test 3: Measure average latency
    console.log('\n📤 Test 3: Latency measurement...');
    const latencies: number[] = [];
    
    for (let i = 0; i < 3; i++) {
      connectionTime = Date.now();
      totalAudioChunks = 0;
      firstAudioTime = 0;
      
      realtime.sendText(`Quick test ${i + 1}`);
      
      // Wait for first audio chunk
      await new Promise(resolve => {
        const checkInterval = setInterval(() => {
          if (firstAudioTime > 0) {
            clearInterval(checkInterval);
            latencies.push(firstAudioTime);
            resolve(undefined);
          }
        }, 10);
      });
      
      // Wait between tests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Calculate average latency
    const avgLatency = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
    console.log('\n📊 Latency Summary:');
    console.log(`  - Measurements: ${latencies.join('ms, ')}ms`);
    console.log(`  - Average: ${avgLatency}ms`);
    console.log(`  - ${avgLatency <= 800 ? '✅' : '❌'} Within target range (300-800ms)`);

  } catch (error) {
    console.error('\n❌ Test failed:', error);
  } finally {
    // Disconnect
    console.log('\n🔌 Disconnecting...');
    realtime.disconnect();
  }
}

// Comparison with other services
function showComparison() {
  console.log('\n\n📊 TTS Service Comparison:');
  console.log('═══════════════════════════════════════════════════');
  console.log('Service                  | Response Time | Streaming');
  console.log('─────────────────────────┼───────────────┼──────────');
  console.log('OpenAI Realtime API      | 300-800ms     | ✅ Yes');
  console.log('OpenAI gpt-4o-audio      | 1-3 seconds   | ❌ No');
  console.log('Gemini TTS               | 3-7 seconds   | ❌ No');
  console.log('ElevenLabs               | 300-500ms     | ✅ Yes');
  console.log('PlayHT                   | 400-600ms     | ✅ Yes');
  console.log('Azure Neural             | 500-800ms     | ✅ Yes');
  console.log('═══════════════════════════════════════════════════');
  console.log('\n✨ OpenAI Realtime API offers:');
  console.log('  - Bidirectional audio streaming');
  console.log('  - Built-in VAD (Voice Activity Detection)');
  console.log('  - Integrated STT (Speech-to-Text)');
  console.log('  - Low latency suitable for real-time conversations');
}

// Run the test
async function main() {
  await testRealtimeAPI();
  showComparison();
}

main().catch(console.error);