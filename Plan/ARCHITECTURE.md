# Voice Agent System Architecture

## System Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Twilio Voice   │────▶│   API Gateway   │────▶│  Load Balancer  │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                          │
                                ┌─────────────────────────┴─────────────────────────┐
                                │                                                   │
                        ┌───────▼────────┐                                 ┌────────▼───────┐
                        │                │                                 │                │
                        │  WebSocket     │                                 │   REST API     │
                        │   Server       │                                 │   Server       │
                        │                │                                 │                │
                        └───────┬────────┘                                 └────────┬───────┘
                                │                                                   │
                        ┌───────▼────────┐                                 ┌────────▼───────┐
                        │                │                                 │                │
                        │  Audio Stream  │                                 │  Agent Mgmt    │
                        │   Handler      │                                 │   Service      │
                        │                │                                 │                │
                        └───────┬────────┘                                 └────────┬───────┘
                                │                                                   │
                                └─────────────────┬─────────────────────────────────┘
                                                  │
                                          ┌───────▼────────┐
                                          │                │
                                          │  Call Manager  │
                                          │   (Queue)      │
                                          │                │
                                          └───────┬────────┘
                                                  │
                        ┌─────────────────────────┴─────────────────────────┐
                        │                                                   │
                ┌───────▼────────┐                                 ┌────────▼───────┐
                │                │                                 │                │
                │  Gemini 2.0    │                                 │   PostgreSQL   │
                │  Flash API     │                                 │   Database     │
                │                │                                 │                │
                └────────────────┘                                 └────────────────┘
```

## Component Details

### 1. API Gateway
- **Purpose**: Entry point for all external requests
- **Technology**: NGINX or AWS API Gateway
- **Features**:
  - Rate limiting
  - Authentication
  - Request routing
  - SSL termination

### 2. WebSocket Server
- **Purpose**: Handle real-time audio streaming from Twilio
- **Technology**: Node.js with Socket.io
- **Features**:
  - Connection management
  - Audio stream handling
  - Session management
  - Heartbeat/keepalive

### 3. REST API Server
- **Purpose**: Handle CRUD operations and call triggering
- **Technology**: Express.js with TypeScript
- **Endpoints**:
  - `/api/agents` - Agent management
  - `/api/calls` - Call operations
  - `/api/knowledge` - Knowledge base management
  - `/api/analytics` - Call analytics

### 4. Call Manager
- **Purpose**: Orchestrate calls and manage concurrency
- **Technology**: Bull/BullMQ with Redis
- **Features**:
  - Call queuing
  - Worker pool management
  - Call state tracking
  - Load distribution

### 5. Audio Stream Handler
- **Purpose**: Process audio between Twilio and Gemini
- **Features**:
  - Format conversion (μ-law ↔ PCM)
  - Audio buffering
  - Voice Activity Detection
  - Stream synchronization

### 6. Agent Management Service
- **Purpose**: Handle agent configurations and knowledge bases
- **Features**:
  - CRUD operations
  - Version control
  - Knowledge base indexing
  - Configuration validation

### 7. Database Layer
- **Purpose**: Persistent storage for all system data
- **Schema**:
  - Agents table
  - Calls table
  - Knowledge bases table
  - Call recordings table
  - Analytics table

## Data Flow

### Inbound Call Flow
1. User calls Twilio number
2. Twilio sends webhook to API Gateway
3. API Gateway routes to WebSocket server
4. WebSocket server establishes media stream
5. Audio handler processes incoming audio
6. Call manager assigns to available worker
7. Worker sends audio to Gemini API
8. Gemini response is converted to audio
9. Audio is streamed back to Twilio
10. Call ends and analytics are stored

### Outbound Call Flow
1. API request to trigger call
2. Call manager queues the request
3. Worker picks up the job
4. Twilio API initiates call
5. Once connected, follows inbound flow
6. Call completion triggers callbacks

## Scaling Strategy

### Horizontal Scaling
- **WebSocket Servers**: Multiple instances behind load balancer
- **API Servers**: Auto-scaling based on CPU/memory
- **Workers**: Dynamic worker pool based on queue depth
- **Database**: Read replicas for analytics queries

### Vertical Scaling
- **Audio Processing**: GPU acceleration for VAD
- **Caching**: Redis cluster for session data
- **Storage**: Object storage for recordings

## Security Considerations

### Authentication & Authorization
- API key authentication for external APIs
- JWT tokens for session management
- Role-based access control (RBAC)
- Twilio signature validation

### Data Protection
- Encryption at rest for sensitive data
- TLS for all communications
- Audio stream encryption
- PII data masking in logs

### Network Security
- VPC isolation for internal services
- Firewall rules for service communication
- DDoS protection at edge
- Rate limiting per client

## Monitoring & Observability

### Metrics
- Call success rate
- Average call duration
- Concurrent calls
- API response times
- Audio processing latency
- Gemini API latency

### Logging
- Structured logging with correlation IDs
- Call transcripts (with consent)
- Error tracking
- Audit logs for configuration changes

### Alerting
- Call failure rate threshold
- High latency alerts
- Service health checks
- Resource utilization alerts

## Deployment Architecture

### Development Environment
- Docker Compose for local development
- LocalStack for AWS service mocking
- ngrok for Twilio webhook testing

### Staging Environment
- Kubernetes cluster (smaller scale)
- Separate Twilio numbers
- Test data isolation
- Performance testing setup

### Production Environment
- Multi-region Kubernetes clusters
- Auto-scaling policies
- Blue-green deployment
- Disaster recovery setup

## Technology Decisions

### Why Node.js?
- Excellent WebSocket support
- Non-blocking I/O for concurrent calls
- Large ecosystem for telephony
- TypeScript for type safety

### Why PostgreSQL?
- ACID compliance for call records
- JSON support for flexible schemas
- Excellent performance at scale
- Mature ecosystem

### Why Redis?
- Fast in-memory operations
- Pub/sub for real-time events
- Built-in data structures
- Clustering support

### Why Kubernetes?
- Container orchestration
- Auto-scaling capabilities
- Self-healing
- Service discovery

## Cost Optimization

### Resource Management
- Auto-scaling based on demand
- Spot instances for workers
- Reserved instances for core services
- CDN for static assets

### API Usage
- Batch operations where possible
- Caching for repeated queries
- Rate limiting to prevent abuse
- Usage-based billing tiers

---

Last Updated: 5/29/2025, 11:42:33 AM