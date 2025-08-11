# Email Parsing Strategy - OpenAI MCP Integration

## Overview
The email parsing system uses OpenAI with Model Context Protocol (MCP) to analyze emails and directly integrate with calendar services. The AI can autonomously call calendar functions to find available slots and generate responses.

## MCP-Enhanced Processing Pipeline

### Single-Step AI Analysis with Calendar Integration
**Purpose**: AI analyzes email and directly calls calendar APIs to provide comprehensive scheduling

```typescript
interface MCPAnalysisResult {
  isDemoRequest: boolean;
  confidence: number;
  contactInfo: {
    name: string;
    email: string;
    company?: string;
  };
  proposedTimeSlots: Array<{
    start: string;
    end: string;
    formatted: string;
  }>;
  emailResponse: string;
  reasoning: string;
}
```

### Core MCP Analysis Method
```typescript
async analyzeEmailAndSchedule(email: EmailMessage): Promise<MCPAnalysisResult> {
  const tools = calendarService.getMCPTools();
  
  const prompt = `
You are an AI sales assistant that helps schedule product demos. Analyze this email and use calendar tools to find available time slots if it's a demo request.

Your tasks:
1. Determine if this is a demo request (confidence 0.0-1.0)
2. Extract contact information (name, email, company)
3. If it's a demo request, use calendar tools to find 2-3 available time slots
4. Generate a professional email response with the available times

Rules:
- Only call calendar functions if confidence > 0.7
- Respect business hours (9 AM - 5 PM) and working days (Mon-Fri)
- Propose 30-minute demo slots that are NOT consecutive
- Scatter slots across different days/times for convenience
  `;
  
  // AI calls calendar functions directly and returns structured result
  return this.withRetry(async () => {
    const response = await this.client.chat.completions.create({
      model: config.openai.model,
      messages: [{ role: 'user', content: prompt }],
      tools: tools,
      tool_choice: 'auto',
      temperature: 0.1,
      max_tokens: 2000,
    });
    // Process tool calls and return analysis...
  });
}
```

## Available MCP Tools

The AI has access to these calendar functions that it can call directly:

### 1. find_available_slots
```typescript
{
  name: 'find_available_slots',
  description: 'Find available time slots for scheduling meetings',
  parameters: {
    type: 'object',
    properties: {
      startDate: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
      endDate: { type: 'string', description: 'End date (YYYY-MM-DD)' },
      durationMinutes: { type: 'number', description: 'Meeting duration in minutes' },
      maxResults: { type: 'number', description: 'Maximum number of slots to return' }
    }
  }
}
```

### 2. create_calendar_event
```typescript
{
  name: 'create_calendar_event',
  description: 'Create a new calendar event',
  parameters: {
    type: 'object',
    properties: {
      summary: { type: 'string', description: 'Event title' },
      start: { type: 'string', description: 'Start date/time (ISO 8601)' },
      end: { type: 'string', description: 'End date/time (ISO 8601)' },
      attendees: { type: 'array', items: { type: 'string' }, description: 'Attendee emails' },
      description: { type: 'string', description: 'Event description' }
    }
  }
}
```

### 3. get_calendar_events
```typescript
{
  name: 'get_calendar_events',
  description: 'Retrieve existing calendar events',
  parameters: {
    type: 'object',
    properties: {
      timeMin: { type: 'string', description: 'Start time (ISO 8601)' },
      timeMax: { type: 'string', description: 'End time (ISO 8601)' },
      maxResults: { type: 'number', description: 'Maximum events to return' }
    }
  }
}
```

## Reply Analysis for Calendar Events

The system can analyze reply emails to determine if a meeting time was accepted:

```typescript
async analyzeReplyForCalendarEvent(
  email: EmailMessage, 
  scheduledResponse: any
): Promise<{
  shouldCreateEvent: boolean;
  selectedTimeSlot?: { start: string; end: string };
  reason?: string;
}> {
  const prompt = `
You are analyzing a reply to a scheduled response that proposed meeting time slots.
Determine if this reply accepts one of the proposed time slots and if a calendar event should be created.

ORIGINAL PROPOSED TIME SLOTS:
${proposedSlots.map((slot, i) => `${i + 1}. ${slot.formatted}`).join('\n')}

REPLY EMAIL:
From: ${email.from}
Subject: ${email.subject}
Body: ${email.body}

