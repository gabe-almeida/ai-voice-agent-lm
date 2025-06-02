# Gemini TTS Setup Guide

## Overview

The voice agent system now supports Google's Gemini 2.5 Pro TTS Preview for high-quality voice synthesis. However, there are some important considerations:

## Quota Limitations

The Gemini 2.5 Pro TTS Preview model has strict quota limits on the free tier:
- Limited requests per minute
- Limited requests per day
- Limited input tokens per minute

If you encounter `429 Too Many Requests` errors, you've hit these limits.

## Solutions

### 1. Use Browser TTS (Default Fallback)
The system automatically falls back to browser-based text-to-speech when Gemini TTS fails. This ensures your voice agent continues working even when quota is exceeded.

### 2. Upgrade to Paid Tier
To use Gemini TTS without limitations:
1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Navigate to your API key settings
3. Upgrade to a paid plan
4. The same API key will then have higher quotas

### 3. Use Alternative TTS Services
You can modify the code to use other TTS services:
- Amazon Polly
- Azure Speech Services
- ElevenLabs
- Google Cloud Text-to-Speech (different from Gemini)

## Testing the Voice Agent

### With Browser TTS (Always Available)
1. Open http://localhost:3000
2. Click "Start Call"
3. Speak to the agent
4. The agent will respond using browser TTS

### With Gemini TTS (When Quota Available)
The system will automatically use Gemini TTS when available. You'll notice:
- Higher quality, more natural voices
- Better pronunciation and intonation
- Multiple voice options (Zephyr, Puck, Charon, Kore, Fenrir, Aoede)

## Voice Options

When Gemini TTS is available, you can choose from these voices:
- **Zephyr**: Clear, professional voice
- **Puck**: Friendly, conversational voice
- **Charon**: Deep, authoritative voice
- **Kore**: Warm, welcoming voice
- **Fenrir**: Strong, confident voice
- **Aoede**: Gentle, soothing voice

## Monitoring TTS Usage

Check the browser console for messages:
- "TTS error:" indicates Gemini TTS failed (usually quota)
- The system will automatically use browser TTS as fallback
- No interruption to your conversation

## Code Architecture

The TTS system is modular:
- `src/services/gemini-tts.service.ts` - Gemini TTS implementation
- `public/index.html` - Client-side audio handling with fallback
- `src/routes/chat.routes.ts` - TTS API endpoint

This design allows easy swapping of TTS providers without affecting the rest of the system.

---

Last Updated: 5/29/2025, 3:55:14 PM