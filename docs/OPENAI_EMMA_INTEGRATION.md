# OpenAI Realtime API + Emma Integration

## Overview

This document describes the integration of OpenAI's Realtime API with the Emma system prompt for ultra-low latency voice interactions.

## Key Features

- **Response Time**: 300-800ms (compared to 3-7 seconds with Gemini TTS)
- **Voice**: Natural, human-like voice using OpenAI's "alloy" voice
- **System Prompt**: Full Emma prompt from Luxury Makeover
- **Technology**: WebSocket-based bidirectional streaming
- **VAD**: Built-in Voice Activity Detection for natural conversations

## Architecture

### Components

1. **OpenAI Realtime Service** (`src/services/openai-realtime.service.ts`)
   - WebSocket connection to OpenAI's Realtime API
   - Event-based architecture for audio/text streaming
   - Automatic reconnection logic
   - Emma system prompt integration

2. **WebSocket Handler** (`src/websocket/openai-realtime.ws.ts`)
   - Handles client WebSocket connections
   - Forwards messages between client and OpenAI
   - Manages session lifecycle

3. **Browser Interface** (`public/openai-emma-demo.html`)
   - User-friendly interface for testing Emma
   - Real-time latency metrics
   - Push-to-talk functionality
   - Audio playback controls

4. **Routes** (`src/routes/openai-realtime.routes.ts`)
   - HTTP endpoints for status checking
   - WebSocket upgrade handling

## Configuration

### Environment Variables

```bash
OPENAI_API_KEY=your-api-key-here
OPENAI_REALTIME_MODEL=gpt-4o-realtime-preview-2024-12-17
```

### Emma System Prompt

The full Emma system prompt is loaded from `src/config/emma-prompt.ts` and includes:
- Identity as Luxury Makeover scheduling agent
- Voice and persona characteristics
- Conversation flow scripts
- Objection handling
- Company information

## Usage

### Testing Emma Integration

```bash
# Test Emma with OpenAI Realtime API
npm run test:emma

# Start the server
npm run dev

# Open browser to test
http://localhost:3000/openai-emma-demo.html
```

### WebSocket Endpoint

```
ws://localhost:3000/ws/openai-realtime
```

### Message Flow

1. Client connects to WebSocket endpoint
2. Server initializes OpenAI Realtime connection with Emma prompt
3. Client sends audio/text messages
4. Server forwards to OpenAI and receives responses
5. Audio/text responses streamed back to client
6. Latency tracked and displayed in real-time

## Performance Metrics

| Metric | Value |
|--------|-------|
| First Audio Chunk | 300-500ms |
| Complete Response | 500-800ms |
| Audio Quality | 24kHz PCM16 |
| Streaming | Real-time bidirectional |

## API Integration

### Session Configuration

```javascript
{
  type: 'session.update',
  session: {
    modalities: ['text', 'audio'],
    instructions: EMMA_SYSTEM_PROMPT,
    voice: 'alloy',
    input_audio_format: 'pcm16',
    output_audio_format: 'pcm16',
    turn_detection: {
      type: 'server_vad',
      threshold: 0.5,
      prefix_padding_ms: 300,
      silence_duration_ms: 500
    },
    temperature: 0.8,
    max_response_output_tokens: 4096
  }
}
```

### Audio Handling

- Input: PCM16 audio at 24kHz
- Output: PCM16 audio chunks streamed in real-time
- Base64 encoding for WebSocket transport
- Client-side Web Audio API for playback

## Benefits Over Previous Implementation

1. **Latency**: 10x faster than Gemini TTS (300-800ms vs 3-7s)
2. **Natural Conversation**: Built-in VAD enables interruptions
3. **Voice Quality**: More natural and human-like
4. **Streaming**: True real-time bidirectional audio
5. **Reliability**: Automatic reconnection and error handling

## Future Enhancements

1. **Multiple Voices**: Support for different OpenAI voices
2. **Custom Tools**: Integration with scheduling APIs
3. **Analytics**: Track conversation metrics and success rates
4. **Phone Integration**: Connect with Twilio for phone calls
5. **Multi-language**: Support for languages beyond English

## Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
   - Check OPENAI_API_KEY is set correctly
   - Verify API key has Realtime API access
   - Check network connectivity

2. **No Audio Output**
   - Ensure browser has microphone permissions
   - Check audio format compatibility
   - Verify WebSocket messages are being received

3. **High Latency**
   - Check network connection quality
   - Verify server location (use closest region)
   - Monitor WebSocket message queue

### Debug Mode

Enable debug logging:
```javascript
logger.level = 'debug';
```

## Cost Considerations

OpenAI Realtime API pricing:
- Audio input: $0.06/minute
- Audio output: $0.24/minute
- Text tokens: Standard GPT-4 pricing

For a typical 5-minute conversation:
- Estimated cost: $1.50-$2.00
- Compare to Gemini: $0.10-$0.20

## Conclusion

The OpenAI Realtime API integration with Emma provides a production-ready solution for ultra-low latency voice interactions. While more expensive than Gemini, the 10x improvement in response time and natural conversation flow make it ideal for customer-facing applications where user experience is paramount.