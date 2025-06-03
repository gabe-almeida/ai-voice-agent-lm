# Troubleshooting Launch Errors

## Error: "Twilio client not initialized - invalid or missing credentials"

This error occurs when the Twilio credentials are not properly configured in your environment variables.

### Solution:

1. **Check your `.env` file**
   Make sure you have created a `.env` file in the project root (not `.env.example`) with your actual credentials:

   ```bash
   # Copy the example file
   cp .env.example .env
   ```

2. **Add your Twilio credentials**
   Edit the `.env` file and add your actual Twilio credentials:

   ```env
   # Twilio Configuration (Required for phone calls)
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_PHONE_NUMBER=+1234567890
   TWILIO_PHONE_NUMBERS=+1234567890,+1234567891  # Comma-separated for pool
   ```

   **Important**: 
   - The `TWILIO_ACCOUNT_SID` must start with "AC"
   - Use your actual credentials from the Twilio Console
   - Don't use the placeholder values from `.env.example`

3. **Get your Twilio credentials**
   - Log in to [Twilio Console](https://console.twilio.com)
   - Find your Account SID and Auth Token on the dashboard
   - Get your phone number(s) from the Phone Numbers section

4. **Running without Twilio (Development/Testing)**
   If you don't have Twilio credentials yet, the app will still run but without phone call capabilities. You'll see this warning:
   ```
   [warn]: Twilio client not initialized - invalid or missing credentials
   ```
   This is normal for development without Twilio.

## Error: "Unable to compile TypeScript: 'KnowledgePromptBuilder' is declared but its value is never read"

This TypeScript error has been fixed. If you still see it:

1. **Pull the latest changes**
   ```bash
   git pull origin main
   ```

2. **Clean and rebuild**
   ```bash
   rm -rf dist/
   npm run build
   ```

3. **Or run in development mode** (which is more forgiving)
   ```bash
   npm run dev
   ```

## Common Launch Issues

### 1. Port Already in Use
If you see "EADDRINUSE" error:
```bash
# Find what's using port 3001
lsof -i :3001

# Kill the process
kill -9 <PID>

# Or change the port in .env
PORT=3002
```

### 2. Missing Dependencies
```bash
# Install all dependencies
npm install

# If you have issues, try cleaning first
rm -rf node_modules package-lock.json
npm install
```

### 3. TypeScript Compilation Errors
For development, use `npm run dev` instead of `npm start`. It's more forgiving and will hot-reload on changes.

### 4. Missing Environment Variables
Check all required variables are set:
```bash
# Required
OPENAI_API_KEY=sk-proj-xxxxx

# Optional but recommended
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_PHONE_NUMBER=+1234567890
```

## Quick Start Commands

```bash
# Development mode (recommended for testing)
npm run dev

# Production build
npm run build
npm start

# Check if everything is configured correctly
npm run predeploy
```

## Still Having Issues?

1. Check the logs for more details
2. Ensure all environment variables are set correctly
3. Try running in development mode first: `npm run dev`
4. Check that you're using Node.js version 18 or higher: `node --version`

The application will run without Twilio credentials, but phone call features won't work. For full functionality, you need valid Twilio credentials.