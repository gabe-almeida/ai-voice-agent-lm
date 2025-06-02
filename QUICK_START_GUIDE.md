# Voice Agent - Quick Start Guide

## 🚨 Critical Setup Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Create `.env` file with these REQUIRED values:

```bash
# Server (using port 3001 to avoid conflicts)
PORT=3001

# OpenAI (REQUIRED for voice agent)
OPENAI_API_KEY=sk-proj-xxxxx  # Get from OpenAI dashboard

# Twilio (REQUIRED for phone calls)
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_PHONE_NUMBERS=+1234567890,+1234567891  # Multiple numbers for concurrent calls

# CRM Integration (MUST CONFIGURE - Currently NOT working)
CRM_API_BASE_URL=https://your-actual-crm-api.com  # ⚠️ REPLACE THIS!
```

### 3. Fix CRM Integration (Required for Appointment Booking)

The CRM integration code exists but needs configuration:

1. **Update CRM URL** in `.env` (shown above)

2. **Add Authentication** in `src/websocket/openai-realtime.ws.ts`:
   ```typescript
   // Line 206 - Add headers for GET request
   const response = await axios.get(`${crmApiBaseUrl}/sales-rep-availability`, {
     headers: {
       'Authorization': 'Bearer YOUR_API_KEY',  // Add your auth
       'X-API-Key': 'your-api-key'             // Or whatever your CRM needs
     }
   });

   // Line 237 - Add headers for POST request
   const response = await axios.post(`${crmApiBaseUrl}/events`, payload, {
     headers: {
       'Authorization': 'Bearer YOUR_API_KEY',  // Add your auth
       'X-API-Key': 'your-api-key'             // Or whatever your CRM needs
     }
   });
   ```

### 4. Start the Server
```bash
npm run dev
```

Server runs on: `http://localhost:3001`

## 🎯 Testing the Voice Agent

1. Open browser: `http://localhost:3001/openai-emma-demo.html`
2. Click "Connect to Emma"
3. Allow microphone access
4. Start talking!

## 🔌 Integration Options

### For React Apps:

**Option 1 - WebSocket (Recommended for real-time voice)**
```javascript
const ws = new WebSocket('ws://localhost:3001/openai-realtime');
// See DEVELOPER_README.md for full implementation
```

**Option 2 - iFrame (Easiest)**
```jsx
<iframe 
  src="http://localhost:3001/openai-emma-demo.html"
  width="100%" 
  height="600"
  allow="microphone"
/>
```

## ⚠️ Current Limitations

1. **CRM Not Working** - Needs real API URL and authentication
2. **No Production Security** - Add auth middleware before deploying
3. **Local Only** - Needs HTTPS/WSS for production
4. **CORS Open** - Currently allows all origins

## 📞 Phone System Notes

- Supports multiple simultaneous calls
- Each call uses a different phone number from the pool
- Add more numbers to `TWILIO_PHONE_NUMBERS` for more concurrent calls
- Numbers automatically released when calls end

## 🆘 Troubleshooting

**"Port already in use"**
- We use port 3001 (not 3000) to avoid conflicts
- Check `.env` file has `PORT=3001`

**"CRM tools not working"**
- You MUST configure `CRM_API_BASE_URL` with real URL
- You MUST add authentication headers (see step 3)

**"Can't make multiple calls"**
- Add more phone numbers to `TWILIO_PHONE_NUMBERS`
- Format: `+1234567890,+1234567891,+1234567892`

## 📁 Key Files to Review

- `src/websocket/openai-realtime.ws.ts` - Main WebSocket handler & CRM integration
- `src/config/emma-prompt.ts` - Emma's personality and behavior
- `src/services/twilio.service.ts` - Phone number pool logic
- `DEVELOPER_README.md` - Full technical documentation

## 🚀 Next Steps

1. Configure CRM API (URL + Auth)
2. Test voice agent locally
3. Plan production deployment (HTTPS, auth, monitoring)
4. Integrate into your React app using preferred method

---

**Need more details?** See `DEVELOPER_README.md` for complete documentation.