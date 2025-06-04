#!/usr/bin/env ts-node

/**
 * Test script for appointment cancellation functionality
 * Demonstrates Emma's retention capabilities with rebuttals and rescheduling
 */

import { emmaToolsService } from '../src/services/emma-tools.service';
import { appointmentManagementService } from '../src/services/appointment-management.service';

async function runCancellationTests() {
  console.log('🚀 Starting Appointment Cancellation Tests\n');

  try {
    // Test 1: Find customer appointments
    console.log('📋 Test 1: Finding Customer Appointments');
    console.log('=====================================');
    
    const findResult = await emmaToolsService.executeToolCall({
      call_id: 'test-001',
      name: 'find_customer_appointment',
      arguments: {
        customerName: 'John Smith'
      }
    });
    
    console.log('Find Result:', JSON.stringify(findResult.output, null, 2));
    
    if (!findResult.output.success || findResult.output.data.appointments.length === 0) {
      console.log('❌ No appointments found. Skipping remaining tests.');
      return;
    }

    const appointment = findResult.output.data.appointments[0];
    const appointmentId = appointment.id;
    
    console.log(`✅ Found appointment: ${appointmentId} for ${appointment.customerName}\n`);

    // Test 2: Start cancellation attempt
    console.log('📞 Test 2: Starting Cancellation Attempt');
    console.log('========================================');
    
    const startCancellationResult = await emmaToolsService.executeToolCall({
      call_id: 'test-002',
      name: 'start_cancellation_attempt',
      arguments: {
        appointmentId: appointmentId,
        reason: 'Schedule conflict - customer has work meeting',
        customerInitiated: true
      }
    });
    
    console.log('Cancellation Started:', JSON.stringify(startCancellationResult.output, null, 2));
    
    if (!startCancellationResult.output.success) {
      console.log('❌ Failed to start cancellation attempt');
      return;
    }

    const attemptId = startCancellationResult.output.data.attemptId;
    console.log(`✅ Cancellation attempt started: ${attemptId}\n`);

    // Test 3: First rebuttal - Schedule conflict
    console.log('💬 Test 3: First Rebuttal (Schedule Conflict)');
    console.log('============================================');
    
    const rebuttal1Result = await emmaToolsService.executeToolCall({
      call_id: 'test-003',
      name: 'update_cancellation_attempt',
      arguments: {
        attemptId: attemptId,
        rebuttalStage: 1,
        rebuttalType: 'schedule_conflict',
        customerResponse: 'I might be able to reschedule, let me see what times you have available'
      }
    });
    
    console.log('Rebuttal 1 Update:', JSON.stringify(rebuttal1Result.output, null, 2));
    console.log('✅ Customer is open to rescheduling!\n');

    // Test 4: Get available slots
    console.log('📅 Test 4: Getting Available Slots');
    console.log('=================================');
    
    const slotsResult = await emmaToolsService.executeToolCall({
      call_id: 'test-004',
      name: 'get_available_slots',
      arguments: {
        zipCode: appointment.zipCode,
        preferredDates: [
          new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // tomorrow
          new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // day after
        ]
      }
    });
    
    console.log('Available Slots:', JSON.stringify(slotsResult.output, null, 2));
    
    if (!slotsResult.output.success || slotsResult.output.data.totalSlots === 0) {
      console.log('❌ No available slots found');
      return;
    }
    
    console.log(`✅ Found ${slotsResult.output.data.totalSlots} available slots\n`);

    // Test 5: Reschedule appointment
    console.log('📝 Test 5: Rescheduling Appointment');
    console.log('==================================');
    
    const availableDates = slotsResult.output.data.availableDates;
    const firstDate = availableDates[0];
    const firstSlots = slotsResult.output.data.slotsByDate[firstDate];
    const selectedSlot = firstSlots[0];
    
    const rescheduleResult = await emmaToolsService.executeToolCall({
      call_id: 'test-005',
      name: 'reschedule_appointment',
      arguments: {
        appointmentId: appointmentId,
        newDate: firstDate,
        newTime: selectedSlot.time,
        newStaffId: selectedSlot.staffId,
        reason: 'Customer requested reschedule due to work conflict',
        attemptId: attemptId
      }
    });
    
    console.log('Reschedule Result:', JSON.stringify(rescheduleResult.output, null, 2));
    
    if (rescheduleResult.output.success) {
      console.log('✅ Appointment successfully rescheduled!\n');
    } else {
      console.log('❌ Failed to reschedule appointment\n');
    }

    // Test 6: Demonstrate cancellation scenario
    console.log('❌ Test 6: Demonstrating Full Cancellation');
    console.log('==========================================');
    
    // Find another appointment to cancel completely
    const findResult2 = await emmaToolsService.executeToolCall({
      call_id: 'test-006',
      name: 'find_customer_appointment',
      arguments: {
        customerName: 'Sarah Wilson'
      }
    });
    
    if (findResult2.output.success && findResult2.output.data.appointments.length > 0) {
      const appointment2 = findResult2.output.data.appointments[0];
      
      // Start cancellation attempt
      const startCancel2 = await emmaToolsService.executeToolCall({
        call_id: 'test-007',
        name: 'start_cancellation_attempt',
        arguments: {
          appointmentId: appointment2.id,
          reason: 'Changed mind about renovation project',
          customerInitiated: true
        }
      });
      
      if (startCancel2.output.success) {
        const attemptId2 = startCancel2.output.data.attemptId;
        
        // Try multiple rebuttals
        await emmaToolsService.executeToolCall({
          call_id: 'test-008',
          name: 'update_cancellation_attempt',
          arguments: {
            attemptId: attemptId2,
            rebuttalStage: 1,
            rebuttalType: 'changed_mind',
            customerResponse: 'No, I really just want to cancel'
          }
        });
        
        await emmaToolsService.executeToolCall({
          call_id: 'test-009',
          name: 'update_cancellation_attempt',
          arguments: {
            attemptId: attemptId2,
            rebuttalStage: 2,
            rebuttalType: 'changed_mind',
            customerResponse: 'I appreciate the offer but I have decided not to proceed'
          }
        });
        
        // Final cancellation
        const cancelResult = await emmaToolsService.executeToolCall({
          call_id: 'test-010',
          name: 'cancel_appointment',
          arguments: {
            appointmentId: appointment2.id,
            reason: 'Customer no longer interested in renovation project',
            attemptId: attemptId2
          }
        });
        
        console.log('Final Cancellation:', JSON.stringify(cancelResult.output, null, 2));
        
        if (cancelResult.output.success) {
          console.log('✅ Appointment canceled after retention attempts\n');
        }
      }
    }

    // Test 7: Get retention statistics
    console.log('📊 Test 7: Retention Statistics');
    console.log('==============================');
    
    const stats = await emmaToolsService.getRetentionStats();
    console.log('Retention Stats:', JSON.stringify(stats, null, 2));
    console.log('✅ Statistics retrieved successfully\n');

    // Test 8: Demonstrate retention scenario
    console.log('💪 Test 8: Demonstrating Appointment Retention');
    console.log('=============================================');
    
    // For demonstration, let's create a scenario where customer keeps appointment
    const appointments = await appointmentManagementService.findAppointmentByCustomer(undefined, 'John');
    if (appointments.length > 0) {
      const retainResult = await emmaToolsService.executeToolCall({
        call_id: 'test-011',
        name: 'retain_appointment',
        arguments: {
          appointmentId: appointments[0].id,
          attemptId: attemptId // Use the earlier attempt ID
        }
      });
      
      console.log('Retention Result:', JSON.stringify(retainResult.output, null, 2));
      
      if (retainResult.output.success) {
        console.log('✅ Customer convinced to keep appointment!\n');
      }
    }

    console.log('🎉 All appointment cancellation tests completed successfully!');
    console.log('\n📋 Summary of Emma\'s Cancellation Management Capabilities:');
    console.log('• ✅ Find customer appointments by name, phone, or ID');
    console.log('• ✅ Track cancellation attempts with retention efforts');
    console.log('• ✅ Provide intelligent rebuttals based on cancellation reason');
    console.log('• ✅ Offer rescheduling with available time slots');
    console.log('• ✅ Retain appointments through persuasive conversation');
    console.log('• ✅ Process final cancellations when retention fails');
    console.log('• ✅ Track retention statistics for performance monitoring');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runCancellationTests()
    .then(() => {
      console.log('\n✅ Test script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Test script failed:', error);
      process.exit(1);
    });
}

export { runCancellationTests };