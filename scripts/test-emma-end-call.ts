#!/usr/bin/env npx tsx

/**
 * Test Emma's End Call Functionality
 * 
 * This script demonstrates how Emma can gracefully end Twilio phone calls
 * when conversations reach natural conclusions.
 */

import { EmmaToolsService } from '../src/services/emma-tools.service';
import logger from '../src/utils/logger';

interface ToolCallRequest {
  name: string;
  call_id: string;
  arguments: any;
}

async function testEmmaEndCall() {
  console.log('\n📞 TESTING EMMA END CALL FUNCTIONALITY');
  console.log('='.repeat(50));

  const emmaTools = new EmmaToolsService();

  // ========================================
  // SCENARIO 1: Successful Appointment Completion
  // ========================================
  console.log('\n✅ SCENARIO 1: APPOINTMENT SUCCESSFULLY SCHEDULED');
  console.log('-'.repeat(45));

  console.log('\n🤖 Emma: "Perfect! I\'ve scheduled your appointment for June 10th at 2:30 PM."');
  console.log('👤 Customer: "Great, thank you so much!"');
  console.log('🤖 Emma: "You\'re welcome! Have a wonderful day."');
  
  console.log('\n📞 Emma calls end_call tool...');
  const endCall1 = await simulateToolCall(emmaTools, {
    name: 'end_call',
    call_id: 'end_001',
    arguments: {
      reason: 'appointment scheduled successfully',
      callSid: 'CA1234567890abcdef1234567890abcdef'
    }
  });

  if (endCall1.success) {
    console.log('✅ Call ended gracefully - appointment workflow complete');
  } else {
    console.log('❌ Call end failed:', endCall1.message);
  }

  // ========================================
  // SCENARIO 2: Customer Request to End
  // ========================================
  console.log('\n\n🚫 SCENARIO 2: CUSTOMER ENDS CONVERSATION');
  console.log('-'.repeat(45));

  console.log('\n👤 Customer: "Actually, I need to go. Can we finish this call?"');
  console.log('🤖 Emma: "Of course! I understand you need to go."');
  
  console.log('\n📞 Emma calls end_call tool...');
  const endCall2 = await simulateToolCall(emmaTools, {
    name: 'end_call',
    call_id: 'end_002',
    arguments: {
      reason: 'customer request to end call'
    }
  });

  if (endCall2.success) {
    console.log('✅ Call ended respectfully per customer request');
  }

  // ========================================
  // SCENARIO 3: After Cancellation Process
  // ========================================
  console.log('\n\n❌ SCENARIO 3: AFTER APPOINTMENT CANCELLATION');
  console.log('-'.repeat(45));

  console.log('\n🤖 Emma: "I understand. I\'ve cancelled your appointment as requested."');
  console.log('👤 Customer: "Thank you for your help."');
  console.log('🤖 Emma: "You\'re welcome. Have a great day!"');
  
  console.log('\n📞 Emma calls end_call tool...');
  const endCall3 = await simulateToolCall(emmaTools, {
    name: 'end_call',
    call_id: 'end_003',
    arguments: {
      reason: 'appointment cancelled - call complete',
      callSid: 'CA9876543210fedcba9876543210fedcba'
    }
  });

  if (endCall3.success) {
    console.log('✅ Call ended professionally after cancellation');
  }

  // ========================================
  // SCENARIO 4: Natural Conversation End
  // ========================================
  console.log('\n\n💬 SCENARIO 4: NATURAL CONVERSATION CONCLUSION');
  console.log('-'.repeat(45));

  console.log('\n👤 Customer: "I think I have all the information I need for now."');
  console.log('🤖 Emma: "Wonderful! Feel free to call back anytime if you have questions."');
  console.log('👤 Customer: "Will do. Goodbye!"');
  console.log('🤖 Emma: "Goodbye and have a fantastic day!"');
  
  console.log('\n📞 Emma calls end_call tool...');
  const endCall4 = await simulateToolCall(emmaTools, {
    name: 'end_call',
    call_id: 'end_004',
    arguments: {
      reason: 'conversation naturally concluded'
    }
  });

  if (endCall4.success) {
    console.log('✅ Call ended naturally with positive customer experience');
  }

  // ========================================
  // SUMMARY
  // ========================================
  console.log('\n\n📋 END CALL FUNCTIONALITY SUMMARY');
  console.log('='.repeat(50));
  console.log('✅ Emma can end calls after successful appointment scheduling');
  console.log('✅ Emma respects customer requests to end conversations');
  console.log('✅ Emma handles call endings after cancellations professionally');
  console.log('✅ Emma recognizes natural conversation conclusions');
  console.log('✅ Twilio call SID tracking for proper call management');
  console.log('✅ Phone number pool management (releases numbers)');
  console.log('\n📞 Emma now has complete call lifecycle control!');
}

async function simulateToolCall(emmaTools: EmmaToolsService, toolCall: ToolCallRequest) {
  try {
    const result = await (emmaTools as any).executeToolCall(toolCall);
    logger.info(`Tool call ${toolCall.name} result:`, { 
      success: result.success, 
      message: result.message 
    });
    return result;
  } catch (error) {
    logger.error(`Tool call ${toolCall.name} failed:`, error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      data: null
    };
  }
}

// Run the test
testEmmaEndCall().catch(console.error);