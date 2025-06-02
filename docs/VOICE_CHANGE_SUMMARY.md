# Voice Change Summary - Puck to Callirrhoe

## Changes Made (5/29/2025, 5:17 PM)

### 1. Updated Voice Enum
**File:** `src/services/gemini-tts.service.ts`
- Added `CALLIRRHOE = 'Callirrhoe'` to the GeminiVoice enum

### 2. Updated Chat Routes
**File:** `src/routes/chat.routes.ts`
- Changed TTS service initialization from `GeminiVoice.PUCK` to `GeminiVoice.CALLIRRHOE`

### 3. Updated Test Scripts
**File:** `scripts/test-gemini-tts.ts`
- Changed test voice from `GeminiVoice.PUCK` to `GeminiVoice.CALLIRRHOE`

**File:** `scripts/test-tts-simple.ts`
- Updated documentation reference from "Puck voice" to "Callirrhoe voice"

### 4. Updated Web Interface
**File:** `public/index.html`
- Replaced all occurrences of "Puck" with "Callirrhoe" (7 replacements)
- This includes comments, console logs, and the voice parameter sent to the API

## Testing Confirmation

The TTS service was tested and successfully generated audio with the Callirrhoe voice:
```
📢 Test 2:
   Voice: Callirrhoe
   Text: "I can speak in different voices. This one might sound different!"
   ✅ Success! Audio saved to: output/test_callirrhoe_1748553456582.wav
   Size: 199.31 KB
```

## Browser Cache Note

If the web interface still shows "Puck" in the browser console, it's due to browser caching. To see the updated version:
- Perform a hard refresh (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)
- Or open the page in an incognito/private window
- Or clear the browser cache

## Voice Characteristics

Callirrhoe is one of the available Gemini TTS voices, offering a different tonal quality compared to Puck. The voice selection affects:
- The tone and personality of the AI assistant
- The naturalness of the speech synthesis
- The overall user experience during voice interactions

All voice agent interactions will now use the Callirrhoe voice for text-to-speech conversion.