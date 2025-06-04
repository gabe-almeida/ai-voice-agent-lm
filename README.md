# Voice Agent System - Developer Documentation

## Overview

This is a real-time AI voice agent system built with Node.js/TypeScript that enables ultra-low latency voice conversations. The system integrates multiple AI providers (OpenAI, Google Gemini) and telephony services (Twilio) to create an intelligent voice assistant named "Emma" who can handle appointment scheduling through CRM integration.

## Quick Start for Developers

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/ai-voice-agent-lm.git
cd ai-voice-agent-lm

# 2. Install dependencies
npm install

# 3. Copy environment file
cp .env.example .env

# 4. Edit .env and add at minimum:
#    - OPENAI_API_KEY (required)
#    - Twilio credentials (optional for phone calls)

# 5. Run in development mode (more forgiving)
npm run dev
```

**Note**: The app will run without Twilio credentials but won't handle phone calls. See [Troubleshooting Guide](docs/TROUBLESHOOTING_LAUNCH_ERRORS.md) for common issues.

## Architecture Overview

### Core Components

1. **WebSocket Server** (`src/websocket/`)
   - Handles real-time bidirectional audio streaming
   - Manages OpenAI Realtime API connections
   - Processes tool calls for CRM integration

2. **Voice Services**
   - **OpenAI Realtime API** (`src/services/openai-realtime.service.ts`) - Primary voice engine
   - **Google Gemini** (`src/services/gemini*.service.ts`) - Alternative voice options
   - **Twilio** (`src/services/twilio.service.ts`) - Phone call handling

3. **Emma Voice Agent** (`src/config/emma-prompt.ts`)
   - AI assistant specialized in luxury makeover appointment scheduling
   - Configured with specific personality and conversation flow
   - Integrated with CRM tools for real-time availability checking

## Key Features

### 1. Real-Time Voice Streaming
- Uses OpenAI's Realtime API for ultra-low latency conversations
- WebSocket-based audio streaming with 16kHz PCM16 format
- Automatic voice activity detection and response generation

### 2. Phone Number Pool Management
- Supports multiple simultaneous outbound calls
- Automatically assigns available numbers from pool
- Releases numbers when calls complete
- Configure via `TWILIO_PHONE_NUMBERS` in `.env` (comma-separated)

### 3. CRM Integration (Requires Configuration)
The system includes two CRM tools that Emma can use:

- **`get_appointment_availability`** - Fetches available appointment slots
- **`create_appointment_event`** - Books appointments in the CRM

**⚠️ IMPORTANT: CRM integration is NOT functional until configured:**
1. Set `CRM_API_BASE_URL` in `.env` to your actual CRM API endpoint
2. Add authentication headers in `src/websocket/openai-realtime.ws.ts` (lines 206 & 237)
3. Verify API response format matches expected structure

### 4. Appointment Management & Validation Security 🔒

Emma includes a comprehensive appointment management system with **mandatory validation security** to prevent operations on non-existent appointments.

#### Available Appointment Tools

Emma can call these appointment management tools during conversations:

**Step 1 - Validation Tools (Required First)**
- **`find_customer_appointment`** - Searches and verifies customer appointments exist
  - Parameters: `customerName` (required), `phoneNumber`, `appointmentDate`, `zipCode` (optional)
  - Must be called before any modification operations

**Step 2 - Action Tools (Require Validation)**
- **`reschedule_appointment`** - Reschedules appointments to new dates/times
- **`cancel_appointment`** - Cancels appointments (with retention attempt tracking)
- **`retain_appointment`** - Marks appointments as retained after retention efforts

**Supporting Tools**
- **`start_cancellation_attempt`** - Initiates cancellation tracking for retention efforts
- **`update_cancellation_attempt`** - Updates rebuttal stages and customer responses
- **`get_available_slots`** - Gets alternative appointment times for rescheduling

#### Security Validation Workflow

**🔒 MANDATORY SEQUENCE**: Emma **cannot** reschedule, cancel, or retain appointments without first finding them:

```
1. Customer: "I want to cancel my appointment"
2. Emma calls: find_customer_appointment(customerName: "John Smith")
3. System verifies: appointment exists, returns exact ID and details
4. Emma can then call: cancel_appointment(appointmentId: "exact_id", customerName: "John Smith")
```

**Prevented Security Issues:**
- ❌ Cannot reschedule/cancel non-existent appointments
- ❌ Cannot use fake appointment IDs
- ❌ Cannot bypass customer verification
- ✅ All operations require validated appointment details

#### Conversational Flow Support

The validation system supports complex customer conversations:

```
Customer: "Cancel my appointment"
Emma: [finds appointment] "I found your June 5th appointment..."
Customer: "Actually, reschedule it instead"
Emma: [uses same validated details for rescheduling]
Customer: "Wait, keep it as is"
Emma: [retains using same validated details]
```

#### Testing Appointment Validation

```bash
# Test the security validation workflow
npx tsx scripts/test-emma-appointment-validation.ts

