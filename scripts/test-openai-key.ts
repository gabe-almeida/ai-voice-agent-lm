/**
 * Test OpenAI API key validity
 */

import OpenAI from 'openai';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testAPIKey() {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY not found in environment variables');
    return;
  }

  console.log('🔑 Testing OpenAI API key...');
  console.log(`Key format: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`);
  
  const openai = new OpenAI({
    apiKey: apiKey,
  });

  try {
    // Test with a simple completion
    console.log('\n📝 Testing regular chat completion...');
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'user', content: 'Say "API key is valid"' }
      ],
      max_tokens: 10
    });

    console.log('✅ API key is valid!');
    console.log('Response:', completion.choices[0].message.content);

    // Test if we can list models
    console.log('\n📋 Listing available models...');
    const models = await openai.models.list();
    
    console.log('\nAvailable models:');
    const realtimeModels: string[] = [];
    const audioModels: string[] = [];
    
    for await (const model of models) {
      if (model.id.includes('realtime')) {
        realtimeModels.push(model.id);
      }
      if (model.id.includes('audio') || model.id.includes('tts')) {
        audioModels.push(model.id);
      }
    }

    if (realtimeModels.length > 0) {
      console.log('\n🎤 Realtime models found:');
      realtimeModels.forEach(m => console.log(`  - ${m}`));
    } else {
      console.log('\n⚠️  No realtime models found. The Realtime API might not be available for this account.');
    }

    if (audioModels.length > 0) {
      console.log('\n🔊 Audio/TTS models found:');
      audioModels.forEach(m => console.log(`  - ${m}`));
    }

    // Try the audio endpoint
    console.log('\n🎵 Testing audio generation...');
    try {
      await openai.audio.speech.create({
        model: 'tts-1',
        voice: 'alloy',
        input: 'Hello, this is a test.',
      });

      console.log('✅ Audio generation works!');
      
      // Check if gpt-4o-audio-preview is available
      try {
        console.log('\n🎙️ Testing gpt-4o-audio-preview...');
        const audioCompletion = await openai.chat.completions.create({
          model: 'gpt-4o-audio-preview',
          modalities: ['text', 'audio'],
          audio: { voice: 'alloy', format: 'wav' },
          messages: [
            {
              role: 'user',
              content: 'Say hello'
            }
          ],
        });
        
        if (audioCompletion.choices[0].message.audio) {
          console.log('✅ gpt-4o-audio-preview is available!');
        }
      } catch (error: any) {
        console.log('❌ gpt-4o-audio-preview not available:', error.message);
      }
      
    } catch (error: any) {
      console.log('❌ Audio generation failed:', error.message);
    }

  } catch (error: any) {
    console.error('\n❌ API key test failed:', error.message);
    
    if (error.message.includes('Incorrect API key')) {
      console.log('\n🔍 The API key appears to be invalid or expired.');
      console.log('Please check: https://platform.openai.com/api-keys');
    } else if (error.status === 429) {
      console.log('\n⏳ Rate limit exceeded. The API key is valid but you\'ve hit usage limits.');
    } else if (error.status === 403) {
      console.log('\n🚫 Access denied. The API key might not have permissions for this operation.');
    }
  }
}

// Run the test
testAPIKey().catch(console.error);