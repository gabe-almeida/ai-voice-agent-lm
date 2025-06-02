# Gemini 2.5 Pro Preview TTS Real-Time Voice Implementation Plan

## Goal
Achieve Vapi-like sub-second latency using only Gemini 2.5 Pro Preview's native capabilities, without third-party TTS services.

## Current State
- Text Response: ~500ms ✅
- Audio Generation: 7-8 seconds ❌
- Total Time to Voice: 8-9 seconds ❌

## Target State
- Text Response: ~500ms ✅
- First Audio Chunk: <1 second ✅
- Natural conversation flow ✅

---

## Phase 1: WebSocket Infrastructure (Foundation)

### 1.1 WebSocket Server Setup
- [x] Install WebSocket dependencies (`ws`, `@types/ws`) - 5/29/2025, 5:52 PM
- [x] Create `src/websocket/server.ts` with basic WebSocket server - 5/29/2025, 5:53 PM
- [x] Implement connection management (track active connections) - 5/29/2025, 5:53 PM
- [x] Add heartbeat/ping-pong for connection health - 5/29/2025, 5:53 PM
- [x] Create connection pool for concurrent sessions - 5/29/2025, 5:53 PM
- [x] Add WebSocket error handling and reconnection logic - 5/29/2025, 5:53 PM

### 1.2 Client WebSocket Implementation
- [x] Create `public/realtime-chat.html` with WebSocket client - 5/29/2025, 6:08 PM
- [ ] Implement automatic reconnection with exponential backoff
- [x] Add connection state management (connecting, connected, disconnected) - 5/29/2025, 6:08 PM
- [ ] Create message queue for offline handling
- [x] Implement client-side heartbeat monitoring - 5/29/2025, 6:08 PM

### 1.3 Message Protocol Design
- [x] Define WebSocket message types (audio, text, control, error) - 5/29/2025, 5:53 PM
- [x] Create TypeScript interfaces for all message types - 5/29/2025, 5:53 PM
- [ ] Implement message validation and sanitization
- [x] Add sequence numbers for message ordering - 5/29/2025, 6:08 PM
- [ ] Create acknowledgment system for critical messages

---

## Phase 2: Gemini Streaming Integration

### 2.1 Upgrade Gemini Service for Streaming
- [x] Research Gemini 2.5 Pro's streaming capabilities in `@google/genai` - 5/29/2025, 6:14 PM
- [x] Create `src/services/gemini-streaming.service.ts` - 5/29/2025, 6:10 PM
- [x] Implement `generateContentStream()` with multimodal output - 5/29/2025, 6:10 PM
- [x] Add support for partial text responses - 5/29/2025, 6:10 PM
- [x] Handle streaming errors and retries - 5/29/2025, 6:10 PM

### 2.2 Enable Multimodal Streaming
- [x] Configure Gemini for simultaneous text + audio output - ❌ NOT SUPPORTED - 5/29/2025, 6:14 PM
  ```typescript
  // ERROR: "Model does not support the requested response modalities: text,audio"
  // Gemini 2.5 Pro does NOT support multimodal streaming
  ```
- [x] Parse streaming chunks for both text and audio data - 5/29/2025, 6:10 PM
- [x] Handle partial audio chunks - 5/29/2025, 6:10 PM
- [x] Implement chunk reassembly logic - 5/29/2025, 6:10 PM
- [x] Add telemetry for chunk timing - 5/29/2025, 6:10 PM

### 2.3 Optimize Streaming Parameters
- [x] Experiment with `temperature` settings for faster response - 5/29/2025, 6:15 PM
- [x] Test different `maxOutputTokens` for optimal chunking - 5/29/2025, 6:15 PM
- [x] Configure `stopSequences` for natural breaks - 5/29/2025, 6:15 PM
- [x] Tune `topK` and `topP` for consistency - 5/29/2025, 6:15 PM
- [x] Document optimal settings for voice applications - 5/29/2025, 6:15 PM

---

## Phase 3: Audio Streaming Pipeline

### 3.1 Server-Side Audio Processing
- [ ] Create `src/services/audio-stream-processor.ts`
- [ ] Implement audio chunk validation (check format, size)
- [ ] Add audio format detection (WAV, PCM, etc.)
- [ ] Create audio chunk queue with priority handling
- [ ] Implement backpressure handling for slow clients

### 3.2 Intelligent Chunking Strategy
- [ ] Create `src/utils/text-chunker.ts` for smart text splitting
- [ ] Implement chunking rules:
  - [ ] First chunk: 20-30 characters (greeting/acknowledgment)
  - [ ] Subsequent chunks: 50-80 characters
  - [ ] Split on: sentence endings, commas, conjunctions
  - [ ] Respect prosody boundaries (breath groups)
- [ ] Add chunk size adaptation based on network speed
- [ ] Create unit tests for chunking logic

### 3.3 Progressive Audio Generation
- [ ] Modify TTS service to accept text chunks
- [ ] Implement parallel chunk processing:
  ```typescript
  async function* generateAudioStream(textChunks: string[]) {
    const audioPromises = textChunks.map(chunk => 
      geminiTTS.generateAudio(chunk)
    );
    for (const promise of audioPromises) {
      yield await promise;
    }
  }
  ```
- [ ] Add chunk caching for common phrases
- [ ] Implement chunk prefetching
- [ ] Monitor and log chunk generation times

---

## Phase 4: Client-Side Audio Management

### 4.1 Web Audio API Integration
- [ ] Create `public/js/audio-stream-player.js`
- [ ] Implement AudioContext management
- [ ] Create circular buffer for smooth playback:
  ```javascript
  class AudioStreamBuffer {
    constructor(minBufferSize = 3, maxBufferSize = 10) {
      this.queue = [];
      this.isPlaying = false;
    }
  }
  ```