# Test complete appointment management features
npx tsx scripts/test-emma-unified-workflow.ts
```

**Documentation:** See `/docs/APPOINTMENT_VALIDATION_SECURITY.md` for complete technical details.

## Integration with React Applications

### Option 1: Direct WebSocket Integration
```javascript
// React component example
const ws = new WebSocket('ws://localhost:3001/openai-realtime');

ws.onopen = () => {
  // Send session configuration
  ws.send(JSON.stringify({
    type: 'session.update',
    session: {
      modalities: ['text', 'audio'],
      voice: 'alloy',
      instructions: 'Custom instructions here'
    }
  }));
};

// Handle audio streaming
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'response.audio.delta') {
    // Process audio chunks
  }
};
```

### Option 2: REST API Integration
```javascript
// For non-realtime features
const response = await fetch('http://localhost:3001/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: 'Hello' })
});
```

### Option 3: Embed as iFrame
```html
<iframe 
  src="http://localhost:3001/openai-emma-demo.html"
  width="100%" 
  height="600"
  allow="microphone"
/>
```

## Environment Configuration

### Required Environment Variables

```bash
# Server Configuration
PORT=3001                    # Server port (changed from 3000 due to conflict)
NODE_ENV=development

# OpenAI Configuration
OPENAI_API_KEY=your_key_here # Required for voice agent
OPENAI_REALTIME_MODEL=gpt-4o-realtime-preview-2024-12-17

# Twilio Configuration (for phone calls)
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_PHONE_NUMBERS=+1234567890,+1234567891,+1234567892  # Pool for multiple calls

# CRM Integration (MUST BE CONFIGURED)
CRM_API_BASE_URL=https://your-crm-api.com  # ⚠️ Replace with actual URL

# Google Gemini (optional)
GOOGLE_GEMINI_API_KEY=your_key
```

### Missing Configurations

1. **CRM API Base URL**: Currently set to placeholder `https://your-crm-api.com`
2. **CRM Authentication**: No API keys or auth headers implemented
3. **Webhook URLs**: Twilio webhooks need public URL for production

## API Endpoints

### WebSocket Endpoints
- `ws://localhost:3001/openai-realtime` - OpenAI Realtime voice streaming
- `ws://localhost:3001/ws` - General WebSocket connection

### REST Endpoints
- `GET /` - Landing page
- `GET /health` - Health check
- `POST /api/chat` - Text chat endpoint
- `POST /webhooks/twilio/*` - Twilio webhook handlers

### Demo Pages
- `/openai-emma-demo.html` - Emma voice agent demo
- `/realtime-chat.html` - Generic realtime chat demo
- `/streaming-chat.html` - Streaming chat interface

## Project Structure

