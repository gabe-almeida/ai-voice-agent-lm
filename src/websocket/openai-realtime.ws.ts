/**
 * WebSocket handler for OpenAI Realtime API integration
 * Provides ultra-low latency voice streaming with Emma system prompt
 */

import { WebSocket } from 'ws';
import { OpenAIRealtimeService, ToolDefinition } from '../services/openai-realtime.service';
import { EMMA_SYSTEM_PROMPT } from '../config/emma-prompt';
import logger from '../utils/logger';
import { costTracker } from '../utils/cost-tracker';
import axios from 'axios'; // Added for making HTTP requests
import { KnowledgePromptBuilder } from '../services/knowledge-prompt-builder.service';

// --- Tool Definitions ---
// Note: Following VAPI/ElevenLabs approach, knowledge base is embedded in prompt, not accessed via tools

const getAppointmentAvailabilityTool: ToolDefinition = {
  type: 'function',
  function: {
    name: 'get_appointment_availability',
    description: 'Fetches all available appointment slots for sales representatives for the current week from the CRM. The agent will then filter these by the user\'s desired date.',
    parameters: {
      type: 'object',
      properties: {}, // No parameters needed as it fetches all weekly availability
      required: [],
    },
  },
};

const createAppointmentEventTool: ToolDefinition = {
  type: 'function',
  function: {
    name: 'create_appointment_event',
    description: 'Creates a new sales appointment event in the CRM.',
    parameters: {
      type: 'object',
      properties: {
        scheduledTime: {
          type: 'string',
          description: 'The scheduled time for the appointment in ISO 8601 format (e.g., YYYY-MM-DDTHH:mm:ssZ).',
        },
        customerName: {
          type: 'string',
          description: 'Full name of the customer.',
        },
        address: {
          type: 'string',
          description: 'Full street address for the appointment.',
        },
        city: {
          type: 'string',
          description: 'City for the appointment.',
        },
        state: {
          type: 'string',
          description: 'State for the appointment (e.g., MA).',
        },
        zipCode: {
          type: 'string',
          description: 'Zip code for the appointment.',
        },
        staffId: {
          type: 'string',
          description: 'The ID of the sales representative (Staff) assigned to the event. This should be determined from the availability check.',
        },
        notes: {
          type: 'string',
          description: 'Any notes for the appointment or for the sales representative.',
        },
        // Add other relevant optional fields from your CRM API docs if needed by the agent
        // e.g., productCategory, customerId (if known)
      },
      required: ['scheduledTime', 'customerName', 'address', 'city', 'state', 'zipCode', 'staffId'],
    },
  },
};

const crmApiBaseUrl = process.env.CRM_API_BASE_URL; // Ensure this is set in your .env file

