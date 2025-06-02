# Testing the Voice Agent System

## Quick Start Testing

### 1. Prerequisites
- Node.js installed
- `.env` file configured (copy from `.env.example`)
- Gemini API key is already included in `.env.example`

### 2. Start the Server
```bash
npm run dev
```

The server will start on http://localhost:3000

### 3. Test Endpoints

#### Health Check
```bash
curl http://localhost:3000/health
```

#### Detailed Health Check
```bash
curl http://localhost:3000/health/detailed | jq
```

### 4. Test Scripts

#### Test Gemini Integration
```bash
npm run test:gemini
```

#### Test Phone Conversation Simulation
```bash
npm run test:conversation
```

## Testing with Twilio (Optional)

If you have Twilio credentials:

1. Update `.env` with your Twilio credentials:
   ```
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=your_auth_token
   TWILIO_PHONE_NUMBER=+1234567890
   ```

2. Install ngrok:
   ```bash
   brew install ngrok  # macOS
   # or download from https://ngrok.com
   ```

3. Expose your local server:
   ```bash
   ngrok http 3000
   ```

4. Configure your Twilio phone number:
   - Voice URL: `https://your-ngrok-url.ngrok.io/webhooks/twilio/voice`
   - Status Callback: `https://your-ngrok-url.ngrok.io/webhooks/twilio/status`

5. Call your Twilio number to test!

## Testing Without Twilio

You can test the voice agent logic without Twilio by:

1. Using the conversation simulation script
2. Making direct HTTP requests to the webhook endpoints
3. Using the test scripts provided

### Simulate Incoming Call
```bash
curl -X POST http://localhost:3000/webhooks/twilio/voice \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "CallSid=test123&From=+1234567890&To=+0987654321&CallStatus=ringing"
```

## Troubleshooting

### Server won't start
- Check if port 3000 is already in use
- Verify `.env` file exists and has valid Gemini API key
- Check console for error messages

### Gemini errors
- Verify API key is correct
- Check internet connection
- Review rate limits

### Twilio errors
- Ensure credentials start with 'AC' for account SID
- Verify phone number format (+1234567890)
- Check webhook URLs are accessible

## Next Steps

1. Implement WebSocket support for real-time audio
2. Add concurrent call handling
3. Create agent management API
4. Add knowledge base support
5. Implement call recording

---

Last Updated: 5/29/2025, 3:39:40 PM