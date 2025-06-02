/**
 * Test script for Gemini TTS integration
 * Verifies that the Gemini 2.5 Pro TTS is working correctly
 */

import { GeminiTTSService, GeminiVoice } from '../src/services/gemini-tts.service';
import { writeFileSync } from 'fs';
import { join } from 'path';

async function testGeminiTTS() {
  console.log('🎤 Testing Gemini 2.5 Pro TTS...\n');
  
  try {
    // Create TTS service instance
    const ttsService = new GeminiTTSService();
    
    // Test phrases with different voices
    const testCases = [
      {
        text: 'Hello! This is a test of the Gemini text-to-speech system. How does my voice sound?',
        voice: GeminiVoice.ZEPHYR,
      },
      {
        text: 'I can speak in different voices. This one might sound different!',
        voice: GeminiVoice.CALLIRRHOE,
      },
      {
        text: 'Thank you for calling. Have a wonderful day!',
        voice: GeminiVoice.AOEDE,
      },
    ];
    
    console.log('Available voices:', GeminiTTSService.getAvailableVoices().join(', '));
    console.log('\nGenerating speech samples...\n');
    
    for (let i = 0; i < testCases.length; i++) {
      const { text, voice } = testCases[i];
      console.log(`📢 Test ${i + 1}:`);
      console.log(`   Voice: ${voice}`);
      console.log(`   Text: "${text}"`);
      
      try {
        // Generate audio
        const audioBuffer = await ttsService.textToSpeech(text, voice);
        
        // Save to file
        const filename = `test_${voice.toLowerCase()}_${Date.now()}.wav`;
        const filepath = join(__dirname, '..', 'output', filename);
        
        // Create output directory if it doesn't exist
        const outputDir = join(__dirname, '..', 'output');
        if (!require('fs').existsSync(outputDir)) {
          require('fs').mkdirSync(outputDir);
        }
        
        writeFileSync(filepath, audioBuffer);
        
        console.log(`   ✅ Success! Audio saved to: output/${filename}`);
        console.log(`   Size: ${(audioBuffer.length / 1024).toFixed(2)} KB\n`);
      } catch (error) {
        console.error(`   ❌ Failed: ${error}\n`);
      }
    }
    
    console.log('🎉 Gemini TTS test completed!');
    console.log('\nNote: Check the "output" folder for the generated WAV files.');
    console.log('You can play them with any audio player to hear the different voices.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testGeminiTTS();