```
src/
├── config/           # Configuration files
│   ├── index.ts     # Environment config
│   └── emma-prompt.ts # Emma's personality/instructions
├── services/         # Business logic
│   ├── openai-realtime.service.ts # OpenAI integration
│   ├── twilio.service.ts          # Phone handling
│   └── gemini*.service.ts         # Google voice options
├── websocket/        # WebSocket handlers
│   ├── server.ts    # WebSocket server setup
│   └── openai-realtime.ws.ts # OpenAI WS handler
├── routes/          # HTTP route handlers
├── utils/           # Utility functions
└── app.ts          # Express app setup
```

## Development Workflow

### Starting the Server
```bash
npm install
npm run dev  # Starts on port 3001
```

### Testing Voice Agent
1. Navigate to `http://localhost:3001/openai-emma-demo.html`
2. Click "Connect to Emma"
3. Allow microphone access
4. Start speaking to test the voice agent

### Testing Phone Integration
```bash
npm run test:twilio  # Test Twilio configuration
```

## Common Issues & Solutions

### Port Already in Use
- Default port changed from 3000 to 3001
- Update `.env` if needed

### CRM Tools Not Working
- Set `CRM_API_BASE_URL` in `.env`
- Add authentication headers in WebSocket handler
- Check API response format matches expectations

### Multiple Calls Failing
- Ensure enough phone numbers in `TWILIO_PHONE_NUMBERS`
- Each concurrent call needs a unique number

## Security Considerations

1. **API Keys**: Never commit `.env` file
2. **CORS**: Currently allows all origins (update for production)
3. **WebSocket**: No authentication implemented (add for production)
4. **CRM Auth**: Must implement proper authentication headers

## Knowledge Base System

The AI agent includes a production-ready knowledge base system that matches how VAPI and ElevenLabs handle knowledge:

### How It Works
- Knowledge is embedded directly in the system prompt (no tool calls = faster responses)
- Supports **10,000-20,000 tokens** of knowledge (approximately 15-30 pages of text)
- Automatically loaded from `data/knowledge-base.json`
- Cached for performance

### Adding Knowledge
1. Edit `data/knowledge-base.json` with your company information
2. The system automatically formats and embeds it into Emma's prompt
3. No code changes needed - just update the JSON file

### Token Limits
- **OpenAI GPT-4o**: 128,000 total context tokens
- **Recommended for Knowledge**: 10,000-20,000 tokens
- **What fits**: 50-100+ services, complete policies, extensive FAQs, product catalogs

See `/docs/KNOWLEDGE_BASE_INTEGRATION.md` for detailed implementation guide.

## Cost Tracking

The system includes cost tracking for API usage:
- OpenAI Realtime API costs
- Twilio call costs
- Logged in `src/utils/cost-tracker.ts`

## Next Steps for Integration

1. **Configure CRM API**
   - Replace placeholder URL in `.env`
   - Add authentication in `openai-realtime.ws.ts`

2. **Production Deployment**
   - Set up HTTPS/WSS
   - Configure proper CORS
   - Add authentication middleware

3. **React Integration**
   - Choose integration method (WebSocket/REST/iFrame)
   - Handle microphone permissions
   - Implement error handling

4. **Monitoring**
   - Set up logging aggregation
   - Monitor API costs
   - Track call success rates

## Support & Documentation

- Main documentation: `/docs/` directory
- Architecture details: `/Plan/ARCHITECTURE.md`
- Implementation progress: `/docs/IMPLEMENTATION_PROGRESS.md`
- OpenAI integration: `/docs/OPENAI_REALTIME_INTEGRATION.md`
- Knowledge base guide: `/docs/KNOWLEDGE_BASE_INTEGRATION.md`
- Token limits explained: `/docs/KNOWLEDGE_BASE_TOKEN_LIMITS.md`
- **Deployment guide**: `/docs/RENDER_DEPLOYMENT_GUIDE.md`
- **Quick deployment reference**: `/docs/RENDER_QUICK_REFERENCE.md`

## Contact

For questions about the implementation, refer to the inline code comments and documentation files. The system is designed to be modular and extensible for future enhancements.