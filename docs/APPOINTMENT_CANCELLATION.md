# Appointment Cancellation Management

Emma now has advanced appointment cancellation management capabilities with intelligent retention strategies, rebuttals, and rescheduling options.

## Overview

The appointment cancellation system provides Emma with tools to:
- Handle inbound and outbound cancellation requests
- Apply strategic rebuttals based on cancellation reasons
- Offer rescheduling alternatives
- Track retention success rates
- Process final cancellations when necessary

## System Components

### 1. Appointment Management Service
**File:** `src/services/appointment-management.service.ts`

Core service that manages appointment data and cancellation tracking:
- Stores appointment information with status tracking
- Manages cancellation attempts with rebuttal stages
- Tracks retention success/failure rates
- Provides appointment search and modification capabilities

### 2. Cancellation Tools Service
**File:** `src/services/appointment-cancellation-tools.service.ts`

High-level service that provides business logic for cancellation operations:
- Find customer appointments by name, phone, or ID
- Start and track cancellation attempts
- Update rebuttal stages and outcomes
- Handle rescheduling and final cancellations
- Generate availability slots for rescheduling

### 3. Emma Tools Service
**File:** `src/services/emma-tools.service.ts`

Integration layer that provides Emma with structured tools for the AI system:
- Defines tool schemas for OpenAI function calling
- Routes tool calls to appropriate services
- Provides intelligent rebuttal suggestions
- Tracks tool execution and errors

### 4. Enhanced System Prompt
**File:** `src/config/emma-cancellation-prompt.ts`

Comprehensive prompt that guides Emma's cancellation management behavior:
- Call type identification (scheduling vs cancellation)
- Step-by-step cancellation workflow
- Rebuttal strategies by objection type
- Confirmation call protocols
- Success metrics tracking

## Cancellation Workflow

### 1. Call Type Identification
Emma identifies whether this is:
- **New Scheduling:** Customer requesting initial appointment
- **Cancellation Request:** Customer wants to cancel existing appointment
- **Confirmation Call:** Emma calling to confirm, customer mentions cancellation

### 2. Appointment Lookup
```typescript
// Find customer's appointment
const result = await emmaToolsService.executeToolCall({
  name: 'find_customer_appointment',
  arguments: {
    customerName: 'John Smith',
    customerPhone: '+1-555-0123'
  }
});
```

### 3. Start Cancellation Tracking
```typescript
// Begin retention effort tracking
const attempt = await emmaToolsService.executeToolCall({
  name: 'start_cancellation_attempt',
  arguments: {
    appointmentId: 'apt-001',
    reason: 'Schedule conflict',
    customerInitiated: true
  }
});
```

### 4. Apply Strategic Rebuttals
Emma uses intelligent rebuttals based on cancellation reason:

#### Schedule Conflicts
- Emphasize flexibility and rescheduling options
- Highlight keeping place in schedule
- Mention discount preservation

#### Financial Concerns
- Stress free consultation value
- Explain financing options
- Emphasize no-obligation nature

#### Changed Mind/Second Thoughts
- Normalize hesitation feelings
- Focus on educational value
- Share customer success stories

#### Spouse/Partner Objections
- Acknowledge importance of agreement
- Suggest consultation can convince hesitant partner
- Offer couples-friendly scheduling

### 5. Offer Rescheduling
```typescript
// Get available slots
const slots = await emmaToolsService.executeToolCall({
  name: 'get_available_slots',
  arguments: {
    zipCode: '02101',
    preferredDates: ['2025-06-07', '2025-06-08']
  }
});

// Reschedule if customer agrees
const reschedule = await emmaToolsService.executeToolCall({
  name: 'reschedule_appointment',
  arguments: {
    appointmentId: 'apt-001',
    newDate: '2025-06-07',
    newTime: '14:00',
    attemptId: 'cancel-123'
  }
});
```

### 6. Final Outcomes
- **Retained:** Customer keeps original appointment
- **Rescheduled:** Moved to new date/time
- **Cancelled:** All retention efforts failed

## Rebuttal Strategies

### Stage 1: Address Core Concern
- Listen empathetically to their reason
- Acknowledge their feelings
- Offer specific solutions

### Stage 2: Alternative Approaches
- Present different perspectives
- Suggest compromise solutions
- Use social proof and testimonials

### Stage 3: Final Retention Attempt
- Offer tentative hold on future appointment
- Mention limited-time promotions
- Provide consultant callback option

## API Endpoints

The system exposes REST endpoints for testing and integration:

