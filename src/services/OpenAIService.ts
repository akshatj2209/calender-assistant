import { ContactInfo, EmailMessage } from '@/types';
import { config } from '@/utils/config';
import OpenAI from 'openai';
import { calendarService } from './CalendarMCP';

export interface MCPAnalysisResult {
  isDemoRequest: boolean;
  confidence: number;
  contactInfo: ContactInfo;
  proposedTimeSlots: Array<{
    start: string;
    end: string;
    formatted: string;
  }>;
  emailResponse: string;
  reasoning: string;
}

/**
 * OpenAI service with MCP-style function calling for calendar integration
 * AI can directly call calendar functions to find available slots and create events
 */
export class OpenAIService {
  private client: OpenAI;
  private readonly maxRetries = 3;
  private readonly baseDelay = 1000;

  constructor() {
    this.client = new OpenAI({
      apiKey: config.openai.apiKey,
    });
  }

  private async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (attempt === this.maxRetries) {
          break;
        }

        const delay = this.baseDelay * Math.pow(2, attempt - 1);
        console.log(`OpenAI MCP: Attempt ${attempt} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    console.error('OpenAI MCP: All retry attempts failed:', lastError);
    throw new Error(`OpenAI MCP failed after ${this.maxRetries} attempts: ${lastError?.message}`);
  }

  /**
   * Analyze email and use MCP tools to find available slots and generate response
   * AI directly calls calendar functions to check real availability
   */
  async analyzeEmailAndSchedule(email: EmailMessage): Promise<MCPAnalysisResult> {
    const currentDate = new Date().toISOString().split('T')[0];
    const searchEndDate = new Date();
    searchEndDate.setDate(searchEndDate.getDate() + 7); // Search next 7 days

    const tools = calendarService.getMCPTools();

    const prompt = `
You are an AI sales assistant that helps schedule product demos. Analyze this email and use calendar tools to find available time slots if it's a demo request.

Email Details:
Subject: ${email.subject}
From: ${email.from}
Body: ${email.body}

Current date: ${currentDate}

Your tasks:
1. Determine if this is a demo request (confidence 0.0-1.0)
2. Extract contact information (name, email, company)
3. If it's a demo request, use calendar tools to find 2-3 available time slots in the next 5 business days
4. Generate a professional email response with the available times

Steps:
- Only call calendar functions if this appears to be a demo request (confidence > 0.7)
- Look for time preferences in the email (morning/afternoon, specific days)
- Use find_available_slots to get real calendar availability
- Respect business hours (9 AM - 5 PM) and working days (Mon-Fri)
- Propose 30-minute demo slots
- VERY IMPORTANT: The demo slots should never be consecutive. You should propose them as for convenience of the user. maybe like 2 slots on 1 day and 1 slot on other day and scatter them will even on the same day. It SHOULD NOT BE LIKE 1 slot on 1 PM and the other on 1:30 PM. If travelling is needed as per intent, always propose slots somewhat later in the start and each should be on different day

Respond with a JSON object:
{
  "isDemoRequest": boolean,
  "confidence": number (0.0-1.0),
  "contactInfo": {
    "name": "extracted name",
    "email": "email address",
    "company": "company name if found"
  },
  "proposedTimeSlots": [
    {
      "start": "ISO datetime",
      "end": "ISO datetime",
      "formatted": "human readable time"
    }
  ],
  "emailResponse": "professional email response text",
  "reasoning": "explanation of analysis and slot selection"
}
    `;

    return this.withRetry(async () => {
      const response = await this.client.chat.completions.create({
        model: config.openai.model,
        messages: [{ role: 'user', content: prompt }],
        tools: tools,
        tool_choice: 'auto',
        temperature: 0.1,
        max_tokens: 2000,
      });

      const message = response.choices[0]?.message;
      if (!message) {
        throw new Error('No response from OpenAI MCP');
      }

      // Handle function calls if AI decided to use calendar tools
      if (message.tool_calls && message.tool_calls.length > 0) {
        console.log(`OpenAI MCP: AI is calling ${message.tool_calls.length} calendar tools`);
        
        const functionResults: any[] = [];

        for (const toolCall of message.tool_calls) {
          console.log(`OpenAI MCP: Calling ${toolCall.function.name}`);
          
          try {
            const args = JSON.parse(toolCall.function.arguments);
            let result: any;

            switch (toolCall.function.name) {
              case 'find_available_slots':
                result = await calendarService.find_available_slots(args);
                break;
              case 'get_calendar_events':
                result = await calendarService.get_calendar_events(args);
                break;
              case 'create_calendar_event':
                result = await calendarService.create_calendar_event(args);
                break;
              default:
                throw new Error(`Unknown function: ${toolCall.function.name}`);
            }

            functionResults.push({
              tool_call_id: toolCall.id,
              result: result,
            });

            console.log(`OpenAI MCP: ${toolCall.function.name} returned ${Array.isArray(result) ? result.length : 1} items`);
          } catch (error) {
            console.error(`OpenAI MCP: Error calling ${toolCall.function.name}:`, error);
            functionResults.push({
              tool_call_id: toolCall.id,
              error: `Failed to call ${toolCall.function.name}: ${error}`,
            });
          }
        }

        // Send function results back to AI for final response generation
        const messagesWithFunctions = [
          { role: 'user' as const, content: prompt },
          message,
          ...functionResults.map(result => ({
            role: 'tool' as const,
            tool_call_id: result.tool_call_id,
            content: result.error || JSON.stringify(result.result),
          })),
          {
            role: 'user' as const,
            content: 'Based on the calendar information, provide your final analysis and response as JSON.',
          },
        ];

        const finalResponse = await this.client.chat.completions.create({
          model: config.openai.model,
          messages: messagesWithFunctions,
          temperature: 0.1,
          max_tokens: 1500,
          response_format: { type: 'json_object' },
        });

        const finalContent = finalResponse.choices[0]?.message?.content;
        if (!finalContent) {
          throw new Error('No final response content from OpenAI MCP');
        }

        try {
          const result = JSON.parse(finalContent) as MCPAnalysisResult;
          console.log(`OpenAI MCP: Analysis complete. Demo request: ${result.isDemoRequest}, Slots: ${result.proposedTimeSlots.length}`);
          return result;
        } catch (parseError) {
          console.error('OpenAI MCP: Failed to parse final JSON response:', finalContent);
          throw new Error('Invalid JSON response from OpenAI MCP analysis');
        }
      } else {
        // No tool calls - AI determined it's not a demo request or doesn't need calendar data
        const content = message.content;
        if (!content) {
          throw new Error('No response content from OpenAI MCP');
        }

        try {
          const result = JSON.parse(content) as MCPAnalysisResult;
          console.log(`OpenAI MCP: Analysis complete without calendar tools. Demo request: ${result.isDemoRequest}`);
          return result;
        } catch (parseError) {
          console.error('OpenAI MCP: Failed to parse JSON response:', content);
          throw new Error('Invalid JSON response from OpenAI MCP analysis');
        }
      }
    });
  }

  /**
   * Let AI autonomously create calendar events using MCP tools
   */
  async createDemoEventWithAI(
    contactInfo: ContactInfo,
    selectedTimeSlot: { start: string; end: string },
    customDescription?: string
  ): Promise<any> {
    const tools = calendarService.getMCPTools();

    const prompt = `
Create a calendar event for a product demo meeting.

Contact Information:
- Name: ${contactInfo.name}
- Email: ${contactInfo.email}
- Company: ${contactInfo.company || 'N/A'}

Selected Time Slot:
- Start: ${selectedTimeSlot.start}
- End: ${selectedTimeSlot.end}

Please create a professional demo meeting event with:
- Appropriate title including the person's name
- Professional description mentioning it's a product demonstration
- Include the attendee's email
- Add a meeting location (online/Google Meet)

Use the create_calendar_event function to create this meeting.
    `;

    return this.withRetry(async () => {
      const response = await this.client.chat.completions.create({
        model: config.openai.model,
        messages: [{ role: 'user', content: prompt }],
        tools: tools.filter(tool => tool.function.name === 'create_calendar_event'),
        tool_choice: { type: 'function', function: { name: 'create_calendar_event' } },
        temperature: 0.1,
        max_tokens: 1000,
      });

      const message = response.choices[0]?.message;
      if (!message?.tool_calls) {
        throw new Error('AI did not call create_calendar_event function');
      }

      const toolCall = message.tool_calls[0];
      const args = JSON.parse(toolCall.function.arguments);
      
      console.log('OpenAI MCP: AI creating calendar event:', args.summary);
      
      const result = await calendarService.create_calendar_event(args);
      
      console.log('OpenAI MCP: Calendar event created successfully:', result.id);
      return result;
    });
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      // Test both OpenAI and calendar MCP service
      const openaiTest = await this.client.chat.completions.create({
        model: config.openai.model,
        messages: [{ role: 'user', content: 'Hello, this is a test.' }],
        max_tokens: 10,
      });

      const calendarTest = await calendarService.testConnection();
      
      if (!calendarTest.success) {
        return calendarTest;
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Legacy method: Analyze email intent (for backward compatibility)
   */
  async analyzeEmailIntent(email: EmailMessage): Promise<{
    isDemoRequest: boolean;
    confidence: number;
    intentType: 'demo' | 'meeting' | 'call' | 'presentation' | 'unknown';
    urgency: 'low' | 'medium' | 'high';
    reasoning: string;
    keywords: string[];
  }> {
    // Use the MCP analysis but return only the intent part
    const mcpResult = await this.analyzeEmailAndSchedule(email);
    
    return {
      isDemoRequest: mcpResult.isDemoRequest,
      confidence: mcpResult.confidence,
      intentType: 'demo', // Since MCP focuses on demo requests
      urgency: 'medium', // Default value
      reasoning: mcpResult.reasoning,
      keywords: [], // Not provided by MCP analysis
    };
  }

  /**
   * Legacy method: Analyze reply for positive response (for backward compatibility)
   */
  async analyzeReplyForPositiveResponse(
    replyEmail: EmailMessage, 
    originalProposedSlots: any[]
  ): Promise<{
    isPositive: boolean;
    confidence: number;
    reasoning: string;
    selectedTimeSlot?: number;
    customTimeProposed?: {
      dateTime: Date;
      timeText: string;
      confidence: number;
    };
  }> {
    const proposedSlotsText = originalProposedSlots
      .map((slot, index) => `Slot ${index + 1}: ${slot.formatted || new Date(slot.start).toLocaleString()}`)
      .join('\n');

    const prompt = `
Analyze this email reply to determine if it's a positive response to a demo/meeting request.

Original Proposed Time Slots:
${proposedSlotsText}

Reply Email:
Subject: ${replyEmail.subject}
From: ${replyEmail.from}
Body: ${replyEmail.body}

Analyze for:
1. Is this a POSITIVE response (accepting/agreeing to the meeting)?
2. Did they select one of the proposed time slots?
3. Did they propose their own alternative time/date?
4. Extract any specific date/time they mentioned

Look for positive indicators:
- "Yes", "sounds good", "works for me", "perfect", "great"
- Selecting a specific time slot ("slot 1", "first option", "option 2")
- Confirming availability ("I'm available", "that works")
- Enthusiasm ("looking forward", "excited")

Look for negative indicators:
- "No", "not available", "can't make it", "won't work"
- Declining the meeting explicitly
- Out of office or automated replies
- Requesting to reschedule without proposing times

Respond with JSON only:
{
  "isPositive": boolean,
  "confidence": number (0.0-1.0),
  "reasoning": "brief explanation of decision",
  "selectedTimeSlot": number or null (1-based index if they selected a slot),
  "customTimeProposed": {
    "dateTime": "ISO string if found",
    "timeText": "exact text mentioning the time",
    "confidence": number (0.0-1.0)
  } or null
}
    `.trim();

    return this.withRetry(async () => {
      const response = await this.client.chat.completions.create({
        model: config.openai.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 600,
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response content from OpenAI MCP');
      }

      try {
        const parsed = JSON.parse(content);
        
        // Convert customTimeProposed.dateTime to Date object if present
        if (parsed.customTimeProposed?.dateTime) {
          try {
            parsed.customTimeProposed.dateTime = new Date(parsed.customTimeProposed.dateTime);
          } catch (dateError) {
            console.warn('OpenAI MCP: Invalid date format in custom time proposal:', parsed.customTimeProposed.dateTime);
            parsed.customTimeProposed = null;
          }
        }
        
        return parsed;
      } catch (parseError) {
        console.error('OpenAI MCP: Failed to parse reply analysis response:', content);
        throw new Error('Invalid JSON response from OpenAI MCP reply analysis');
      }
    });
  }

  async analyzeReplyForCalendarEvent(email: EmailMessage, scheduledResponse: any): Promise<{
    shouldCreateEvent: boolean;
    selectedTimeSlot?: { start: string; end: string };
    reason?: string;
  }> {
    try {
      const proposedSlots = scheduledResponse.proposedTimeSlots as Array<{
        start: string;
        end: string;
        formatted: string;
      }>;

      const prompt = `
You are analyzing a reply to a scheduled response that proposed meeting time slots. 
Determine if this reply accepts one of the proposed time slots and if a calendar event should be created.

ORIGINAL PROPOSED TIME SLOTS:
${proposedSlots.map((slot, i) => `${i + 1}. ${slot.formatted} (${slot.start} to ${slot.end})`).join('\n')}

REPLY EMAIL:
From: ${email.from}
Subject: ${email.subject}
Body: ${email.body}

Please analyze if:
1. The reply explicitly or implicitly accepts one of the proposed time slots
2. Which specific time slot is being accepted (if any)
3. Whether a calendar event should be created

Respond in this exact JSON format:
{
  "shouldCreateEvent": boolean,
  "selectedTimeSlot": { "start": "ISO_DATE", "end": "ISO_DATE" } or null,
  "reason": "explanation of your decision"
}
`;

      const response = await this.withRetry(async () => {
        return this.client.chat.completions.create({
          model: config.openai.model,
          messages: [
            {
              role: 'system',
              content: 'You are an AI assistant that analyzes email replies to determine if calendar events should be created based on accepted meeting time slots. Always respond with valid JSON.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 500,
          response_format: { type: 'json_object' }
        });
      });

      const content = response.choices[0]?.message?.content?.trim();
      if (!content) {
        throw new Error('No response content from OpenAI');
      }

      // Parse JSON response
      let analysis;
      try {
        analysis = JSON.parse(content);
      } catch (parseError) {
        console.error('OpenAI MCP: Failed to parse analysis JSON:', content);
        return {
          shouldCreateEvent: false,
          reason: 'Failed to parse AI analysis'
        };
      }

      console.log('OpenAI MCP: Reply analysis result:', analysis);
      return analysis;

    } catch (error) {
      console.error('OpenAI MCP: Error analyzing reply for calendar event:', error);
      return {
        shouldCreateEvent: false,
        reason: `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async getApiUsage(): Promise<any> {
    return {
      model: config.openai.model,
      maxRetries: this.maxRetries,
      baseDelay: this.baseDelay,
      mcpToolsEnabled: true,
      calendarFunctionsAvailable: calendarService.getMCPTools().length,
    };
  }
}

// Export singleton instance
export const openaiService = new OpenAIService();

