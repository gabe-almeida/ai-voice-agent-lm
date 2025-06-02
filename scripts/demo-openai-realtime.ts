/**
 * Demo of OpenAI Realtime API functionality
 * This simulates the behavior without requiring a valid API key
 */

import { EventEmitter } from 'events';

class OpenAIRealtimeDemo extends EventEmitter {
  private isConnected: boolean = false;
  private messageCount: number = 0;

  async connect(): Promise<void> {
    console.log('🔌 Connecting to OpenAI Realtime API (Demo Mode)...');
    
    // Simulate connection delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    this.isConnected = true;
    console.log('✅ Connected to OpenAI Realtime API (Demo Mode)');
    
    // Emit session created event
    this.emit('session.created', {
      id: 'demo-session-123',
      model: 'gpt-4o-realtime-preview-2024-12-17',
      voice: 'alloy'
    });
  }

  sendText(text: string): void {
    if (!this.isConnected) {
      console.log('❌ Not connected');
      return;
    }

    console.log(`\n📤 Sending: "${text}"`);
    this.messageCount++;
    
    // Simulate processing with realistic latency
    const latency = 300 + Math.random() * 500; // 300-800ms
    const startTime = Date.now();
    
    setTimeout(() => {
      const actualLatency = Date.now() - startTime;
      
      // Simulate text response
      const responses: { [key: string]: string } = {
        'hello': 'Hello! How can I assist you today?',
        'test': 'This is a test response from the Realtime API.',
        'speed': `I'm responding in just ${Math.round(actualLatency)}ms!`,
        'default': `I received your message "${text}" and processed it in ${Math.round(actualLatency)}ms.`
      };
      
      const responseText = responses[text.toLowerCase()] || responses.default;
      
      // Emit text chunks
      const words = responseText.split(' ');
      let currentText = '';
      
      words.forEach((word, index) => {
        setTimeout(() => {
          currentText += (index > 0 ? ' ' : '') + word;
          this.emit('text', {
            text: word + ' ',
            isFinal: false
          });
          
          if (index === words.length - 1) {
            this.emit('text', {
              text: responseText,
              isFinal: true
            });
          }
        }, index * 50); // Simulate streaming
      });
      
      // Simulate audio generation
      setTimeout(() => {
        // First audio chunk
        this.emit('audio', {
          audio: new ArrayBuffer(1024), // Dummy audio data
          isFinal: false
        });
        
        // More audio chunks
        for (let i = 1; i < 5; i++) {
          setTimeout(() => {
            this.emit('audio', {
              audio: new ArrayBuffer(1024),
              isFinal: i === 4
            });
          }, i * 100);
        }
      }, 50);
      
      // Emit response done
      setTimeout(() => {
        this.emit('response.done', {
          latency: actualLatency,
          messageCount: this.messageCount
        });
      }, words.length * 50 + 500);
      
    }, latency);
  }

  disconnect(): void {
    this.isConnected = false;
    console.log('🔌 Disconnected from OpenAI Realtime API (Demo Mode)');
  }
}

async function runDemo() {
  console.log('🚀 OpenAI Realtime API Demo (Simulated)\n');
  console.log('This demonstrates the expected behavior with 300-800ms latency\n');
  
  const realtime = new OpenAIRealtimeDemo();
  
  let firstAudioTime = 0;
  let messageStartTime = 0;
  let audioChunkCount = 0;
  
  // Set up event handlers
  realtime.on('session.created', (session) => {
    console.log('📋 Session created:', session);
  });
  
  realtime.on('text', (chunk) => {
    if (!chunk.isFinal) {
      process.stdout.write(chunk.text);
    } else {
      console.log('\n');
    }
  });
  
  realtime.on('audio', (chunk) => {
    if (!chunk.isFinal && audioChunkCount === 0) {
      firstAudioTime = Date.now() - messageStartTime;
      console.log(`⚡ First audio chunk received in ${firstAudioTime}ms!`);
    }
    if (!chunk.isFinal) {
      audioChunkCount++;
    }
  });
  
  realtime.on('response.done', (response) => {
    console.log(`\n📊 Response complete in ${Math.round(response.latency)}ms`);
    console.log(`   Audio chunks: ${audioChunkCount}`);
    audioChunkCount = 0;
  });
  
  try {
    // Connect
    await realtime.connect();
    
    // Test messages
    const testMessages = [
      'Hello!',
      'How fast can you respond?',
      'Test the streaming capability',
      'What is 2+2?'
    ];
    
    for (const message of testMessages) {
      messageStartTime = Date.now();
      realtime.sendText(message);
      
      // Wait for response to complete
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    // Show performance summary
    console.log('\n📊 Performance Summary:');
    console.log('═══════════════════════════════════════════');
    console.log('Expected latency range: 300-800ms');
    console.log('Streaming: ✅ Enabled');
    console.log('Bidirectional: ✅ Supported');
    console.log('Voice Activity Detection: ✅ Built-in');
    console.log('\n🎯 This is ideal for real-time voice conversations!');
    
  } finally {
    realtime.disconnect();
  }
}

// Comparison table
function showComparison() {
  console.log('\n\n📊 TTS Service Comparison:');
  console.log('═══════════════════════════════════════════════════');
  console.log('Service                  | Response Time | Status');
  console.log('─────────────────────────┼───────────────┼─────────');
  console.log('OpenAI Realtime API      | 300-800ms     | ✅ Optimal');
  console.log('Gemini TTS               | 3-7 seconds   | ❌ Too slow');
  console.log('ElevenLabs               | 300-500ms     | ✅ Good');
  console.log('PlayHT                   | 400-600ms     | ✅ Good');
  console.log('═══════════════════════════════════════════════════');
}

// Run the demo
async function main() {
  await runDemo();
  showComparison();
  
  console.log('\n\n💡 To use the real OpenAI Realtime API:');
  console.log('1. Get a valid API key from https://platform.openai.com/api-keys');
  console.log('2. Ensure your account has access to the Realtime API');
  console.log('3. Update the OPENAI_API_KEY in your .env file');
  console.log('4. Run: npm run test:openai-realtime');
}

main().catch(console.error);