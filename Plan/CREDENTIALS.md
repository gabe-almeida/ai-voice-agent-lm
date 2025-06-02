# Voice Agent Credentials & API Keys

## Important: Security Notice
This document contains references to where credentials should be stored. Never commit actual credentials to version control.

## Google Gemini API Configuration

### API Key Storage
The Google Gemini API key is stored in the `.env` file:
```
GOOGLE_GEMINI_API_KEY=AIzaSyAf1GLHp85IBopffY4mrJ0oCWwdg3NXJhU
```

### Model Configuration
- **Model**: gemini-2.0-flash-exp
- **API Endpoint**: https://generativelanguage.googleapis.com/v1beta/

### Usage in Code
```typescript
// Access the API key from environment variables
const geminiApiKey = process.env.GOOGLE_GEMINI_API_KEY;

// Initialize Gemini client
import { GoogleGenerativeAI } from '@google/generative-ai';
const genAI = new GoogleGenerativeAI(geminiApiKey);
```

## Environment File Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. The Gemini API key is already included in the example file

3. Update other credentials as needed:
   - Twilio credentials
   - Database URLs
   - JWT secrets

## Security Best Practices

1. **Never commit `.env` file** - It's included in `.gitignore`
2. **Use environment variables** in production
3. **Rotate keys regularly**
4. **Use secrets management** in production (e.g., AWS Secrets Manager, HashiCorp Vault)
5. **Limit API key permissions** to only what's needed

## Production Deployment

For production, use proper secrets management:

### Kubernetes Secrets
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: voice-agent-secrets
type: Opaque
data:
  google-gemini-api-key: <base64-encoded-key>
```

### Docker Compose
```yaml
services:
  api:
    environment:
      - GOOGLE_GEMINI_API_KEY=${GOOGLE_GEMINI_API_KEY}
```

### Cloud Provider Secrets
- **AWS**: Use AWS Secrets Manager or Parameter Store
- **GCP**: Use Secret Manager
- **Azure**: Use Key Vault

## Credential Checklist

- [x] Google Gemini API Key - Stored in `.env.example`
- [ ] Twilio Account SID
- [ ] Twilio Auth Token
- [ ] Database credentials
- [ ] Redis credentials
- [ ] JWT secrets
- [ ] API key generation secret

## Notes

- The Gemini API key provided is stored in `.env.example` for easy reference
- Always use environment variables to access credentials in code
- For local development, copy `.env.example` to `.env`
- For production, use proper secrets management solutions

---

Last Updated: 5/29/2025, 12:08:37 PM