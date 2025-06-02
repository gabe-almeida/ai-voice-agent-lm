# Voice Agent Technical Specification

## 1. System Requirements

### 1.1 Functional Requirements
- **FR1**: Support simultaneous inbound and outbound calls
- **FR2**: Integrate with Twilio for telephony services
- **FR3**: Use Google Gemini 2.0 Flash for AI conversations
- **FR4**: Allow custom instructions per agent
- **FR5**: Support knowledge base integration
- **FR6**: Provide REST API for call triggering
- **FR7**: Real-time audio streaming and processing
- **FR8**: Call recording and transcription
- **FR9**: Agent management (CRUD operations)
- **FR10**: Call analytics and reporting

### 1.2 Non-Functional Requirements
- **NFR1**: Support minimum 100 concurrent calls
- **NFR2**: < 500ms audio latency end-to-end
- **NFR3**: 99.9% uptime SLA
- **NFR4**: Horizontal scalability
- **NFR5**: GDPR/CCPA compliance
- **NFR6**: Call recordings encrypted at rest
- **NFR7**: API response time < 200ms (p95)
- **NFR8**: Auto-scaling based on load

## 2. API Specifications

### 2.1 Agent Management API

#### Create Agent
```http
POST /api/v1/agents
Content-Type: application/json
Authorization: Bearer {api_key}

{
  "name": "Customer Support Agent",
  "instructions": "You are a helpful customer support agent...",
  "voice": {
    "provider": "gemini",
    "model": "2.0-flash",
    "language": "en-US",
    "voice_id": "default"
  },
  "knowledge_base_ids": ["kb_123", "kb_456"],
  "metadata": {
    "department": "support",
    "tier": "premium"
  }
}

Response: 201 Created
{
  "id": "agent_789",
  "name": "Customer Support Agent",
  "status": "active",
  "created_at": "2025-05-29T15:42:00Z",
  "updated_at": "2025-05-29T15:42:00Z"
}
```

#### Update Agent
```http
PUT /api/v1/agents/{agent_id}
Content-Type: application/json
Authorization: Bearer {api_key}

{
  "instructions": "Updated instructions...",
  "knowledge_base_ids": ["kb_123", "kb_789"]
}

Response: 200 OK
```

#### Get Agent
```http
GET /api/v1/agents/{agent_id}
Authorization: Bearer {api_key}

Response: 200 OK
{
  "id": "agent_789",
  "name": "Customer Support Agent",
  "instructions": "...",
  "voice": {...},
  "knowledge_base_ids": [...],
  "metadata": {...},
  "stats": {
    "total_calls": 1523,
    "avg_call_duration": 245,
    "satisfaction_score": 4.8
  }
}
```

### 2.2 Call Management API

#### Initiate Outbound Call
```http
POST /api/v1/calls/outbound
Content-Type: application/json
Authorization: Bearer {api_key}

{
  "agent_id": "agent_789",
  "to_number": "+1234567890",
  "from_number": "+0987654321",
  "context": {
    "customer_id": "cust_123",
    "reason": "follow_up"
  },
  "webhook_url": "https://example.com/call-events",
  "max_duration": 1800
}

Response: 202 Accepted
{
  "call_id": "call_abc123",
  "status": "queued",
  "estimated_start": "2025-05-29T15:45:00Z"
}
```

#### Get Call Status
```http
GET /api/v1/calls/{call_id}
Authorization: Bearer {api_key}

Response: 200 OK
{
  "call_id": "call_abc123",
  "status": "in_progress",
  "agent_id": "agent_789",
  "direction": "outbound",
  "from_number": "+0987654321",
  "to_number": "+1234567890",
  "started_at": "2025-05-29T15:45:30Z",
  "duration": 125,
  "recording_url": null,
  "transcript_url": null
}
```

### 2.3 Knowledge Base API

#### Upload Knowledge Base
```http
POST /api/v1/knowledge-bases
Content-Type: multipart/form-data
Authorization: Bearer {api_key}

{
  "name": "Product Documentation",
  "description": "Latest product docs",
  "file": <binary data>,
  "type": "pdf"
}

Response: 201 Created
{
  "id": "kb_789",
  "name": "Product Documentation",
  "status": "processing",
  "chunks": 0,
  "created_at": "2025-05-29T15:50:00Z"
}
```

## 3. WebSocket Protocol

### 3.1 Connection Establishment
```javascript
// Client connects to WebSocket server
const ws = new WebSocket('wss://api.voiceagent.com/v1/media');

// Authentication
ws.send(JSON.stringify({
  event: 'auth',
  token: 'Bearer {api_key}',
  call_id: 'call_abc123'
}));

// Server response
{
  "event": "connected",
  "call_id": "call_abc123",
  "session_id": "sess_xyz789"
}
```

### 3.2 Audio Streaming Protocol
```javascript
// Audio data from Twilio
{
  "event": "media",
  "sequence_number": 1,
  "media": {
    "track": "inbound",
    "chunk": "base64_encoded_audio",
    "timestamp": 1234567890,
    "format": "audio/x-mulaw"
  }
}

// Audio data to Twilio
{
  "event": "media",
  "sequence_number": 1,
  "media": {
    "track": "outbound",
    "chunk": "base64_encoded_audio",
    "format": "audio/x-mulaw"
  }
}
```

