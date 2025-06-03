#!/usr/bin/env ts-node

import WebSocket from 'ws';
import * as readline from 'readline';

// Configuration
const PRODUCTION_URL = process.env.PRODUCTION_URL || 'wss://voice-agent.onrender.com';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY environment variable is required');
  process.exit(1);
}

console.log('🔌 WebSocket Production Test');
console.log(`Connecting to: ${PRODUCTION_URL}/openai-realtime`);
console.log('----------------------------\n');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

let ws: WebSocket;
let isConnected = false;

function connectWebSocket() {
  ws = new WebSocket(`${PRODUCTION_URL}/openai-realtime`, {
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'OpenAI-Beta': 'realtime=v1'
    }
  });

  ws.on('open', () => {
    console.log('✅ Connected to production WebSocket');
    isConnected = true;
    
    // Send initial session update
    const sessionUpdate = {
      type: 'session.update',
      session: {
        modalities: ['text', 'audio'],
        instructions: 'You are Emma, a helpful AI assistant. Be concise and friendly.',
        voice: 'alloy',
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        input_audio_transcription: {
          model: 'whisper-1'
        },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 200
        },
        temperature: 0.8,
        max_response_output_tokens: 4096
      }
    };
    
    ws.send(JSON.stringify(sessionUpdate));
    console.log('📤 Sent session configuration');
    console.log('\nType a message to test the connection (or "quit" to exit):');
  });

  ws.on('message', (data: Buffer) => {
    try {
      const event = JSON.parse(data.toString());
      
      switch (event.type) {
        case 'session.created':
          console.log('📥 Session created successfully');
          break;
          
        case 'session.updated':
          console.log('📥 Session updated');
          break;
          
        case 'conversation.item.created':
          if (event.item.role === 'assistant' && event.item.content?.[0]?.text) {
            console.log(`\n🤖 Emma: ${event.item.content[0].text}`);
            console.log('\nType another message (or "quit" to exit):');
          }
          break;
          
        case 'response.audio.transcript.delta':
          process.stdout.write(event.delta);
          break;
          
        case 'response.audio.transcript.done':
          console.log('\n');
          break;
          
        case 'error':
          console.error('❌ Error:', event.error);
          break;
          
        default:
          // Log other events for debugging
          if (process.env.DEBUG) {
            console.log(`📥 ${event.type}`);
          }
      }
    } catch (error) {
      console.error('❌ Failed to parse message:', error);
    }
  });

  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error.message);
    isConnected = false;
  });

  ws.on('close', (code, reason) => {
    console.log(`\n🔌 WebSocket closed. Code: ${code}, Reason: ${reason}`);
    isConnected = false;
    
    if (code !== 1000) { // 1000 = normal closure
      console.log('Attempting to reconnect in 5 seconds...');
      setTimeout(connectWebSocket, 5000);
    }
  });

  // Heartbeat to keep connection alive
  const heartbeat = setInterval(() => {
    if (isConnected && ws.readyState === WebSocket.OPEN) {
      ws.ping();
    } else {
      clearInterval(heartbeat);
    }
  }, 30000);
}

// Handle user input
rl.on('line', (input) => {
  if (input.toLowerCase() === 'quit') {
    console.log('\n👋 Closing connection...');
    if (ws) {
      ws.close(1000, 'User quit');
    }
    rl.close();
    process.exit(0);
  }

  if (!isConnected) {
    console.log('❌ Not connected. Please wait...');
    return;
  }

  // Send user message
  const userMessage = {
    type: 'conversation.item.create',
    item: {
      type: 'message',
      role: 'user',
      content: [{
        type: 'input_text',
        text: input
      }]
    }
  };

  ws.send(JSON.stringify(userMessage));
  
  // Trigger response
  ws.send(JSON.stringify({ type: 'response.create' }));
  console.log('📤 Message sent, waiting for response...');
});

// Start connection
connectWebSocket();

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down...');
  if (ws) {
    ws.close(1000, 'User terminated');
  }
  rl.close();
  process.exit(0);
});

console.log('\n💡 Tips:');
console.log('- This tests the WebSocket connection to your production server');
console.log('- Make sure your OPENAI_API_KEY is set');
console.log('- Use PRODUCTION_URL env var to test different deployments');
console.log('- Set DEBUG=true to see all WebSocket events');
console.log('\nExample usage:');
console.log('PRODUCTION_URL=wss://your-app.onrender.com npm run test:production-ws\n');