# Native Audio Implementation for Real-Time Voice Synthesis

## Current Performance Issues

Based on the timing measurements:
- **Text Response**: ~500ms ✅ (Good)
- **Audio Generation**: 7-8 seconds ❌ (Too slow)
- **Total Time to Voice**: 8-9 seconds ❌ (Unacceptable for natural conversation)

## Google's Native Audio Approach

Google's "native audio" refers to real-time audio streaming capabilities that enable:
1. **Streaming synthesis**: Audio generation starts before the full text is available
2. **Chunk-based processing**: Small text segments are converted to audio immediately
3. **Low latency**: First audio plays within 200-500ms

## Implementation Strategy

### 1. Use Gemini's Streaming API with Audio Output

```typescript
// Instead of waiting for complete text, stream it
const stream = await model.generateContentStream({
  contents: [{ role: 'user', parts: [{ text: userInput }] }],
  generationConfig: {
    responseModalities: ['audio', 'text'], // Request both modalities
    speechConfig: {
      voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Callirrhoe' } }
    }
  }
});

// Process chunks as they arrive
for await (const chunk of stream) {
  if (chunk.candidates?.[0]?.content?.parts?.[0]?.inlineData) {
    // Audio chunk available - play immediately
    playAudioChunk(chunk.candidates[0].content.parts[0].inlineData);
  }
}
```

### 2. WebSocket-Based Architecture

Replace HTTP requests with WebSocket for bidirectional streaming:

```typescript
// Server-side WebSocket handler
wss.on('connection', (ws) => {
  const geminiStream = new GeminiStreamingSession();
  
  ws.on('message', async (data) => {
    const { audio } = JSON.parse(data);
    
    // Stream audio to Gemini
    const response = await geminiStream.sendAudioChunk(audio);
    
    // Stream response back immediately
    ws.send(JSON.stringify({ 
      type: 'audio',
      data: response.audioChunk 
    }));
  });
});
```

### 3. Audio Buffer Management

Implement a circular buffer for smooth playback:

```javascript
class AudioStreamPlayer {
  constructor() {
    this.audioContext = new AudioContext();
    this.bufferQueue = [];
    this.isPlaying = false;
  }
  
  async addChunk(audioData) {
    // Convert to AudioBuffer
    const audioBuffer = await this.audioContext.decodeAudioData(audioData);
    this.bufferQueue.push(audioBuffer);
    
    // Start playing if not already
    if (!this.isPlaying) {
      this.playNextChunk();
    }
  }
  
  playNextChunk() {
    if (this.bufferQueue.length === 0) {
      this.isPlaying = false;
      return;
    }
    
    this.isPlaying = true;
    const buffer = this.bufferQueue.shift();
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioContext.destination);
    source.onended = () => this.playNextChunk();
    source.start();
  }
}
```

### 4. Optimized Chunk Sizes

For natural conversation flow:
- **First chunk**: 20-30 characters (100-200ms generation)
- **Subsequent chunks**: 50-80 characters
- **Split on**: Punctuation, pauses, breath groups

### 5. Parallel Processing Pipeline

```
User Speech → STT → LLM (streaming) → TTS (streaming) → Audio Output
     ↓          ↓         ↓                ↓              ↓
   100ms      200ms     300ms           400ms          500ms
```

## Implementation Steps

### Step 1: Enable Streaming in Gemini Service

```typescript
// src/services/gemini-streaming.service.ts
export class GeminiStreamingService {
  async *streamResponse(input: string): AsyncGenerator<{text?: string, audio?: Buffer}> {
    const stream = await this.model.generateContentStream({
      contents: [{ role: 'user', parts: [{ text: input }] }],
      generationConfig: {
        responseModalities: ['text', 'audio'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Callirrhoe' }
          }
        }
      }
    });
    
    for await (const chunk of stream) {
      const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text;
      const audio = chunk.candidates?.[0]?.content?.parts?.[0]?.inlineData;
      
      if (text || audio) {
        yield { text, audio: audio ? Buffer.from(audio.data, 'base64') : undefined };
      }
    }
  }
}
```

### Step 2: WebSocket Endpoint

```typescript
// src/routes/websocket.routes.ts
import { WebSocketServer } from 'ws';

export function setupWebSocket(server: http.Server) {
  const wss = new WebSocketServer({ server });
  
  wss.on('connection', (ws) => {
    const gemini = new GeminiStreamingService();
    
    ws.on('message', async (message) => {
      const { type, data } = JSON.parse(message.toString());
      
      if (type === 'speech') {
        // Start streaming response
        for await (const chunk of gemini.streamResponse(data)) {
          ws.send(JSON.stringify({
            type: 'response',
            text: chunk.text,
            audio: chunk.audio?.toString('base64')
          }));
        }
      }
    });
  });
}
```

### Step 3: Client-Side WebSocket Handler

```javascript
// public/native-audio.html
class NativeAudioChat {
  constructor() {
    this.ws = new WebSocket('ws://localhost:3000/ws');
    this.audioPlayer = new AudioStreamPlayer();
    
    this.ws.onmessage = (event) => {
      const { type, text, audio } = JSON.parse(event.data);
      
      if (text) {
        this.displayText(text);
      }
      
      if (audio) {
        const audioData = Uint8Array.from(atob(audio), c => c.charCodeAt(0));
        this.audioPlayer.addChunk(audioData);
      }
    };
  }
  
  sendSpeech(text) {
    this.ws.send(JSON.stringify({ type: 'speech', data: text }));
  }
}
```

## Expected Performance Improvements

With native audio streaming:
- **First audio**: 200-500ms (vs 7-8 seconds)
- **Complete response**: 1-2 seconds (overlapped with playback)
- **Perceived latency**: < 1 second

## Alternative: Use Dedicated Speech APIs

If Gemini's native audio is still too slow, consider:

1. **Google Cloud Speech-to-Text/Text-to-Speech**
   - Dedicated APIs optimized for real-time
   - Support for streaming
   - Lower latency

2. **ElevenLabs Streaming API**
   - Ultra-low latency (< 300ms)
   - High-quality voices
   - WebSocket support

3. **Azure Cognitive Services Speech**
   - Real-time synthesis
   - Neural voices
   - Streaming support

## Testing the Implementation

1. Measure time to first audio byte
2. Monitor audio buffer health (underruns)
3. Test with various network conditions
4. Ensure smooth playback without gaps

## Conclusion

The key to natural conversation is **streaming at every layer**:
- Stream user input (as they speak)
- Stream LLM response (as it generates)
- Stream audio synthesis (as text arrives)
- Stream audio playback (as chunks arrive)

This creates a pipeline where each stage overlaps, dramatically reducing perceived latency.