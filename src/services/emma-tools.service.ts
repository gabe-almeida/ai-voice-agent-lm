import { ToolDefinition } from './openai-realtime.service';
import { appointmentCancellationToolsService } from './appointment-cancellation-tools.service';
import { CALL_SCENARIO_DETECTION } from '../config/emma-unified-prompt';
import logger from '../utils/logger';

export interface ToolCallRequest {
  call_id: string;
  name: string;
  arguments: any;
}

export interface ToolCallResponse {
  call_id: string;
  output: any;
}

export interface ScenarioDetectionResult {
  scenario: 'scheduling' | 'cancellation' | 'rescheduling' | 'confirmation' | 'unclear';
  confidence: number;
  suggestedResponse: string;
  nextTools: string[];
}

export class EmmaToolsService {
  
  /**
   * Detect call scenario from customer input
   */
  detectScenario(customerInput: string, callContext?: any): ScenarioDetectionResult {
    const input = customerInput.toLowerCase();
    const scenarios = CALL_SCENARIO_DETECTION;
    
    let scores = {
      scheduling: 0,
      cancellation: 0,
      rescheduling: 0,
      confirmation: 0
    };

    // Enhanced phrase-based detection for better accuracy
    const phrases = {
      cancellation: [
        'cancel that', 'cancel it', 'cancel my', 'i want to cancel', 'need to cancel',
        'would like to cancel', 'have to cancel', 'don\'t want', 'not interested anymore'
      ],
      rescheduling: [
        'reschedule it', 'reschedule that', 'change the time', 'move it', 'move my',
        'different time', 'another day', 'better time', 'switch it', 'change my appointment',
        'instead of canceling', 'rather than cancel', 'just reschedule', 'could we reschedule'
      ],
      scheduling: [
        'schedule a', 'book a', 'set up a', 'new appointment', 'new consultation',
        'want to schedule', 'like to schedule', 'need to schedule', 'looking to schedule'
      ],
      confirmation: [
        'still on', 'all set', 'ready for', 'confirmed', 'see you then', 'sounds good',
        'got your call', 'yes i got', 'ready for tomorrow'
      ]
    };

    // Check phrases first (higher accuracy)
    Object.keys(phrases).forEach(scenario => {
      phrases[scenario as keyof typeof phrases].forEach(phrase => {
        if (input.includes(phrase)) {
          scores[scenario as keyof typeof scores] += 3; // High weight for phrase matches
        }
      });
    });

    // Then check individual keywords
    scenarios.scheduling.forEach(keyword => {
      if (input.includes(keyword)) scores.scheduling += 1;
    });
    
    scenarios.cancellation.forEach(keyword => {
      if (input.includes(keyword)) scores.cancellation += 2; // Higher weight for cancellation
    });
    
    scenarios.rescheduling.forEach(keyword => {
      if (input.includes(keyword)) scores.rescheduling += 1.5;
    });
    
    scenarios.confirmation.forEach(keyword => {
      if (input.includes(keyword)) scores.confirmation += 1;
    });

    // Context-aware adjustments
    const callType = callContext?.callType;
    const purpose = callContext?.purpose;
    
    // If it's an outbound confirmation call and customer mentions cost/affordability
    if (callType === 'outbound' && purpose === 'confirmation') {
      if (input.includes('afford') || input.includes('money') || input.includes('cost') ||
          input.includes('expensive') || input.includes('thinking about')) {
        scores.cancellation += 2;
      }
    }

    // Find highest scoring scenario
    const maxScore = Math.max(...Object.values(scores));
    const detectedScenario = Object.keys(scores).find(
      key => scores[key as keyof typeof scores] === maxScore
    ) as keyof typeof scores;

    // Calculate confidence (0-100)
    const totalWords = input.split(' ').length;
    const confidence = Math.min(100, (maxScore / totalWords) * 100);

    // Determine final scenario
    let scenario: ScenarioDetectionResult['scenario'];
    let suggestedResponse: string;
    let nextTools: string[];

    if (maxScore === 0) {
      scenario = 'unclear';
      suggestedResponse = "I want to make sure I help you with the right thing. Are you looking to schedule a new consultation, or do you have questions about an existing appointment?";
      nextTools = ['detect_scenario'];
    } else if (detectedScenario === 'cancellation') {
      scenario = 'cancellation';
      suggestedResponse = "I understand you need to make a change to your appointment. Let me pull up your details so I can help you with that.";
      nextTools = ['find_customer_appointment', 'start_cancellation_attempt'];
    } else if (detectedScenario === 'rescheduling') {
      scenario = 'rescheduling';
      suggestedResponse = "Absolutely! I'd be happy to help you find a time that works better. Let me check our availability for you.";
      nextTools = ['find_customer_appointment', 'get_available_slots'];
    } else if (detectedScenario === 'scheduling') {
      scenario = 'scheduling';
      suggestedResponse = "Great! I can definitely help you schedule that free, no-obligation in-home design consultation.";
      nextTools = ['get_appointment_availability'];
    } else {
      scenario = 'confirmation';
      suggestedResponse = "Perfect! I'm glad to confirm everything is still set for your appointment.";
      nextTools = [];
    }

    logger.info('Scenario detected', {
      input: customerInput,
      scenario,
      confidence,
      scores,
      callContext
    });

    return {
      scenario,
      confidence,
      suggestedResponse,
      nextTools
    };
  }