## 4. Database Schema

### 4.1 Agents Table
```sql
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    instructions TEXT NOT NULL,
    voice_config JSONB NOT NULL,
    metadata JSONB,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_agents_status ON agents(status);
CREATE INDEX idx_agents_metadata ON agents USING GIN(metadata);
```

### 4.2 Calls Table
```sql
CREATE TABLE calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES agents(id),
    twilio_call_sid VARCHAR(255) UNIQUE,
    direction VARCHAR(20) NOT NULL,
    from_number VARCHAR(50) NOT NULL,
    to_number VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    duration INTEGER,
    recording_url TEXT,
    transcript JSONB,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_calls_agent_id ON calls(agent_id);
CREATE INDEX idx_calls_status ON calls(status);
CREATE INDEX idx_calls_created_at ON calls(created_at);
```

### 4.3 Knowledge Bases Table
```sql
CREATE TABLE knowledge_bases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    file_url TEXT NOT NULL,
    vector_index_id VARCHAR(255),
    chunk_count INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'processing',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE agent_knowledge_bases (
    agent_id UUID REFERENCES agents(id),
    knowledge_base_id UUID REFERENCES knowledge_bases(id),
    PRIMARY KEY (agent_id, knowledge_base_id)
);
```

## 5. Audio Processing Specifications

### 5.1 Audio Formats
- **Twilio Input**: 8kHz, 8-bit μ-law, mono
- **Gemini Input**: 16kHz, 16-bit PCM, mono
- **Internal Processing**: 16kHz, 16-bit PCM, mono

### 5.2 Audio Conversion Pipeline
```typescript
interface AudioPipeline {
  // μ-law to PCM conversion
  mulawToPCM(buffer: Buffer): Buffer;
  
  // PCM to μ-law conversion
  pcmToMulaw(buffer: Buffer): Buffer;
  
  // Resample audio
  resample(buffer: Buffer, fromRate: number, toRate: number): Buffer;
  
  // Voice Activity Detection
  detectVoiceActivity(buffer: Buffer): boolean;
}
```

### 5.3 Buffering Strategy
- Input buffer: 200ms rolling window
- Output buffer: 100ms
- Jitter buffer: 50ms
- Maximum latency target: 500ms

## 6. Security Specifications

### 6.1 Authentication
- API Key authentication for REST endpoints
- JWT tokens for WebSocket connections
- Twilio signature validation for webhooks

### 6.2 Encryption
- TLS 1.3 for all API communications
- AES-256 for call recordings at rest
- End-to-end encryption for sensitive metadata

### 6.3 Access Control
```typescript
interface Permission {
  resource: 'agents' | 'calls' | 'knowledge_bases';
  actions: ('create' | 'read' | 'update' | 'delete')[];
}

interface ApiKey {
  id: string;
  key_hash: string;
  permissions: Permission[];
  rate_limit: number;
  expires_at: Date;
}
```

## 7. Performance Specifications

### 7.1 Latency Requirements
- Audio processing: < 50ms
- Gemini API round trip: < 300ms
- Total end-to-end: < 500ms

### 7.2 Throughput Requirements
- Concurrent calls: 100 minimum, 1000 target
- API requests: 10,000 req/min
- WebSocket connections: 1,000 concurrent

### 7.3 Resource Limits
- Maximum call duration: 2 hours
- Maximum audio buffer: 10 seconds
- Maximum knowledge base size: 100MB
- Maximum agents per account: 1,000

## 8. Error Handling

### 8.1 Error Codes
```typescript
enum ErrorCode {
  // Client errors (4xx)
  INVALID_REQUEST = 'ERR_INVALID_REQUEST',
  UNAUTHORIZED = 'ERR_UNAUTHORIZED',
  AGENT_NOT_FOUND = 'ERR_AGENT_NOT_FOUND',
  RATE_LIMIT_EXCEEDED = 'ERR_RATE_LIMIT',
  
  // Server errors (5xx)
  INTERNAL_ERROR = 'ERR_INTERNAL',
  TWILIO_ERROR = 'ERR_TWILIO',
  GEMINI_ERROR = 'ERR_GEMINI',
  DATABASE_ERROR = 'ERR_DATABASE'
}
```

### 8.2 Retry Strategy
- Exponential backoff for transient failures
- Maximum 3 retries for API calls
- Circuit breaker for external services
- Dead letter queue for failed calls

## 9. Monitoring & Metrics

### 9.1 Key Metrics
- Call success rate
- Average call duration
- Audio latency (p50, p95, p99)
- API response time
- Concurrent calls
- Error rates by type

### 9.2 Logging Standards
```typescript
interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  call_id?: string;
  agent_id?: string;
  message: string;
  metadata?: Record<string, any>;
  error?: {
    code: string;
    stack?: string;
  };
}
```

---

Last Updated: 5/29/2025, 11:43:28 AM