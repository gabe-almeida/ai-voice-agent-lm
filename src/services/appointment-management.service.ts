import logger from '../utils/logger';

export interface Appointment {
  id: string;
  eventId?: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  scheduledTime: string; // ISO 8601 format
  address: string;
  city: string;
  state: string;
  zipCode: string;
  staffId: string;
  staffName?: string;
  notes?: string;
  status: 'scheduled' | 'confirmed' | 'cancelled' | 'rescheduled' | 'completed';
  cancellationReason?: string;
  rescheduleHistory?: Array<{
    originalTime: string;
    newTime: string;
    reason?: string;
    timestamp: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface CancellationAttempt {
  appointmentId: string;
  customerName: string;
  originalTime: string;
  reason: string;
  rebuttalStage: number;
  outcome: 'retained' | 'rescheduled' | 'cancelled' | 'pending';
  finalReason?: string;
  timestamp: string;
}

export interface AppointmentAvailabilitySlot {
  userId: string;
  staffName: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  available: boolean;
}

export class AppointmentManagementService {
  private appointments: Map<string, Appointment> = new Map();
  private cancellationAttempts: Map<string, CancellationAttempt> = new Map();

  constructor() {
    // Initialize with some mock data for development
    this.initializeMockData();
  }

  private initializeMockData(): void {
    // Add some sample appointments for testing
    const mockAppointments: Appointment[] = [
      {
        id: 'apt-001',
        eventId: 'evt-001',
        customerName: 'John Smith',
        customerPhone: '+1-555-0123',
        scheduledTime: '2025-06-05T14:00:00Z',
        address: '123 Main St',
        city: 'Boston',
        state: 'MA',
        zipCode: '02101',
        staffId: 'staff-001',
        staffName: 'Mike Johnson',
        status: 'scheduled',
        createdAt: '2025-06-04T10:00:00Z',
        updatedAt: '2025-06-04T10:00:00Z'
      },
      {
        id: 'apt-002',
        eventId: 'evt-002',
        customerName: 'Sarah Wilson',
        customerPhone: '+1-555-0456',
        scheduledTime: '2025-06-06T10:00:00Z',
        address: '456 Oak Ave',
        city: 'Worcester',
        state: 'MA',
        zipCode: '01608',
        staffId: 'staff-002',
        staffName: 'David Chen',
        status: 'scheduled',
        createdAt: '2025-06-04T11:00:00Z',
        updatedAt: '2025-06-04T11:00:00Z'
      }
    ];

    mockAppointments.forEach(apt => {
      this.appointments.set(apt.id, apt);
    });
  }

  /**
   * Find an appointment by customer phone number or name
   */
  async findAppointmentByCustomer(customerPhone?: string, customerName?: string): Promise<Appointment[]> {
    try {
      const appointments = Array.from(this.appointments.values());
      
      return appointments.filter(apt => {
        const phoneMatch = customerPhone && apt.customerPhone === customerPhone;
        const nameMatch = customerName && 
          apt.customerName.toLowerCase().includes(customerName.toLowerCase());
        
        return (phoneMatch || nameMatch) && apt.status === 'scheduled';
      });
    } catch (error) {
      logger.error('Error finding appointment:', error);
      throw error;
    }
  }

  /**
   * Get appointment details by ID
   */
  async getAppointmentById(appointmentId: string): Promise<Appointment | null> {
    try {
      return this.appointments.get(appointmentId) || null;
    } catch (error) {
      logger.error('Error getting appointment:', error);
      throw error;
    }
  }

  /**
   * Start a cancellation attempt - track the process
   */
  async startCancellationAttempt(
    appointmentId: string,
    reason: string
  ): Promise<{ attemptId: string; appointment: Appointment | null }> {
    try {
      const appointment = this.appointments.get(appointmentId);
      if (!appointment) {
        throw new Error('Appointment not found');
      }

      const attemptId = `cancel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const attempt: CancellationAttempt = {
        appointmentId,
        customerName: appointment.customerName,
        originalTime: appointment.scheduledTime,
        reason,
        rebuttalStage: 0,
        outcome: 'pending',
        timestamp: new Date().toISOString()
      };

      this.cancellationAttempts.set(attemptId, attempt);
      
      logger.info(`Cancellation attempt started: ${attemptId}`, { appointmentId, reason });
      
      return { attemptId, appointment };
    } catch (error) {
      logger.error('Error starting cancellation attempt:', error);
      throw error;
    }
  }

  /**
   * Update cancellation attempt with rebuttal outcome
   */
  async updateCancellationAttempt(
    attemptId: string,
    stage: number,
    outcome?: 'retained' | 'rescheduled' | 'cancelled'
  ): Promise<CancellationAttempt | null> {
    try {
      const attempt = this.cancellationAttempts.get(attemptId);
      if (!attempt) {
        return null;
      }

      attempt.rebuttalStage = stage;
      if (outcome) {
        attempt.outcome = outcome;
      }

      this.cancellationAttempts.set(attemptId, attempt);
      
      logger.info(`Cancellation attempt updated: ${attemptId}`, { stage, outcome });
      
      return attempt;
    } catch (error) {
      logger.error('Error updating cancellation attempt:', error);
      throw error;
    }
  }

  /**
   * Cancel an appointment
   */
  async cancelAppointment(
    appointmentId: string,
    reason: string,
    attemptId?: string
  ): Promise<{ success: boolean; appointment: Appointment | null }> {
    try {
      const appointment = this.appointments.get(appointmentId);
      if (!appointment) {
        return { success: false, appointment: null };
      }

      appointment.status = 'cancelled';
      appointment.cancellationReason = reason;
      appointment.updatedAt = new Date().toISOString();

      this.appointments.set(appointmentId, appointment);

      // Update cancellation attempt if provided
      if (attemptId) {
        const attempt = this.cancellationAttempts.get(attemptId);
        if (attempt) {
          attempt.outcome = 'cancelled';
          attempt.finalReason = reason;
          this.cancellationAttempts.set(attemptId, attempt);
        }
      }

      logger.info(`Appointment cancelled: ${appointmentId}`, { reason, attemptId });
      
      return { success: true, appointment };
    } catch (error) {
      logger.error('Error cancelling appointment:', error);
      throw error;
    }
  }

  /**
   * Reschedule an appointment
   */
  async rescheduleAppointment(
    appointmentId: string,
    newTime: string,
    newStaffId?: string,
    reason?: string,
    attemptId?: string
  ): Promise<{ success: boolean; appointment: Appointment | null }> {
    try {
      const appointment = this.appointments.get(appointmentId);
      if (!appointment) {
        return { success: false, appointment: null };
      }

      const originalTime = appointment.scheduledTime;
      
      // Add to reschedule history
      if (!appointment.rescheduleHistory) {
        appointment.rescheduleHistory = [];
      }
      
      appointment.rescheduleHistory.push({
        originalTime,
        newTime,
        reason,
        timestamp: new Date().toISOString()
      });

      // Update appointment
      appointment.scheduledTime = newTime;
      if (newStaffId) {
        appointment.staffId = newStaffId;
      }
      appointment.status = 'rescheduled';
      appointment.updatedAt = new Date().toISOString();

      this.appointments.set(appointmentId, appointment);

      // Update cancellation attempt if provided
      if (attemptId) {
        const attempt = this.cancellationAttempts.get(attemptId);
        if (attempt) {
          attempt.outcome = 'rescheduled';
          this.cancellationAttempts.set(attemptId, attempt);
        }
      }

      logger.info(`Appointment rescheduled: ${appointmentId}`, { 
        originalTime, 
        newTime, 
        newStaffId, 
        reason, 
        attemptId 
      });
      
      return { success: true, appointment };
    } catch (error) {
      logger.error('Error rescheduling appointment:', error);
      throw error;
    }
  }

  /**
   * Get available slots for rescheduling (mock implementation)
   */
  async getAvailableSlots(
    _zipCode: string,
    preferredDates?: string[]
  ): Promise<AppointmentAvailabilitySlot[]> {
    try {
      // Mock implementation - in real app this would query actual calendar system
      const slots: AppointmentAvailabilitySlot[] = [];
      const staff = [
        { userId: 'staff-001', staffName: 'Mike Johnson' },
        { userId: 'staff-002', staffName: 'David Chen' },
        { userId: 'staff-003', staffName: 'Sarah Martinez' }
      ];

      const times = ['10:00', '14:00', '18:00'];
      const dates = preferredDates || [
        new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // tomorrow
        new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // day after
        new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]  // 3 days out
      ];

      dates.forEach(date => {
        times.forEach(time => {
          staff.forEach(s => {
            // Randomly make some slots unavailable for realism
            const available = Math.random() > 0.3;
            slots.push({
              userId: s.userId,
              staffName: s.staffName,
              date,
              time,
              available
            });
          });
        });
      });

      return slots.filter(s => s.available);
    } catch (error) {
      logger.error('Error getting available slots:', error);
      throw error;
    }
  }

  /**
   * Retain appointment (customer decided to keep it)
   */
  async retainAppointment(
    appointmentId: string,
    attemptId?: string
  ): Promise<{ success: boolean; appointment: Appointment | null }> {
    try {
      const appointment = this.appointments.get(appointmentId);
      if (!appointment) {
        return { success: false, appointment: null };
      }

      appointment.status = 'confirmed';
      appointment.updatedAt = new Date().toISOString();
      this.appointments.set(appointmentId, appointment);

      // Update cancellation attempt if provided
      if (attemptId) {
        const attempt = this.cancellationAttempts.get(attemptId);
        if (attempt) {
          attempt.outcome = 'retained';
          this.cancellationAttempts.set(attemptId, attempt);
        }
      }

      logger.info(`Appointment retained: ${appointmentId}`, { attemptId });
      
      return { success: true, appointment };
    } catch (error) {
      logger.error('Error retaining appointment:', error);
      throw error;
    }
  }

  /**
   * Get cancellation statistics for reporting
   */
  async getCancellationStats(): Promise<{
    totalAttempts: number;
    retained: number;
    rescheduled: number;
    cancelled: number;
    retentionRate: number;
  }> {
    try {
      const attempts = Array.from(this.cancellationAttempts.values());
      const totalAttempts = attempts.length;
      const retained = attempts.filter(a => a.outcome === 'retained').length;
      const rescheduled = attempts.filter(a => a.outcome === 'rescheduled').length;
      const cancelled = attempts.filter(a => a.outcome === 'cancelled').length;
      const retentionRate = totalAttempts > 0 ? ((retained + rescheduled) / totalAttempts) * 100 : 0;

      return {
        totalAttempts,
        retained,
        rescheduled,
        cancelled,
        retentionRate
      };
    } catch (error) {
      logger.error('Error getting cancellation stats:', error);
      throw error;
    }
  }
}

export const appointmentManagementService = new AppointmentManagementService();