import logger from '../utils/logger';
import { appointmentManagementService } from './appointment-management.service';

export interface CancellationToolsResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

export interface FindAppointmentParams {
  customerName: string;
  phoneNumber?: string;
  appointmentDate?: string; // YYYY-MM-DD format
  zipCode?: string;
  appointmentId?: string;
}

export interface StartCancellationParams {
  appointmentId: string;
  reason: string;
  customerInitiated: boolean;
}

export interface UpdateCancellationParams {
  attemptId: string;
  rebuttalStage: number;
  rebuttalType: 'schedule_conflict' | 'financial_concern' | 'changed_mind' | 'spouse_objection' | 'timing_concern';
  customerResponse: string;
  outcome?: 'retained' | 'rescheduled' | 'cancelled';
}

export interface RescheduleAppointmentParams {
  appointmentId: string;
  newDate: string; // YYYY-MM-DD
  newTime: string; // HH:mm
  newStaffId?: string;
  reason?: string;
  attemptId?: string;
}

export interface CancelAppointmentParams {
  appointmentId: string;
  reason: string;
  attemptId?: string;
}

export class AppointmentCancellationToolsService {
  
  /**
   * Find customer appointment(s) by name, phone, or ID
   */
  async findCustomerAppointment(params: FindAppointmentParams): Promise<CancellationToolsResponse> {
    try {
      logger.info('Finding customer appointment', params);

      if (params.appointmentId) {
        const appointment = await appointmentManagementService.getAppointmentById(params.appointmentId);
        if (appointment) {
          return {
            success: true,
            message: 'Appointment found',
            data: { appointments: [appointment] }
          };
        } else {
          return {
            success: false,
            message: 'Appointment not found with the provided ID',
            data: { appointments: [] }
          };
        }
      }

      const appointments = await appointmentManagementService.findAppointmentByCustomer(
        params.phoneNumber,
        params.customerName
      );

      if (appointments.length === 0) {
        return {
          success: false,
          message: 'No scheduled appointments found for this customer',
          data: { appointments: [] }
        };
      }

      const appointmentDetails = appointments.map(apt => ({
        id: apt.id,
        customerName: apt.customerName,
        scheduledTime: apt.scheduledTime,
        address: apt.address,
        city: apt.city,
        zipCode: apt.zipCode,
        staffName: apt.staffName,
        status: apt.status,
        formattedTime: new Date(apt.scheduledTime).toLocaleString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          timeZoneName: 'short'
        })
      }));

