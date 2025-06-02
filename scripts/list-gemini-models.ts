/**
 * List available Gemini models
 */

import { GoogleGenAI } from '@google/genai';
import { config } from '../src/config';

async function listModels() {
  const ai = new GoogleGenAI({
    apiKey: config.gemini.apiKey,
  });

  console.log('🔍 Fetching available Gemini models...\n');

  try {
    // List all available models
    const models = await ai.models.list();
    
    console.log('Available Models:');
    console.log('═══════════════════════════════════════\n');
    
    const ttsModels: any[] = [];
    const textModels: any[] = [];
    const otherModels: any[] = [];
    
    for await (const model of models) {
      // Check if it's a TTS model
      if (model.name?.toLowerCase().includes('tts') ||
          model.displayName?.toLowerCase().includes('tts') ||
          model.description?.toLowerCase().includes('speech') ||
          model.description?.toLowerCase().includes('audio')) {
        ttsModels.push(model);
      } else if ((model as any).supportedGenerationMethods?.includes('generateContent')) {
        textModels.push(model);
      } else {
        otherModels.push(model);
      }
    }
    
    // Display TTS models
    if (ttsModels.length > 0) {
      console.log('🎤 TTS/Audio Models:');
      ttsModels.forEach(model => {
        console.log(`\n  Model: ${model.name}`);
        console.log(`  Display Name: ${model.displayName || 'N/A'}`);
        console.log(`  Description: ${model.description || 'N/A'}`);
        console.log(`  Supported Methods: ${(model as any).supportedGenerationMethods?.join(', ') || 'N/A'}`);
      });
    }
    
    // Display text generation models
    console.log('\n\n📝 Text Generation Models:');
    textModels.forEach(model => {
      console.log(`\n  Model: ${model.name}`);
      console.log(`  Display Name: ${model.displayName || 'N/A'}`);
      console.log(`  Version: ${model.version || 'N/A'}`);
      console.log(`  Supported Methods: ${(model as any).supportedGenerationMethods?.join(', ') || 'N/A'}`);
    });
    
    // Check for specific models
    console.log('\n\n🔎 Checking for specific models:');
    const modelsToCheck = [
      'gemini-2.5-pro-preview-tts',
      'gemini-2.5-flash-tts-preview',
      'gemini-2.0-flash-exp',
      'gemini-1.5-flash',
      'gemini-1.5-pro'
    ];
    
    for (const modelName of modelsToCheck) {
      const exists = [...ttsModels, ...textModels, ...otherModels].some(
        m => m.name?.includes(modelName)
      );
      console.log(`  ${modelName}: ${exists ? '✅ Available' : '❌ Not found'}`);
    }
    
  } catch (error) {
    console.error('Error listing models:', error);
  }
}

// Run the check
listModels().catch(console.error);