Analyze if:
1. The reply explicitly or implicitly accepts one of the proposed time slots
2. Which specific time slot is being accepted (if any)
3. Whether a calendar event should be created
  `;
  
  // Returns structured analysis for calendar event creation
}
```

### Legacy Compatibility Methods

For backward compatibility, the system provides simplified analysis methods:

```typescript
// Simplified intent analysis
async analyzeEmailIntent(email: EmailMessage): Promise<{
  isDemoRequest: boolean;
  confidence: number;
  intentType: 'demo' | 'meeting' | 'call' | 'presentation' | 'unknown';
  urgency: 'low' | 'medium' | 'high';
  reasoning: string;
  keywords: string[];
}>;

## Error Handling and Reliability

### Retry Mechanism
```typescript
private async withRetry<T>(operation: () => Promise<T>): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === this.maxRetries) break;
      
      const delay = this.baseDelay * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error(`OpenAI MCP failed after ${this.maxRetries} attempts`);
}
```

### Tool Call Processing
The system handles AI tool calls sequentially and provides results back to the AI:

```typescript
if (message.tool_calls && message.tool_calls.length > 0) {
  const functionResults: any[] = [];
  
  for (const toolCall of message.tool_calls) {
    try {
      const args = JSON.parse(toolCall.function.arguments);
      let result: any;
      
      switch (toolCall.function.name) {
        case 'find_available_slots':
          result = await calendarService.find_available_slots(args);
          break;
        case 'create_calendar_event':
          result = await calendarService.create_calendar_event(args);
          break;
        // Handle other tool calls...
      }
      
      functionResults.push({ tool_call_id: toolCall.id, result });
    } catch (error) {
      functionResults.push({ tool_call_id: toolCall.id, error: error.message });
    }
  }
  
  // Provide results back to AI for final analysis
}
```

## Integration with Background Jobs

The email parsing system integrates with the background job system:

### Email Processing Job
```typescript
// EmailProcessingJob uses OpenAIService for analysis
const analysis = await openAIService.analyzeEmailAndSchedule(email);

if (analysis.isDemoRequest && analysis.confidence > 0.7) {
  // Create scheduled response with proposed time slots
  await scheduledResponseService.createResponse({
    emailRecordId: email.id,
    proposedTimeSlots: analysis.proposedTimeSlots,
    emailResponse: analysis.emailResponse,
    scheduledAt: new Date(Date.now() + 60000) // 1 minute delay
  });
}
```

### Response Processing
```typescript
// When replies are received, analyze for calendar event creation
const replyAnalysis = await openAIService.analyzeReplyForCalendarEvent(
  replyEmail, 
  originalScheduledResponse
);

if (replyAnalysis.shouldCreateEvent && replyAnalysis.selectedTimeSlot) {
  // Create calendar event using MCP
  await openAIService.createDemoEventWithAI(
    contactInfo,
    replyAnalysis.selectedTimeSlot
  );
}
```

## Configuration and Testing

### Service Configuration
```typescript
const openaiService = new OpenAIService();

// Test connection to both OpenAI and Calendar MCP
await openaiService.testConnection();

// Get usage information
const usage = await openaiService.getApiUsage();
console.log('OpenAI MCP Configuration:', {
  model: usage.model,
  maxRetries: usage.maxRetries,
  mcpToolsEnabled: usage.mcpToolsEnabled,
  calendarFunctionsAvailable: usage.calendarFunctionsAvailable
});
```

### Example Usage
```typescript
// Analyze email with full MCP integration
const email: EmailMessage = {
  subject: "Product Demo Request",
  from: "john@example.com",
  body: "Hi, I'm interested in seeing your product. Could we schedule a demo this week?"
};

const analysis = await openaiService.analyzeEmailAndSchedule(email);

console.log('Analysis Result:', {
  isDemoRequest: analysis.isDemoRequest,
  confidence: analysis.confidence,
  contactInfo: analysis.contactInfo,
  proposedSlots: analysis.proposedTimeSlots.length,
  emailResponse: analysis.emailResponse
});

// If positive reply received, create calendar event
if (replyIsPositive) {
  const event = await openaiService.createDemoEventWithAI(
    analysis.contactInfo,
    analysis.proposedTimeSlots[0] // Selected time slot
  );
}
```

The OpenAI MCP integration provides a comprehensive email parsing solution that combines AI analysis with direct calendar integration, eliminating the need for complex multi-step processing while maintaining high accuracy and reliability.