- [ ] Handle different audio formats (WAV to PCM conversion)
- [ ] Add volume normalization

### 4.2 Playback Optimization
- [ ] Implement gapless audio playback
- [ ] Add crossfade between chunks (10-20ms)
- [ ] Create adaptive buffer sizing based on network conditions
- [ ] Handle audio underruns gracefully
- [ ] Add playback speed adjustment for catch-up

### 4.3 Latency Monitoring
- [ ] Add client-side timing measurements:
  - [ ] Time to first byte (TTFB)
  - [ ] Time to first audio
  - [ ] Chunk arrival intervals
  - [ ] Buffer health metrics
- [ ] Display real-time latency dashboard
- [ ] Log performance metrics for analysis

---

## Phase 5: Conversation Flow Optimization

### 5.1 Interruption Handling
- [ ] Implement Voice Activity Detection (VAD) on client
- [ ] Add server-side interruption handling:
  ```typescript
  ws.on('user_speaking', () => {
    // Cancel ongoing TTS generation
    currentGeneration?.cancel();
    // Clear audio queue
    audioQueue.clear();
  });
  ```
- [ ] Create smooth audio fadeout on interruption
- [ ] Implement conversation turn management
- [ ] Add barge-in detection threshold

### 5.2 Predictive Generation
- [ ] Identify common response patterns
- [ ] Pre-generate frequent phrases:
  - [ ] "Yes", "No", "I understand"
  - [ ] "Let me check that for you"
  - [ ] "One moment please"
- [ ] Cache generated audio with TTL
- [ ] Implement smart cache invalidation
- [ ] Monitor cache hit rates

### 5.3 Context Management
- [ ] Implement sliding window for conversation context
- [ ] Optimize context size for speed vs coherence
- [ ] Add context compression techniques
- [ ] Create context priority system
- [ ] Handle context overflow gracefully

---

## Phase 6: Performance Optimization

### 6.1 Network Optimization
- [ ] Implement WebSocket compression (permessage-deflate)
- [ ] Add binary frame support for audio data
- [ ] Optimize message sizes (remove unnecessary data)
- [ ] Implement adaptive quality based on bandwidth
- [ ] Add CDN support for static audio chunks

### 6.2 Server Optimization
- [ ] Implement connection pooling for Gemini API
- [ ] Add request batching where possible
- [ ] Create worker threads for audio processing
- [ ] Implement caching at multiple levels
- [ ] Add horizontal scaling support

### 6.3 Client Optimization
- [ ] Implement Web Workers for audio processing
- [ ] Add OfflineAudioContext for preprocessing
- [ ] Optimize memory usage (cleanup unused buffers)
- [ ] Implement progressive web app features
- [ ] Add WebAssembly audio decoder (optional)

---

## Phase 7: Testing & Monitoring

### 7.1 Load Testing
- [ ] Create load testing scripts with multiple concurrent connections
- [ ] Test with various network conditions (3G, 4G, WiFi)
- [ ] Simulate packet loss and jitter
- [ ] Measure system limits (max concurrent users)
- [ ] Create performance benchmarks

### 7.2 Real-World Testing
- [ ] Test with actual phone calls via Twilio
- [ ] Measure end-to-end latency in production
- [ ] Test with different accents and speaking speeds
- [ ] Validate interruption handling in practice
- [ ] Gather user feedback on naturalness

### 7.3 Monitoring & Analytics
- [ ] Implement comprehensive logging for all components
- [ ] Add Prometheus metrics:
  - [ ] Response times (p50, p95, p99)
  - [ ] Audio generation times
  - [ ] Queue depths
  - [ ] Error rates
- [ ] Create Grafana dashboards
- [ ] Set up alerting for performance degradation
- [ ] Implement distributed tracing

---

## Phase 8: Production Readiness

### 8.1 Error Handling & Recovery
- [ ] Implement circuit breakers for Gemini API
- [ ] Add fallback text responses when TTS fails
- [ ] Create graceful degradation strategies
- [ ] Implement automatic error recovery
- [ ] Add comprehensive error logging

### 8.2 Security
- [ ] Implement WebSocket authentication (JWT tokens)
- [ ] Add rate limiting per connection
- [ ] Validate and sanitize all inputs
- [ ] Implement DDoS protection
- [ ] Add encryption for sensitive data

### 8.3 Deployment
- [ ] Create Docker containers for all services
- [ ] Set up Kubernetes deployment configs
- [ ] Implement blue-green deployment
- [ ] Add health checks and readiness probes
- [ ] Create rollback procedures

---

## Success Metrics

### Target Performance:
- [ ] Time to first audio: < 1 second
- [ ] End-to-end latency: < 1.5 seconds
- [ ] Interruption response: < 200ms
- [ ] Audio quality: No noticeable gaps
- [ ] Concurrent users: 100+ per instance

### Quality Metrics:
- [ ] Natural conversation flow rating: > 4/5
- [ ] Audio clarity rating: > 4.5/5
- [ ] Response relevance: > 90%
- [ ] System reliability: > 99.9% uptime

---

## Implementation Timeline

- **Week 1-2**: Phase 1 & 2 (WebSocket + Gemini Streaming)
- **Week 3-4**: Phase 3 & 4 (Audio Pipeline)
- **Week 5**: Phase 5 (Conversation Flow)
- **Week 6**: Phase 6 (Optimization)
- **Week 7**: Phase 7 (Testing)
- **Week 8**: Phase 8 (Production)

## Notes

- Each task should be completed with tests
- Document all findings and optimizations
- Create demos after each phase
- Regular performance benchmarking
- Consider fallback strategies at each step