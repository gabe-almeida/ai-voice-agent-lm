# OpenAI Realtime API Integration

## Overview

This document describes the integration of OpenAI's Realtime API into the Voice Agent system, providing low-latency voice streaming with 300-800ms response times.

## Key Features

- **Ultra-low latency**: 300-800ms to first audio chunk
- **Bidirectional streaming**: Real-time audio input and output
- **Built-in VAD**: Voice Activity Detection for natural conversations
- **Integrated STT**: Automatic speech-to-text transcription
- **WebSocket-based**: Persistent connection for minimal overhead

## Architecture

```
┌─────────────────┐     WebSocket      ┌──────────────────┐
│   Voice Agent   │ ◄─────────────────► │ OpenAI Realtime  │
│                 │                     │      API         │
│ - Audio Input   │     Audio/Text     │ - gpt-4o-realtime│
│ - Audio Output  │ ◄─────────────────► │ - Whisper STT    │
│ - Event Handler │                     │ - Neural TTS     │
└─────────────────┘                     └──────────────────┘
```

## Implementation

### Service Class: `OpenAIRealtimeService`

Located at: `src/services/openai-realtime.service.ts`

Key methods:
- `connect()`: Establish WebSocket connection
- `sendAudio(audioData)`: Send audio input
- `sendText(text)`: Send text input
- `disconnect()`: Close connection

### Event System

The service emits the following events:
- `session.created`: Connection established
- `audio`: Audio chunk received
- `text`: Text chunk received
- `transcription`: User speech transcribed
- `response.done`: Complete response received
- `error`: Error occurred

## Performance Metrics

### Response Times

| Metric | Value | Target |
|--------|-------|--------|
| Connection Time | ~500ms | < 1s |
| First Audio Chunk | 300-800ms | < 1s |
| Complete Response | 1-3s | < 5s |

### Comparison with Other Services

| Service | Response Time | Streaming | Real-time |
|---------|--------------|-----------|-----------|
| **OpenAI Realtime** | **300-800ms** | **✅** | **✅** |
| OpenAI gpt-4o-audio | 1-3s | ❌ | ❌ |
| Gemini TTS | 3-7s | ❌ | ❌ |
| ElevenLabs | 300-500ms | ✅ | ✅ |
| PlayHT | 400-600ms | ✅ | ✅ |
| Azure Neural | 500-800ms | ✅ | ❌ |

## Usage Example

```typescript
import { OpenAIRealtimeService } from './services/openai-realtime.service';

// Initialize service
const realtime = new OpenAIRealtimeService(apiKey, {
  voice: 'alloy',
  instructions: 'You are a helpful assistant.',
  temperature: 0.8
});

// Connect to API
await realtime.connect();

// Handle audio output
realtime.on('audio', (chunk) => {
  if (!chunk.isFinal) {
    // Play audio chunk
    playAudio(chunk.audio);
  }
});

// Send text input
realtime.sendText('Hello, how are you?');

// Send audio input
realtime.sendAudio(audioBuffer);
```

## Audio Format

- **Input**: PCM16, 24kHz sample rate
- **Output**: PCM16, 24kHz sample rate
- **Encoding**: Base64 for WebSocket transport

## Configuration

### Environment Variables

```bash
OPENAI_API_KEY=your-api-key-here
```

### Session Configuration

```typescript
{
  model: 'gpt-4o-realtime-preview-2024-12-17',
  voice: 'alloy', // or 'echo', 'fable', 'onyx', 'nova', 'shimmer'
  temperature: 0.8,
  maxResponseLength: 4096,
  instructions: 'Custom system prompt'
}
```

## Testing

Run the test script:

```bash
npm run test:openai-realtime
```

This will:
1. Connect to the Realtime API
2. Send test messages
3. Measure response latencies
4. Save audio output to `output/` directory

## Integration with Twilio

To use OpenAI Realtime API with Twilio voice calls:

1. Convert Twilio's mulaw audio to PCM16
2. Stream to OpenAI Realtime API
3. Convert response back to mulaw
4. Stream to Twilio

```typescript
// Example integration
twilioStream.on('media', (msg) => {
  const audioBuffer = convertMulawToPCM16(msg.media.payload);
  realtime.sendAudio(audioBuffer);
});

realtime.on('audio', (chunk) => {
  const mulawAudio = convertPCM16ToMulaw(chunk.audio);
  twilioStream.sendMedia(mulawAudio);
});
```

## Best Practices

1. **Connection Management**
   - Implement reconnection logic
   - Handle connection drops gracefully
   - Pool connections for multiple users

2. **Audio Processing**
   - Buffer audio chunks for smooth playback
   - Implement jitter buffer for network variations
   - Handle audio format conversions efficiently

3. **Error Handling**
   - Implement fallback to other TTS services
   - Log errors for monitoring
   - Provide user feedback on failures

4. **Performance Optimization**
   - Use connection pooling
   - Implement audio pre-buffering
   - Monitor latency metrics

## Limitations

1. **Cost**: Higher than traditional TTS APIs
2. **Complexity**: Requires WebSocket management
3. **Audio Format**: Limited to specific formats
4. **Beta Status**: API may change

## Future Enhancements

1. **Multi-language Support**: Add voice selection per language
2. **Custom Voices**: Train custom voice models
3. **Emotion Control**: Add emotional tone parameters
4. **Background Noise**: Implement noise cancellation

## Conclusion

OpenAI's Realtime API provides the lowest latency solution for voice interactions, making it ideal for real-time conversational AI applications. With 300-800ms response times, it enables natural, fluid conversations that feel instantaneous to users.