# Deploying Voice Agent to Render.com

## Overview

This guide walks you through deploying your AI Voice Agent to Render.com with full WebSocket support. Render is ideal for this application because it:
- Supports WebSockets natively
- Handles HTTPS/WSS automatically
- Provides easy environment variable management
- Costs ~$25/month for a production-ready setup

## Prerequisites

1. A Render.com account (free to create)
2. Your project pushed to GitHub
3. Environment variables ready (API keys, etc.)

## Step 1: Prepare Your Application

### 1.1 Create a Build Script

First, let's ensure your `package.json` has the correct scripts:

```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx watch src/index.ts"
  }
}
```

### 1.2 Update Your Port Configuration

Render provides the PORT environment variable. Your app already handles this correctly in `src/config/index.ts`:

```typescript
port: parseInt(process.env.PORT || '3001', 10)
```

## Step 2: Create Render Configuration

### 2.1 Create render.yaml

Create a `render.yaml` file in your project root:

```yaml
services:
  - type: web
    name: voice-agent
    runtime: node
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: OPENAI_API_KEY
        sync: false # Set in Render dashboard
      - key: TWILIO_ACCOUNT_SID
        sync: false
      - key: TWILIO_AUTH_TOKEN
        sync: false
      - key: TWILIO_PHONE_NUMBER
        sync: false
      - key: TWILIO_PHONE_NUMBERS
        sync: false
      - key: CRM_API_BASE_URL
        sync: false
      - key: GOOGLE_GEMINI_API_KEY
        sync: false
    autoDeploy: true
    healthCheckPath: /health
```

## Step 3: Deploy to Render

### 3.1 Connect Your GitHub Repository

1. Log in to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub account if not already connected
4. Select your `ai-voice-agent-lm` repository

### 3.2 Configure Your Service

1. **Name**: `voice-agent` (or your preferred name)
2. **Environment**: `Node`
3. **Region**: Choose closest to your users
4. **Branch**: `main`
5. **Build Command**: `npm install && npm run build`
6. **Start Command**: `npm start`

### 3.3 Choose Instance Type

For production voice agent:
- **Recommended**: "Starter Plus" ($25/month)
  - 1 GB RAM
  - 0.5 CPU
  - Handles ~50 concurrent connections

For testing:
- **Free tier** works but has limitations:
  - Spins down after 15 min inactivity
  - Limited CPU/memory

### 3.4 Set Environment Variables

In the Render dashboard, add your environment variables:

```
NODE_ENV=production
OPENAI_API_KEY=sk-proj-xxxxx
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_PHONE_NUMBERS=+1234567890,+1234567891
CRM_API_BASE_URL=https://your-crm-api.com
GOOGLE_GEMINI_API_KEY=AIzaxxxxx
```

## Step 4: Configure Twilio Webhooks

Once deployed, update your Twilio phone numbers to point to your Render URL:

1. Get your Render URL: `https://voice-agent.onrender.com`
2. In Twilio Console, update webhook URLs:
   - Voice URL: `https://voice-agent.onrender.com/webhooks/twilio/voice`
   - Status Callback: `https://voice-agent.onrender.com/webhooks/twilio/status`

## Step 5: WebSocket Configuration

### 5.1 Update Your Frontend

Update the WebSocket URLs in your frontend files to use your Render domain:

```javascript
// In public/openai-emma-demo.html and other frontend files
const ws = new WebSocket('wss://voice-agent.onrender.com/openai-realtime');
```

### 5.2 CORS Configuration (if needed)

If you're hosting the frontend separately, update CORS in `src/app.ts`:

```typescript
app.use(cors({
  origin: [
    'https://your-frontend-domain.com',
    'http://localhost:3000' // for local development
  ],
  credentials: true
}));
```

## Step 6: Monitoring and Logs

### 6.1 View Logs

In Render dashboard:
1. Click on your service
2. Go to "Logs" tab
3. You'll see real-time logs

### 6.2 Set Up Health Monitoring

Render automatically monitors your `/health` endpoint. You can also:
1. Set up Render's built-in alerts
2. Use external monitoring (UptimeRobot, Pingdom)

## Step 7: Custom Domain (Optional)

### 7.1 Add Custom Domain

1. In Render dashboard → Settings → Custom Domains
2. Add your domain: `voice-agent.yourdomain.com`
3. Update DNS records as instructed

### 7.2 Update Webhooks

Remember to update all webhooks and WebSocket URLs to use your custom domain.

## Troubleshooting

### WebSocket Connection Issues

If WebSockets aren't connecting:
1. Ensure you're using `wss://` (not `ws://`)
2. Check browser console for errors
3. Verify CORS settings

### Memory Issues

If you see memory errors:
1. Upgrade to a larger instance
2. Check for memory leaks in logs
3. Implement connection limits

### Cold Starts (Free Tier)

If using free tier:
1. Expect 30-60 second cold starts
2. Consider using a keep-alive service
3. Upgrade to paid tier for always-on service

## Production Checklist

Before going live:

- [ ] All environment variables set
- [ ] Twilio webhooks updated
- [ ] WebSocket URLs updated in frontend
- [ ] Custom domain configured (optional)
- [ ] Monitoring set up
- [ ] Test calls working
- [ ] Knowledge base loaded
- [ ] Error logging configured

## Cost Optimization

### Render Costs
- **Starter Plus**: $25/month (recommended)
- **Standard**: $85/month (for high traffic)

### API Costs (estimated per 1000 calls)
- **OpenAI Realtime**: ~$150-300
- **Twilio**: ~$20-40
- **Total**: ~$200-400 per 1000 calls

### Tips to Reduce Costs
1. Implement call duration limits
2. Cache common responses
3. Use connection pooling
4. Monitor API usage closely

## Scaling Considerations

When you need to scale:

1. **Horizontal Scaling**: Deploy multiple instances with load balancer
2. **Database**: Add Redis for session management
3. **CDN**: Use Cloudflare for static assets
4. **Queue**: Implement job queue for async tasks

## Security Best Practices

1. **API Keys**: Never commit to git
2. **Webhooks**: Validate Twilio signatures
3. **Rate Limiting**: Already implemented
4. **HTTPS**: Enforced by Render
5. **Updates**: Keep dependencies updated

## Next Steps

1. Deploy to Render following this guide
2. Test with a few calls
3. Monitor logs and performance
4. Adjust instance size as needed
5. Set up alerts for errors

Your voice agent is now ready for production on Render.com! 🚀