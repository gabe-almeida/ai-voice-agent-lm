import { Router, Request, Response } from 'express';
import { appointmentCancellationToolsService } from '../services/appointment-cancellation-tools.service';
import logger from '../utils/logger';

const router = Router();

/**
 * Find customer appointment(s)
 * POST /api/appointments/find
 */
router.post('/find', async (req: Request, res: Response): Promise<void> => {
  try {
    const { customerName, phoneNumber, appointmentId } = req.body;
    
    if (!customerName && !phoneNumber && !appointmentId) {
      res.status(400).json({
        success: false,
        message: 'At least one of customerName, phoneNumber, or appointmentId is required'
      });
      return;
    }

    const result = await appointmentCancellationToolsService.findCustomerAppointment({
      customerName,
      phoneNumber,
      appointmentId
    });

    res.json(result);
  } catch (error) {
    logger.error('Error in find appointment route:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Start cancellation attempt
 * POST /api/appointments/cancellation/start
 */
router.post('/cancellation/start', async (req: Request, res: Response): Promise<void> => {
  try {
    const { appointmentId, reason, customerInitiated = true } = req.body;
    
    if (!appointmentId || !reason) {
      res.status(400).json({
        success: false,
        message: 'appointmentId and reason are required'
      });
      return;
    }

    const result = await appointmentCancellationToolsService.startCancellationAttempt({
      appointmentId,
      reason,
      customerInitiated
    });

    res.json(result);
  } catch (error) {
    logger.error('Error in start cancellation route:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Update cancellation attempt
 * POST /api/appointments/cancellation/update
 */
router.post('/cancellation/update', async (req: Request, res: Response): Promise<void> => {
  try {
    const { attemptId, rebuttalStage, rebuttalType, customerResponse, outcome } = req.body;
    
    if (!attemptId || rebuttalStage === undefined || !rebuttalType || !customerResponse) {
      res.status(400).json({
        success: false,
        message: 'attemptId, rebuttalStage, rebuttalType, and customerResponse are required'
      });
      return;
    }

    const validRebuttalTypes = ['schedule_conflict', 'financial_concern', 'changed_mind', 'spouse_objection', 'timing_concern'];
    if (!validRebuttalTypes.includes(rebuttalType)) {
      res.status(400).json({
        success: false,
        message: `rebuttalType must be one of: ${validRebuttalTypes.join(', ')}`
      });
      return;
    }

    const result = await appointmentCancellationToolsService.updateCancellationAttempt({
      attemptId,
      rebuttalStage,
      rebuttalType,
      customerResponse,
      outcome
    });

    res.json(result);
  } catch (error) {
    logger.error('Error in update cancellation route:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Reschedule appointment
 * POST /api/appointments/reschedule
 */
router.post('/reschedule', async (req: Request, res: Response): Promise<void> => {
  try {
    const { appointmentId, newDate, newTime, newStaffId, reason, attemptId } = req.body;
    
    if (!appointmentId || !newDate || !newTime) {
      res.status(400).json({
        success: false,
        message: 'appointmentId, newDate, and newTime are required'
      });
      return;
    }

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
      res.status(400).json({
        success: false,
        message: 'newDate must be in YYYY-MM-DD format'
      });
      return;
    }

    // Validate time format (HH:mm)
    if (!/^\d{2}:\d{2}$/.test(newTime)) {
      res.status(400).json({
        success: false,
        message: 'newTime must be in HH:mm format'
      });
      return;
    }

    const result = await appointmentCancellationToolsService.rescheduleAppointment({
      appointmentId,
      newDate,
      newTime,
      newStaffId,
      reason,
      attemptId
    });

    res.json(result);
  } catch (error) {
    logger.error('Error in reschedule appointment route:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Cancel appointment
 * POST /api/appointments/cancel
 */
router.post('/cancel', async (req: Request, res: Response): Promise<void> => {
  try {
    const { appointmentId, reason, attemptId } = req.body;
    
    if (!appointmentId || !reason) {
      res.status(400).json({
        success: false,
        message: 'appointmentId and reason are required'
      });
      return;
    }

    const result = await appointmentCancellationToolsService.cancelAppointment({
      appointmentId,
      reason,
      attemptId
    });

    res.json(result);
  } catch (error) {
    logger.error('Error in cancel appointment route:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Retain appointment
 * POST /api/appointments/retain
 */
router.post('/retain', async (req: Request, res: Response): Promise<void> => {
  try {
    const { appointmentId, attemptId } = req.body;
    
    if (!appointmentId) {
      res.status(400).json({
        success: false,
        message: 'appointmentId is required'
      });
      return;
    }

    const result = await appointmentCancellationToolsService.retainAppointment(appointmentId, attemptId);

    res.json(result);
  } catch (error) {
    logger.error('Error in retain appointment route:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get available slots for rescheduling
 * POST /api/appointments/available-slots
 */
router.post('/available-slots', async (req: Request, res: Response): Promise<void> => {
  try {
    const { zipCode, preferredDates } = req.body;
    
    if (!zipCode) {
      res.status(400).json({
        success: false,
        message: 'zipCode is required'
      });
      return;
    }

    const result = await appointmentCancellationToolsService.getAvailableSlotsForReschedule(
      zipCode,
      preferredDates
    );

    res.json(result);
  } catch (error) {
    logger.error('Error in available slots route:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get cancellation statistics
 * GET /api/appointments/cancellation/stats
 */
router.get('/cancellation/stats', async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await appointmentCancellationToolsService.getCancellationStats();
    res.json(result);
  } catch (error) {
    logger.error('Error in cancellation stats route:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;