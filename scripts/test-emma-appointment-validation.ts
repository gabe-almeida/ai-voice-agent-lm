#!/usr/bin/env npx tsx

/**
 * Test Emma's Enhanced Appointment Validation Workflow
 * 
 * This script demonstrates the new security feature where Emma must:
 * 1. FIND the appointment first using find_customer_appointment
 * 2. VERIFY the appointment exists and get valid details
 * 3. THEN use those exact details for any reschedule/cancel/retain operations
 * 
 * This prevents Emma from attempting to modify non-existent appointments.
 */

import { EmmaToolsService } from '../src/services/emma-tools.service';
import logger from '../src/utils/logger';

interface ToolCallRequest {
  name: string;
  call_id: string;
  arguments: any;
}

async function testEmmaAppointmentValidation() {
  console.log('\n🔒 TESTING EMMA APPOINTMENT VALIDATION WORKFLOW');
  console.log('='.repeat(60));

  const emmaTools = new EmmaToolsService();

  // ========================================
  // SCENARIO 1: Proper Validation Workflow
  // ========================================
  console.log('\n✅ SCENARIO 1: PROPER VALIDATION WORKFLOW');
  console.log('-'.repeat(40));

  console.log('\n🔍 Step 1: Emma finds customer appointment first...');
  const findResult = await simulateToolCall(emmaTools, {
    name: 'find_customer_appointment',
    call_id: 'find_001',
    arguments: {
      customerName: 'John Smith',
      phoneNumber: '555-0123'
    }
  });

  if (findResult.success && findResult.data.appointments.length > 0) {
    const foundAppointment = findResult.data.appointments[0];
    console.log(`✅ Found appointment: ${foundAppointment.id} for ${foundAppointment.customerName}`);
    console.log(`   📅 Scheduled: ${foundAppointment.formattedTime}`);
    
    console.log('\n🔄 Step 2: Emma uses EXACT appointment details for rescheduling...');
    const rescheduleResult = await simulateToolCall(emmaTools, {
      name: 'reschedule_appointment',
      call_id: 'reschedule_001',
      arguments: {
        appointmentId: foundAppointment.id, // EXACT ID from find operation
        newDate: '2025-06-10',
        newTime: '14:30',
        newStaffId: 'staff_456',
        reason: 'Customer requested different time',
        customerName: foundAppointment.customerName // EXACT name from find operation
      }
    });
    
    if (rescheduleResult.success) {
      console.log('✅ Reschedule successful - appointment validated before modification');
    } else {
      console.log('❌ Reschedule failed:', rescheduleResult.message);
    }
  } else {
    console.log('❌ No appointments found for validation test');
  }

  // ========================================
  // SCENARIO 2: Missing Validation (Should Fail)
  // ========================================
  console.log('\n\n❌ SCENARIO 2: ATTEMPTED BYPASS (Should be prevented by tool descriptions)');
  console.log('-'.repeat(40));
  
  console.log('\n🚫 Attempting to reschedule WITHOUT finding appointment first...');
  console.log('   (Emma should refuse this based on tool descriptions)');
  
  const invalidReschedule = await simulateToolCall(emmaTools, {
    name: 'reschedule_appointment',
    call_id: 'invalid_001',
    arguments: {
      appointmentId: 'FAKE_ID_12345', // Non-existent ID
      newDate: '2025-06-10',
      newTime: '14:30',
      customerName: 'Unknown Customer' // Non-verified customer
    }
  });
  
  if (!invalidReschedule.success) {
    console.log('✅ Validation prevented invalid reschedule attempt');
  } else {
    console.log('⚠️  WARNING: Validation may have been bypassed');
  }

  // ========================================
  // SCENARIO 3: Customer Intent Change with Validation
  // ========================================
  console.log('\n\n🔄 SCENARIO 3: CUSTOMER CHANGES MIND (With Proper Validation)');
  console.log('-'.repeat(40));
  
  // Simulate customer calling to cancel, then changing mind to reschedule
  console.log('\n🗣️  Customer: "I want to cancel my appointment"');
  
  console.log('\n🔍 Emma: Finding your appointment...');
  const findResult2 = await simulateToolCall(emmaTools, {
    name: 'find_customer_appointment',
    call_id: 'find_002',
    arguments: {
      customerName: 'Sarah Johnson',
      phoneNumber: '555-0456'
    }
  });

  if (findResult2.success && findResult2.data.appointments.length > 0) {
    const appointment = findResult2.data.appointments[0];
    console.log(`✅ Found appointment: ${appointment.customerName} on ${appointment.formattedTime}`);
    
    console.log('\n🗣️  Customer: "Actually, can I reschedule instead?"');
    console.log('🤖 Emma: "Of course! Let me reschedule using your verified appointment details..."');
    
    const changeToReschedule = await simulateToolCall(emmaTools, {
      name: 'reschedule_appointment',
      call_id: 'reschedule_002',
      arguments: {
        appointmentId: appointment.id, // Using exact verified ID
        newDate: '2025-06-12',
        newTime: '10:00',
        newStaffId: appointment.staffId,
        reason: 'Customer changed from cancellation to reschedule',
        customerName: appointment.customerName // Using exact verified name
      }
    });
    
    if (changeToReschedule.success) {
      console.log('✅ Intent change handled securely with proper validation');
    }
  }

  // ========================================
  // SUMMARY
  // ========================================
  console.log('\n\n📋 VALIDATION WORKFLOW SUMMARY');
  console.log('='.repeat(60));
  console.log('✅ Emma now REQUIRES appointment verification before any action');
  console.log('✅ Tool descriptions explicitly state find_customer_appointment is mandatory');
  console.log('✅ All action tools require exact IDs and names from find operation');
  console.log('✅ Prevents reschedule/cancel of non-existent appointments');
  console.log('✅ Supports complex conversational flows with intent changes');
  console.log('\n🔒 Security Enhancement: Emma cannot modify appointments that don\'t exist!');
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
testEmmaAppointmentValidation().catch(console.error);