```
POST /api/appointments/find              - Find customer appointments
POST /api/appointments/cancellation/start - Start cancellation attempt
POST /api/appointments/cancellation/update - Update rebuttal stage
POST /api/appointments/reschedule        - Reschedule appointment
POST /api/appointments/retain           - Retain appointment
POST /api/appointments/cancel           - Cancel appointment
POST /api/appointments/available-slots  - Get rescheduling options
GET  /api/appointments/cancellation/stats - Get retention statistics
```

## Testing

Run the comprehensive test suite:

```bash
npm run test:cancellation
# or
npx ts-node scripts/test-appointment-cancellation.ts
```

The test script demonstrates:
- Finding customer appointments
- Starting cancellation attempts
- Applying rebuttals and tracking responses
- Rescheduling appointments
- Processing final cancellations
- Retaining appointments through persuasion
- Generating retention statistics

## Emma's Capabilities

### What Emma Can Do:
1. **Identify Cancellation Intent:** Recognize when customers want to cancel
2. **Apply Strategic Rebuttals:** Use reason-specific retention strategies
3. **Offer Alternatives:** Present rescheduling options with real availability
4. **Handle Multiple Scenarios:** Work with different objection types
5. **Track Success:** Monitor retention rates and rebuttal effectiveness
6. **Process Final Cancellations:** Handle when retention fails
7. **Maintain Positive Relationships:** End interactions professionally

### Conversation Flow Example:

**Customer:** "Hi, I need to cancel my appointment tomorrow."

**Emma:** "I'm so sorry to hear you need to make a change to your appointment. Let me first confirm which appointment we're discussing. Can you provide me with your name?"

**Customer:** "John Smith, I have an appointment at 2 PM tomorrow."

**Emma:** "I see your consultation scheduled for tomorrow at 2:00 PM with our Design Consultant Mike. Before we make any changes, may I ask what's prompting you to cancel? I might be able to help find a solution."

**Customer:** "I have a work meeting that came up."

**Emma:** "I completely understand how busy schedules can be. Rather than canceling completely, would you be open to rescheduling? I can check our availability for later this week. This way you won't lose your place in our schedule, and since your consultation was booked within our promotion period, you'll still qualify for the $1,000 discount."

**Customer:** "Maybe... what times do you have?"

**Emma:** "Let me check our availability for you... I have openings on Thursday at 10 AM, 2 PM, or 6 PM, and Friday at 10 AM or 6 PM. Which of these would work better for your schedule?"

## Configuration

### Environment Variables
No additional environment variables required - uses existing system configuration.

### Customization Options
- Modify rebuttal messages in `emma-cancellation-prompt.ts`
- Adjust retention strategies in `emma-tools.service.ts`
- Configure appointment slots in `appointment-management.service.ts`

## Monitoring & Analytics

The system tracks:
- **Total Cancellation Attempts:** How many customers tried to cancel
- **Retention Rate:** Percentage of appointments saved
- **Rebuttal Effectiveness:** Which strategies work best
- **Common Objection Types:** Most frequent cancellation reasons
- **Rescheduling Success:** How often customers accept new times

Access statistics via:
```typescript
const stats = await emmaToolsService.getRetentionStats();
// Returns: { totalAttempts, retained, rescheduled, cancelled, retentionRate }
```

## Best Practices

### For Optimal Retention:
1. **Listen First:** Always understand the customer's concern
2. **Acknowledge Feelings:** Validate their situation
3. **Offer Specific Solutions:** Don't be vague about alternatives
4. **Respect Decisions:** Don't be pushy if they insist on canceling
5. **End Positively:** Leave door open for future opportunities

### For System Maintenance:
1. **Monitor Retention Rates:** Track performance over time
2. **Update Rebuttals:** Refine strategies based on success rates
3. **Review Common Objections:** Address frequent concerns proactively
4. **Train on New Scenarios:** Add handling for new objection types

## Future Enhancements

Potential improvements:
- Integration with external calendar systems
- Automated follow-up for canceled appointments
- Machine learning for rebuttal optimization
- Customer sentiment analysis during cancellation calls
- Integration with CRM systems for customer history

## Integration with Voice Systems

The cancellation tools integrate seamlessly with:
- **OpenAI Realtime API:** For low-latency voice interactions
- **Twilio Voice:** For inbound/outbound phone calls
- **WebSocket Connections:** For real-time web interfaces

Emma can handle cancellations across all communication channels with consistent retention strategies and tracking.