export function handleOpenAIRealtimeWebSocket(ws: WebSocket, _req: any) {
  logger.info('New OpenAI Realtime WebSocket connection');
  
  let realtimeService: OpenAIRealtimeService | null = null;
  let isConnected = false;
  let currentSessionId: string | null = null; // Added to store session ID

  // Initialize OpenAI Realtime service with Emma prompt
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    ws.send(JSON.stringify({
      type: 'error',
      error: { message: 'OpenAI API key not configured' }
    }));
    ws.close();
    return;
  }

  // Handle incoming messages from client
  ws.on('message', async (data: Buffer) => {
    try {
      const message = JSON.parse(data.toString());
      
      switch (message.type) {
        case 'session.update':
          // Initialize the OpenAI Realtime service if not already done
          if (!realtimeService) {
            realtimeService = new OpenAIRealtimeService(apiKey, {
              voice: message.session?.voice || 'alloy',
              instructions: EMMA_SYSTEM_PROMPT,
              temperature: message.session?.temperature || 0.8,
              maxResponseLength: message.session?.max_response_output_tokens || 4096,
              tools: [
                getAppointmentAvailabilityTool,
                createAppointmentEventTool
                // Knowledge base is embedded in prompt (VAPI/ElevenLabs approach)
              ],
            });

            // Set up event forwarding from OpenAI to client
            realtimeService.on('session.created', (data) => {
              logger.info('Session created event received', {
                service: 'openai-realtime-ws',
                sessionId: data.id,
                instructions: data.instructions?.substring(0, 100) + '...'
              });
              currentSessionId = data.id; // Store session ID
              if (currentSessionId) {
                costTracker.startSession(currentSessionId); // Start cost tracking
              }
              ws.send(JSON.stringify({ type: 'session.created', ...data }));
            });

            realtimeService.on('conversation.item.created', (data) => {
              ws.send(JSON.stringify({ type: 'conversation.item.created', ...data }));
            });

            realtimeService.on('audio', (data) => {
              if (data.isFinal) {
                ws.send(JSON.stringify({ type: 'response.audio.done' }));
              } else {
                ws.send(JSON.stringify({
                  type: 'response.audio.delta',
                  delta: Buffer.from(data.audio).toString('base64')
                }));
              }
            });

            realtimeService.on('text', (data) => {
              if (data.isFinal) {
                ws.send(JSON.stringify({ type: 'response.text.done', text: data.text }));
              } else {
                ws.send(JSON.stringify({ type: 'response.text.delta', delta: data.text }));
              }
            });

            realtimeService.on('response.done', (data) => {
              // data here is the full response object from OpenAI, which includes 'usage'
              if (currentSessionId && data && data.usage) {
                costTracker.trackOpenAIRealtimeUsage(currentSessionId, data.usage);
              }
              ws.send(JSON.stringify({ type: 'response.done', response: data }));
            });

            realtimeService.on('transcription', (transcript) => {
              ws.send(JSON.stringify({ type: 'transcription', transcript }));
            });

            realtimeService.on('input_audio_buffer.speech_started', (data) => {
              ws.send(JSON.stringify({ type: 'input_audio_buffer.speech_started', ...data }));
            });

            realtimeService.on('input_audio_buffer.speech_stopped', (data) => {
              ws.send(JSON.stringify({ type: 'input_audio_buffer.speech_stopped', ...data }));
            });

            realtimeService.on('error', (error) => {
              ws.send(JSON.stringify({ type: 'error', error: error.message }));
            });

            // Handle tool call requests from OpenAI
            realtimeService.on('tool_calls.requested', async (toolCalls) => {
              if (!realtimeService || !crmApiBaseUrl) {
                logger.error('Realtime service or CRM API Base URL not available for tool call');
                // Optionally send a generic error back for all tool calls if this happens
                for (const toolCall of toolCalls) {
                  realtimeService?.sendToolResults(toolCall.id, 'Internal configuration error, cannot execute tool.', true);
                }
                return;
              }
              
              for (const toolCall of toolCalls) {
                if (toolCall.type !== 'function') {
                  logger.warn('Received non-function tool call type', { toolCall });
                  realtimeService.sendToolResults(toolCall.id, `Error: Tool type ${toolCall.type} is not supported.`, true);
                  continue;
                }

                const { name, arguments: argsString } = toolCall.function;
                let args: any;
                try {
                  args = JSON.parse(argsString);
                } catch (e: any) {
                  logger.error('Error parsing tool arguments', { toolCallId: toolCall.id, argsString, error: e.message });
                  realtimeService.sendToolResults(toolCall.id, `Error: Invalid arguments format: ${e.message}`, true);
                  continue;
                }

                logger.info(`Executing ${name} tool`, { args });

                if (name === 'get_appointment_availability') {
                  try {
                    // Call GET /sales-rep-availability
                    const response = await axios.get(`${crmApiBaseUrl}/sales-rep-availability`);
                    logger.info('CRM get_appointment_availability raw response', { data: response.data });
                    // The API returns data under a "data" key, and also a "success" and "message"
                    if (response.data && response.data.success && response.data.data) {
                      realtimeService.sendToolResults(toolCall.id, response.data.data);
                    } else {
                      throw new Error(response.data.message || 'Failed to retrieve availability or unexpected format.');
                    }
                  } catch (e: any) {
                    logger.error('Error calling get_appointment_availability CRM API', { toolCallId: toolCall.id, error: e.response?.data || e.message });
                    realtimeService.sendToolResults(toolCall.id, `Error fetching availability: ${e.message}`, true);
                  }
                } else if (name === 'create_appointment_event') {
                  try {
                    // Construct the payload for POST /events
                    const payload = {
                      Event_Type: "Sales Appointment", // Default as per API docs example
                      Scheduled_Time: args.scheduledTime, // ISO format
                      Status: "Scheduled", // Default initial status
                      Customer_Name: args.customerName,
                      Address: args.address,
                      Street: args.address, // Assuming full address is passed and can be used for Street
                      City: args.city,
                      State: args.state,
                      ZipCode: args.zipCode,
                      Staff: args.staffId, // This is the User UUID for the sales rep
                      Notes_for_Sales_Rep: args.notes,
                      // You might need to add other fields like 'Name' for the event itself
                      Name: `Consultation for ${args.customerName} on ${new Date(args.scheduledTime).toLocaleDateString()}`,
                      // Ensure all required fields by your specific CRM setup are included
                    };
                    const response = await axios.post(`${crmApiBaseUrl}/events`, payload);
                    logger.info('CRM create_appointment_event response', { data: response.data });
                     // Assuming 201 Created is success and it returns the created event
                    if (response.status === 201 && response.data) {
                      realtimeService.sendToolResults(toolCall.id, { success: true, eventId: response.data.Id, message: "Appointment created successfully." });
                    } else {
                       throw new Error(response.data.error || 'Failed to create appointment or unexpected format.');
                    }
                  } catch (e: any) {
                    logger.error('Error calling create_appointment_event CRM API', { toolCallId: toolCall.id, error: e.response?.data || e.message });
                    realtimeService.sendToolResults(toolCall.id, `Error creating appointment: ${e.message}`, true);
                  }
                } else {
                  logger.warn('Received unhandled tool name', { name });
                  realtimeService.sendToolResults(toolCall.id, `Error: Tool ${name} is not supported.`, true);
                }
              }
            });

            // Connect to OpenAI
            try {
              await realtimeService.connect();
              isConnected = true;
              logger.info('Connected to OpenAI Realtime API', {
                service: 'openai-realtime-ws',
                hasEmmaPrompt: !!EMMA_SYSTEM_PROMPT,
                promptLength: EMMA_SYSTEM_PROMPT.length
              });
            } catch (error) {
              logger.error('Failed to connect to OpenAI Realtime API', error);
              ws.send(JSON.stringify({
                type: 'error',
                error: { message: 'Failed to connect to OpenAI Realtime API' }
              }));
            }
          }
          break;

        case 'input_audio_buffer.append':
          if (realtimeService && isConnected && message.audio) {
            // Convert base64 to ArrayBuffer and send to OpenAI
            const audioBuffer = Buffer.from(message.audio, 'base64');
            realtimeService.sendAudio(audioBuffer.buffer);
          }
          break;

        case 'input_audio_buffer.commit':
          if (realtimeService && isConnected) {
            // Commit the audio buffer to trigger processing
            realtimeService.send({ type: 'input_audio_buffer.commit' });
            // Trigger response generation after committing audio
            realtimeService.send({ type: 'response.create' });
          }
          break;

        case 'conversation.item.create':
          if (realtimeService && isConnected) {
            // Forward text messages to OpenAI
            realtimeService.send(message);
          }
          break;

        case 'response.create':
          if (realtimeService && isConnected) {
            // Trigger response generation
            realtimeService.send(message);
          }
          break;

        default:
          logger.warn('Unknown message type from client:', message.type);
      }
    } catch (error) {
      logger.error('Error handling WebSocket message', error);
      ws.send(JSON.stringify({
        type: 'error',
        error: { message: 'Error processing message' }
      }));
    }
  });

  // Handle WebSocket close
  ws.on('close', () => {
    logger.info('OpenAI Realtime WebSocket connection closed');
    if (realtimeService) {
      realtimeService.disconnect();
      realtimeService = null;
    }
    if (currentSessionId) {
      costTracker.endSession(currentSessionId); // End cost tracking
      currentSessionId = null;
    }
    isConnected = false;
  });

  // Handle WebSocket errors
  ws.on('error', (error) => {
    logger.error('WebSocket error', error);
  });
}