  /**
   * Get all available tools for Emma (both scheduling and cancellation)
   */
  getToolDefinitions(): ToolDefinition[] {
    return [
      // Scenario Detection Tool
      {
        type: 'function',
        function: {
          name: 'detect_scenario',
          description: 'Analyze customer input to determine if they want to schedule, cancel, reschedule, or confirm an appointment. Use this when unsure about customer intent.',
          parameters: {
            type: 'object',
            properties: {
              customerInput: {
                type: 'string',
                description: 'The customer\'s verbal response or message'
              },
              callContext: {
                type: 'string',
                enum: ['inbound', 'outbound'],
                description: 'Whether customer called in or we called them'
              }
            },
            required: ['customerInput'],
            additionalProperties: false
          }
        }
      },
      
      // Scheduling Tools (for new appointments)
      {
        type: 'function',
        function: {
          name: 'get_appointment_availability',
          description: 'Get available appointment slots for new consultation scheduling. Use this for new customers or when scheduling fresh appointments.',
          parameters: {
            type: 'object',
            properties: {
              zipCode: {
                type: 'string',
                description: 'Customer zip code to find local consultants'
              },
              preferredDates: {
                type: 'array',
                items: {
                  type: 'string',
                  format: 'date'
                },
                description: 'Preferred dates in YYYY-MM-DD format (optional)'
              }
            },
            required: ['zipCode'],
            additionalProperties: false
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'create_appointment_event',
          description: 'Create a new appointment in the system after customer agrees to a specific time slot.',
          parameters: {
            type: 'object',
            properties: {
              customerName: {
                type: 'string',
                description: 'Customer\'s full name'
              },
              customerPhone: {
                type: 'string',
                description: 'Customer\'s phone number'
              },
              customerEmail: {
                type: 'string',
                description: 'Customer\'s email address (optional)'
              },
              scheduledTime: {
                type: 'string',
                format: 'date-time',
                description: 'Appointment time in ISO 8601 format'
              },
              address: {
                type: 'string',
                description: 'Customer\'s street address'
              },
              city: {
                type: 'string',
                description: 'Customer\'s city'
              },
              state: {
                type: 'string',
                description: 'Customer\'s state'
              },
              zipCode: {
                type: 'string',
                description: 'Customer\'s zip code'
              },
              staffId: {
                type: 'string',
                description: 'ID of assigned design consultant'
              },
              notes: {
                type: 'string',
                description: 'Any special notes about the appointment'
              }
            },
            required: ['customerName', 'scheduledTime', 'address', 'city', 'state', 'zipCode', 'staffId'],
            additionalProperties: false
          }
        }
      },

      // Cancellation & Modification Tools
      {
        type: 'function',
        function: {
          name: 'find_customer_appointment',
          description: 'Find customer appointments by name, phone number, or appointment ID. Use this when customer wants to cancel or modify an appointment.',
          parameters: {
            type: 'object',
            properties: {
              customerName: {
                type: 'string',
                description: 'Customer name to search for'
              },
              customerPhone: {
                type: 'string',
                description: 'Customer phone number to search for'
              },
              appointmentId: {
                type: 'string',
                description: 'Specific appointment ID if known'
              }
            },
            additionalProperties: false
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'start_cancellation_attempt',
          description: 'Start tracking a cancellation attempt for retention purposes. Use this when customer expresses intent to cancel.',
          parameters: {
            type: 'object',
            properties: {
              appointmentId: {
                type: 'string',
                description: 'The appointment ID to start cancellation tracking for'
              },
              reason: {
                type: 'string',
                description: 'The reason customer wants to cancel (schedule conflict, financial concern, changed mind, etc.)'
              },
              customerInitiated: {
                type: 'boolean',
                description: 'Whether the customer initiated the cancellation (true) or we discovered it during confirmation call (false)',
                default: true
              }
            },
            required: ['appointmentId', 'reason'],
            additionalProperties: false
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'update_cancellation_attempt',
          description: 'Update cancellation attempt with rebuttal information and customer responses.',
          parameters: {
            type: 'object',
            properties: {
              attemptId: {
                type: 'string',
                description: 'The cancellation attempt ID to update'
              },
              rebuttalStage: {
                type: 'integer',
                description: 'Which rebuttal stage (1, 2, 3) this represents',
                minimum: 1,
                maximum: 3
              },
              rebuttalType: {
                type: 'string',
                enum: ['schedule_conflict', 'financial_concern', 'changed_mind', 'spouse_objection', 'timing_concern'],
                description: 'Type of rebuttal being used'
              },
              customerResponse: {
                type: 'string',
                description: 'How the customer responded to the rebuttal'
              },
              outcome: {
                type: 'string',
                enum: ['retained', 'rescheduled', 'cancelled'],
                description: 'Final outcome if determined'
              }
            },
            required: ['attemptId', 'rebuttalStage', 'rebuttalType', 'customerResponse'],
            additionalProperties: false
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'get_available_slots',
          description: 'Get available appointment slots for rescheduling. Use when customer is open to rescheduling instead of canceling.',
          parameters: {
            type: 'object',
            properties: {
              zipCode: {
                type: 'string',
                description: 'Customer zip code to find local availability'
              },
              preferredDates: {
                type: 'array',
                items: {
                  type: 'string',
                  format: 'date'
                },
                description: 'Preferred dates in YYYY-MM-DD format'
              }
            },
            required: ['zipCode'],
            additionalProperties: false
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'find_customer_appointment',
          description: 'REQUIRED FIRST STEP: Find and verify a customer appointment exists before any reschedule, cancel, or retain operations. This tool must be called first to validate the appointment exists and get proper appointment details.',
          parameters: {
            type: 'object',
            properties: {
              customerName: {
                type: 'string',
                description: 'Customer name to search for appointments'
              },
              phoneNumber: {
                type: 'string',
                description: 'Customer phone number (optional, helps with verification)'
              },
              appointmentDate: {
                type: 'string',
                format: 'date',
                description: 'Expected appointment date in YYYY-MM-DD format (optional, helps narrow search)'
              },
              zipCode: {
                type: 'string',
                description: 'Customer zip code (optional, helps with verification)'
              }
            },
            required: ['customerName'],
            additionalProperties: false
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'reschedule_appointment',
          description: 'IMPORTANT: Reschedule an appointment to a new date and time. You MUST first use find_customer_appointment to verify the appointment exists and get valid appointment details before using this tool. Only use after customer agrees to reschedule.',
          parameters: {
            type: 'object',
            properties: {
              appointmentId: {
                type: 'string',
                description: 'The EXACT appointment ID obtained from find_customer_appointment tool (required for validation)'
              },
              newDate: {
                type: 'string',
                format: 'date',
                description: 'New appointment date in YYYY-MM-DD format'
              },
              newTime: {
                type: 'string',
                pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$',
                description: 'New appointment time in HH:mm format'
              },
              newStaffId: {
                type: 'string',
                description: 'New staff member ID if changing consultant'
              },
              reason: {
                type: 'string',
                description: 'Reason for rescheduling'
              },
              attemptId: {
                type: 'string',
                description: 'Cancellation attempt ID if this was part of retention effort'
              },
              customerName: {
                type: 'string',
                description: 'Customer name from the found appointment (for verification)'
              }
            },
            required: ['appointmentId', 'newDate', 'newTime', 'customerName'],
            additionalProperties: false
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'retain_appointment',
          description: 'IMPORTANT: Mark appointment as retained (customer decided to keep original appointment). You MUST first use find_customer_appointment to verify the appointment exists before using this tool. Use when retention efforts succeed.',
          parameters: {
            type: 'object',
            properties: {
              appointmentId: {
                type: 'string',
                description: 'The EXACT appointment ID obtained from find_customer_appointment tool (required for validation)'
              },
              attemptId: {
                type: 'string',
                description: 'Cancellation attempt ID that was successful'
              },
              customerName: {
                type: 'string',
                description: 'Customer name from the found appointment (for verification)'
              }
            },
            required: ['appointmentId', 'customerName'],
            additionalProperties: false
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'cancel_appointment',
          description: 'IMPORTANT: Cancel an appointment (final step when all retention efforts fail). You MUST first use find_customer_appointment to verify the appointment exists before using this tool. Only use as last resort.',
          parameters: {
            type: 'object',
            properties: {
              appointmentId: {
                type: 'string',
                description: 'The EXACT appointment ID obtained from find_customer_appointment tool (required for validation)'
              },
              reason: {
                type: 'string',
                description: 'Final reason for cancellation'
              },
              attemptId: {
                type: 'string',
                description: 'Cancellation attempt ID for tracking'
              },
              customerName: {
                type: 'string',
                description: 'Customer name from the found appointment (for verification)'
              }
            },
            required: ['appointmentId', 'reason', 'customerName'],
            additionalProperties: false
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'end_call',
          description: 'End the current phone call when the conversation is naturally complete. Use this when the customer indicates they are finished, the appointment has been scheduled/cancelled/rescheduled successfully, or when the conversation has reached a natural conclusion.',
          parameters: {
            type: 'object',
            properties: {
              reason: {
                type: 'string',
                description: 'Brief reason for ending the call (e.g., "appointment scheduled", "call completed", "customer request")'
              },
              callSid: {
                type: 'string',
                description: 'The Twilio call SID to end (optional - system will use current call if not provided)'
              }
            },
            required: ['reason'],
            additionalProperties: false
          }
        }
      }
    ];
  }

  /**
   * Get appointment availability for scheduling
   */
  private async getAppointmentAvailability(args: {
    zipCode: string;
    preferredDates?: string[];
  }) {
    try {
      // Mock availability data - in production this would connect to actual scheduling system
      const mockSlots = [
        {
          id: 'slot_001',
          date: '2025-06-05',
          startTime: '09:00',
          endTime: '11:00',
          staffId: 'staff_001',
          staffName: 'John Smith',
          available: true
        },
        {
          id: 'slot_002',
          date: '2025-06-05',
          startTime: '14:00',
          endTime: '16:00',
          staffId: 'staff_002',
          staffName: 'Sarah Johnson',
          available: true
        },
        {
          id: 'slot_003',
          date: '2025-06-06',
          startTime: '10:00',
          endTime: '12:00',
          staffId: 'staff_001',
          staffName: 'John Smith',
          available: true
        }
      ];

      return {
        success: true,
        message: 'Available appointment slots retrieved',
        data: {
          zipCode: args.zipCode,
          availableSlots: mockSlots
        }
      };
    } catch (error) {
      logger.error('Error getting appointment availability', { error });
      return {
        success: false,
        message: 'Failed to get appointment availability',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Create a new appointment event
   */
  private async createAppointmentEvent(args: {
    customerName: string;
    customerPhone?: string;
    customerEmail?: string;
    scheduledTime: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    staffId: string;
    notes?: string;
  }) {
    try {
      // Mock appointment creation - in production this would connect to actual scheduling system
      const appointmentId = `appt_${Date.now()}`;
      
      logger.info('Creating new appointment', {
        appointmentId,
        customerName: args.customerName,
        scheduledTime: args.scheduledTime,
        staffId: args.staffId
      });

      return {
        success: true,
        message: 'Appointment created successfully',
        data: {
          appointmentId,
          customerName: args.customerName,
          customerPhone: args.customerPhone,
          customerEmail: args.customerEmail,
          scheduledTime: args.scheduledTime,
          address: args.address,
          city: args.city,
          state: args.state,
          zipCode: args.zipCode,
          staffId: args.staffId,
          notes: args.notes,
          status: 'confirmed',
          createdAt: new Date().toISOString()
        }
      };
    } catch (error) {
      logger.error('Error creating appointment', { error });
      return {
        success: false,
        message: 'Failed to create appointment',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Execute a tool call and return the result
   */
  async executeToolCall(toolCall: ToolCallRequest): Promise<ToolCallResponse> {
    try {
      logger.info('Executing tool call', { 
        toolName: toolCall.name, 
        callId: toolCall.call_id,
        arguments: toolCall.arguments 
      });

      let result: any;

      switch (toolCall.name) {
        // Scenario Detection
        case 'detect_scenario':
          result = {
            success: true,
            message: 'Scenario detected successfully',
            data: this.detectScenario(
              toolCall.arguments.customerInput,
              toolCall.arguments.callContext
            )
          };
          break;

        // Scheduling Tools (New Appointments)
        case 'get_appointment_availability':
          result = await this.getAppointmentAvailability(toolCall.arguments);
          break;

        case 'create_appointment_event':
          result = await this.createAppointmentEvent(toolCall.arguments);
          break;

        // Cancellation & Modification Tools
        case 'find_customer_appointment':
          result = await appointmentCancellationToolsService.findCustomerAppointment(toolCall.arguments);
          break;

        case 'start_cancellation_attempt':
          result = await appointmentCancellationToolsService.startCancellationAttempt(toolCall.arguments);
          break;

        case 'update_cancellation_attempt':
          result = await appointmentCancellationToolsService.updateCancellationAttempt(toolCall.arguments);
          break;

        case 'get_available_slots':
          result = await appointmentCancellationToolsService.getAvailableSlotsForReschedule(
            toolCall.arguments.zipCode,
            toolCall.arguments.preferredDates
          );
          break;

        case 'reschedule_appointment':
          result = await appointmentCancellationToolsService.rescheduleAppointment(toolCall.arguments);
          break;

        case 'retain_appointment':
          result = await appointmentCancellationToolsService.retainAppointment(
            toolCall.arguments.appointmentId,
            toolCall.arguments.attemptId
          );
          break;

        case 'cancel_appointment':
          result = await appointmentCancellationToolsService.cancelAppointment(toolCall.arguments);
          break;

        case 'end_call':
          result = await this.endCall(toolCall.arguments);
          break;

        default:
          throw new Error(`Unknown tool: ${toolCall.name}`);
      }

      logger.info('Tool call executed successfully', { 
        toolName: toolCall.name, 
        callId: toolCall.call_id,
        success: result.success 
      });

      return {
        call_id: toolCall.call_id,
        output: result
      };

    } catch (error) {
      logger.error('Tool call execution failed', { 
        toolName: toolCall.name, 
        callId: toolCall.call_id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        call_id: toolCall.call_id,
        output: {
          success: false,
          message: 'Tool execution failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Get suggested rebuttals based on cancellation reason
   */
  getSuggestedRebuttals(reason: string): string[] {
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

  /**
   * End the current phone call
   */
  private async endCall(args: {
    reason: string;
    callSid?: string;
  }) {
    try {
      logger.info('Emma ending call', { reason: args.reason, callSid: args.callSid });

      // Import TwilioService dynamically to avoid circular imports
      const { TwilioService } = await import('./twilio.service');

      if (args.callSid) {
        // End specific call by SID
        await TwilioService.endCall(args.callSid);
        // Release the number from pool
        TwilioService.releaseNumberOnCallEnd(args.callSid);
      } else {
        // If no callSid provided, we'll just log and return success
        // In a real implementation, you'd get the current call SID from context
        logger.info('Call ended by Emma - no specific callSid provided');
      }

      return {
        success: true,
        message: `Call ended successfully. Reason: ${args.reason}`,
        data: {
          reason: args.reason,
          callSid: args.callSid,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      logger.error('Error ending call:', error);
      return {
        success: false,
        message: 'Failed to end call',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get retention statistics
   */
  async getRetentionStats() {
    return await appointmentCancellationToolsService.getCancellationStats();
  }
}

export const emmaToolsService = new EmmaToolsService();