      return {
        success: true,
        message: `Found ${appointments.length} appointment(s) for this customer`,
        data: { appointments: appointmentDetails }
      };

    } catch (error) {
      logger.error('Error finding customer appointment:', error);
      return {
        success: false,
        message: 'Error occurred while searching for appointments',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Start tracking a cancellation attempt
   */
  async startCancellationAttempt(params: StartCancellationParams): Promise<CancellationToolsResponse> {
    try {
      logger.info('Starting cancellation attempt', params);

      const result = await appointmentManagementService.startCancellationAttempt(
        params.appointmentId,
        params.reason
      );

      const appointment = result.appointment;
      if (!appointment) {
        return {
          success: false,
          message: 'Appointment not found',
        };
      }

      return {
        success: true,
        message: 'Cancellation attempt started - ready for retention efforts',
        data: {
          attemptId: result.attemptId,
          appointment: {
            id: appointment.id,
            customerName: appointment.customerName,
            scheduledTime: appointment.scheduledTime,
            formattedTime: new Date(appointment.scheduledTime).toLocaleString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit'
            }),
            staffName: appointment.staffName,
            address: `${appointment.address}, ${appointment.city}, ${appointment.state}`
          },
          suggestedRebuttals: this.getSuggestedRebuttals(params.reason)
        }
      };

    } catch (error) {
      logger.error('Error starting cancellation attempt:', error);
      return {
        success: false,
        message: 'Error occurred while starting cancellation tracking',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Update cancellation attempt with rebuttal information
   */
  async updateCancellationAttempt(params: UpdateCancellationParams): Promise<CancellationToolsResponse> {
    try {
      logger.info('Updating cancellation attempt', params);

      const attempt = await appointmentManagementService.updateCancellationAttempt(
        params.attemptId,
        params.rebuttalStage,
        params.outcome
      );

      if (!attempt) {
        return {
          success: false,
          message: 'Cancellation attempt not found'
        };
      }

      const nextSuggestions = this.getNextRebuttalSuggestions(
        params.rebuttalType,
        params.rebuttalStage,
        params.customerResponse
      );

      return {
        success: true,
        message: `Cancellation attempt updated - Stage ${params.rebuttalStage} completed`,
        data: {
          attempt: {
            id: params.attemptId,
            stage: attempt.rebuttalStage,
            outcome: attempt.outcome
          },
          nextSuggestions
        }
      };

    } catch (error) {
      logger.error('Error updating cancellation attempt:', error);
      return {
        success: false,
        message: 'Error occurred while updating cancellation attempt',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Reschedule an appointment
   */
  async rescheduleAppointment(params: RescheduleAppointmentParams): Promise<CancellationToolsResponse> {
    try {
      logger.info('Rescheduling appointment', params);

      // Convert date and time to ISO format
      const newDateTime = new Date(`${params.newDate}T${params.newTime}:00.000Z`);
      const isoDateTime = newDateTime.toISOString();

      const result = await appointmentManagementService.rescheduleAppointment(
        params.appointmentId,
        isoDateTime,
        params.newStaffId,
        params.reason,
        params.attemptId
      );

      if (!result.success || !result.appointment) {
        return {
          success: false,
          message: 'Failed to reschedule appointment - appointment may not exist'
        };
      }

      const appointment = result.appointment;
      
      return {
        success: true,
        message: 'Appointment successfully rescheduled',
        data: {
          appointment: {
            id: appointment.id,
            customerName: appointment.customerName,
            newTime: appointment.scheduledTime,
            formattedTime: new Date(appointment.scheduledTime).toLocaleString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit'
            }),
            address: `${appointment.address}, ${appointment.city}, ${appointment.state}`,
            staffName: appointment.staffName,
            status: appointment.status
          },
          retentionSuccess: true
        }
      };

    } catch (error) {
      logger.error('Error rescheduling appointment:', error);
      return {
        success: false,
        message: 'Error occurred while rescheduling appointment',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Cancel an appointment (final step if retention fails)
   */
  async cancelAppointment(params: CancelAppointmentParams): Promise<CancellationToolsResponse> {
    try {
      logger.info('Cancelling appointment', params);

      const result = await appointmentManagementService.cancelAppointment(
        params.appointmentId,
        params.reason,
        params.attemptId
      );

      if (!result.success || !result.appointment) {
        return {
          success: false,
          message: 'Failed to cancel appointment - appointment may not exist'
        };
      }

      const appointment = result.appointment;

      return {
        success: true,
        message: 'Appointment successfully cancelled',
        data: {
          appointment: {
            id: appointment.id,
            customerName: appointment.customerName,
            originalTime: appointment.scheduledTime,
            status: appointment.status,
            cancellationReason: appointment.cancellationReason
          },
          followUpMessage: "We'll keep your information on file and you're always welcome to call us when you're ready to explore your bathroom remodel."
        }
      };

    } catch (error) {
      logger.error('Error cancelling appointment:', error);
      return {
        success: false,
        message: 'Error occurred while cancelling appointment',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Retain appointment (customer decided to keep it)
   */
  async retainAppointment(appointmentId: string, attemptId?: string): Promise<CancellationToolsResponse> {
    try {
      logger.info('Retaining appointment', { appointmentId, attemptId });

      const result = await appointmentManagementService.retainAppointment(appointmentId, attemptId);

      if (!result.success || !result.appointment) {
        return {
          success: false,
          message: 'Failed to retain appointment - appointment may not exist'
        };
      }

      const appointment = result.appointment;

      return {
        success: true,
        message: 'Appointment successfully retained',
        data: {
          appointment: {
            id: appointment.id,
            customerName: appointment.customerName,
            scheduledTime: appointment.scheduledTime,
            formattedTime: new Date(appointment.scheduledTime).toLocaleString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit'
            }),
            status: appointment.status
          },
          retentionSuccess: true
        }
      };

    } catch (error) {
      logger.error('Error retaining appointment:', error);
      return {
        success: false,
        message: 'Error occurred while retaining appointment',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get available slots for rescheduling
   */
  async getAvailableSlotsForReschedule(zipCode: string, preferredDates?: string[]): Promise<CancellationToolsResponse> {
    try {
      logger.info('Getting available slots for reschedule', { zipCode, preferredDates });

      const slots = await appointmentManagementService.getAvailableSlots(zipCode, preferredDates);

      if (slots.length === 0) {
        return {
          success: false,
          message: 'No available slots found for the requested dates',
          data: { slots: [] }
        };
      }

      // Group slots by date for easier presentation
      const slotsByDate = slots.reduce((acc, slot) => {
        if (!acc[slot.date]) {
          acc[slot.date] = [];
        }
        acc[slot.date].push({
          time: slot.time,
          staffName: slot.staffName,
          staffId: slot.userId,
          formattedTime: new Date(`${slot.date}T${slot.time}:00`).toLocaleString('en-US', {
            hour: 'numeric',
            minute: '2-digit'
          })
        });
        return acc;
      }, {} as Record<string, any[]>);

      return {
        success: true,
        message: `Found ${slots.length} available slots`,
        data: { 
          slotsByDate,
          totalSlots: slots.length,
          availableDates: Object.keys(slotsByDate)
        }
      };

    } catch (error) {
      logger.error('Error getting available slots:', error);
      return {
        success: false,
        message: 'Error occurred while checking availability',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get cancellation statistics
   */
  async getCancellationStats(): Promise<CancellationToolsResponse> {
    try {
      const stats = await appointmentManagementService.getCancellationStats();
      
      return {
        success: true,
        message: 'Cancellation statistics retrieved',
        data: stats
      };

    } catch (error) {
      logger.error('Error getting cancellation stats:', error);
      return {
        success: false,
        message: 'Error occurred while retrieving statistics',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private getSuggestedRebuttals(reason: string): string[] {
    const lowerReason = reason.toLowerCase();
    
    if (lowerReason.includes('schedule') || lowerReason.includes('busy') || lowerReason.includes('time')) {
      return [
        "I completely understand how busy schedules can be. Rather than canceling completely, would you be open to rescheduling?",
        "What if we could find a time that works better for you? I have some flexibility in our schedule.",
        "I'd hate for you to lose your place in our schedule. Let me check what other times I have available."
      ];
    }
    
    if (lowerReason.includes('money') || lowerReason.includes('cost') || lowerReason.includes('afford') || lowerReason.includes('expensive')) {
      return [
        "I totally understand - this is a significant decision. That's exactly why our free consultation is so valuable.",
        "Our Design Consultant specializes in working with different budgets and can show you various options.",
        "We have financing options that can make projects very manageable. Would you like to explore those?"
      ];
    }
    
    if (lowerReason.includes('mind') || lowerReason.includes('think') || lowerReason.includes('sure') || lowerReason.includes('ready')) {
      return [
        "It's completely normal to have second thoughts about a big project like this.",
        "Many of our happiest customers initially had some hesitation too.",
        "The consultation is educational - you'll learn about possibilities you might not have considered."
      ];
    }
    
    if (lowerReason.includes('spouse') || lowerReason.includes('wife') || lowerReason.includes('husband') || lowerReason.includes('partner')) {
      return [
        "It's important that both decision-makers are on the same page.",
        "Having both of you at the consultation often helps address concerns directly.",
        "Many times, the hesitant partner becomes the most excited once they see the possibilities!"
      ];
    }
    
    // Default rebuttals
    return [
      "I understand your concerns. Let me see what options we have to make this work better for you.",
      "Before we cancel, would you be open to exploring some alternatives?",
      "What if we could address your specific concerns? I'd love to help find a solution."
    ];
  }

  private getNextRebuttalSuggestions(
    _rebuttalType: string,
    stage: number,
    customerResponse: string
  ): string[] {
    if (stage >= 3) {
      return [
        "I completely respect your decision. Before I process the cancellation, would you be open to me placing a tentative hold on an appointment for a week or two out?",
        "I understand. Just so you know, we'll be happy to help you in the future whenever you're ready.",
        "Would you like me to have our Design Consultant give you a quick call to address any specific concerns?"
      ];
    }

    if (customerResponse.toLowerCase().includes('maybe') || customerResponse.toLowerCase().includes('think')) {
      return [
        "I appreciate you being open to considering options. What would make this feel right for you?",
        "What if I could address your main concern directly? What's the biggest thing holding you back?",
        "Would it help if I moved this appointment out a bit further to give you more time to think?"
      ];
    }

    return [
      "I hear what you're saying. Let me suggest another approach that might work better.",
      "What if we tried a different solution? I really want to find something that works for you.",
      "Before we move to canceling, is there anything else I can do to help make this work?"
    ];
  }
}

export const appointmentCancellationToolsService = new AppointmentCancellationToolsService();