# Render.com Deployment Quick Reference

## 🚀 Quick Deploy Steps

1. **Pre-deployment Check**
   ```bash
   npm run predeploy
   ```

2. **Deploy Script**
   ```bash
   npm run deploy
   ```

3. **Manual Deploy**
   - Push to GitHub: `git push origin main`
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Create new Web Service
   - Connect GitHub repo
   - Deploy!

## 🔧 Environment Variables

Required in Render dashboard:
```
OPENAI_API_KEY=sk-proj-xxxxx
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_PHONE_NUMBERS=+1234567890,+1234567891
CRM_API_BASE_URL=https://your-crm-api.com
```

## 🌐 URLs After Deployment

- **App URL**: `https://voice-agent.onrender.com`
- **Health Check**: `https://voice-agent.onrender.com/health`
- **WebSocket**: `wss://voice-agent.onrender.com/openai-realtime`
- **Twilio Webhook**: `https://voice-agent.onrender.com/webhooks/twilio/voice`

## 📱 Update Twilio

After deployment, update in Twilio Console:
1. Go to Phone Numbers
2. Update each number's Voice URL to:
   ```
   https://voice-agent.onrender.com/webhooks/twilio/voice
   ```

## 🧪 Test Production

1. **Test WebSocket**
   ```bash
   PRODUCTION_URL=wss://voice-agent.onrender.com npm run test:production-ws
   ```

2. **Test Phone Call**
   - Call your Twilio number
   - Should connect to Emma

## 📊 Monitor

- **Logs**: Render Dashboard → Your Service → Logs
- **Metrics**: Render Dashboard → Your Service → Metrics
- **Alerts**: Set up in Render Dashboard → Settings

## 🚨 Troubleshooting

### WebSocket Not Connecting
- Check OPENAI_API_KEY is set
- Verify using `wss://` not `ws://`
- Check browser console

### Calls Not Working
- Verify Twilio webhook URLs updated
- Check Twilio phone number configuration
- Review logs for errors

### High Costs
- Monitor OpenAI usage
- Set call duration limits
- Review cost tracking logs

## 💰 Cost Estimates

- **Render**: $25/month (Starter Plus)
- **Per Call**: ~$0.15-0.30 (OpenAI + Twilio)
- **Monthly (1000 calls)**: ~$200-400

## 🔄 Updates

To deploy updates:
1. Make changes locally
2. Test thoroughly
3. Commit and push to GitHub
4. Render auto-deploys (if enabled)

Or manually:
```bash
git add .
git commit -m "Update description"
git push origin main
```

## 📞 Support

- **Render Status**: https://status.render.com
- **Render Docs**: https://render.com/docs
- **Our Docs**: See `/docs` folder