import OpenAI from 'openai';
import { config } from '@/utils/config';
import { EmailMessage, EmailIntent, TimePreference, ContactInfo } from '@/types';

export interface IntentAnalysisResult {
  isDemoRequest: boolean;
  confidence: number;
  intentType: 'demo' | 'meeting' | 'call' | 'presentation' | 'unknown';
  urgency: 'low' | 'medium' | 'high';
  reasoning: string;
  keywords: string[];
}

export interface TimeExtractionResult {
  preferredDays?: string[];
  specificDates?: string[];
  preferredTimes?: string[];
  timeRange?: 'morning' | 'afternoon' | 'evening' | 'flexible';
  duration?: number;
  timezone?: string;
  urgency: 'low' | 'medium' | 'high';
  avoidTimes?: string[];
  flexibility: 'very_flexible' | 'somewhat_flexible' | 'specific_times';
  businessDaysOnly: boolean;
  reasoning: string;
}

export interface ResponseGenerationOptions {
  recipientName: string;
  proposedTimes: Date[];
  companyName?: string;
  senderName?: string;
  isReply?: boolean;
}

export class OpenAIService {
  private client: OpenAI;
  private readonly maxRetries = 3;
  private readonly baseDelay = 1000; // 1 second

  constructor() {
    this.client = new OpenAI({
      apiKey: config.openai.apiKey
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

        // Exponential backoff
        const delay = this.baseDelay * Math.pow(2, attempt - 1);
        console.log(`OpenAI: Attempt ${attempt} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    console.error('OpenAI: All retry attempts failed:', lastError);
    throw new Error(`OpenAI API failed after ${this.maxRetries} attempts: ${lastError?.message}`);
  }

  async analyzeEmailIntent(email: EmailMessage): Promise<IntentAnalysisResult> {
    const prompt = `
You are an AI assistant that analyzes business emails to identify demo requests and sales inquiries.

Analyze the following email and determine if it's requesting a product demonstration, sales meeting, or similar business meeting.

Consider these factors:
- Explicit requests ("can we schedule a demo", "interested in a meeting")
- Implicit interest ("would like to learn more", "tell me about your product")
- Business context and professional language
- Urgency indicators ("urgent", "asap", "this week")
- Intent strength and clarity

Email Details:
Subject: ${email.subject}
From: ${email.from}
Body: ${email.body}

Respond with a JSON object only:
{
  "isDemoRequest": boolean,
  "confidence": number (0.0-1.0),
  "intentType": "demo" | "meeting" | "call" | "presentation" | "unknown",
  "urgency": "low" | "medium" | "high", 
  "reasoning": "brief explanation of decision",
  "keywords": ["key", "phrases", "found"]
}
    `.trim();

    return this.withRetry(async () => {
      const response = await this.client.chat.completions.create({
        model: config.openai.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 500,
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response content from OpenAI');
      }

      try {
        return JSON.parse(content) as IntentAnalysisResult;
      } catch (parseError) {
        console.error('OpenAI: Failed to parse JSON response:', content);
        throw new Error('Invalid JSON response from OpenAI');
      }
    });
  }

  async extractTimePreferences(email: EmailMessage): Promise<TimeExtractionResult> {
    const currentDate = new Date().toISOString().split('T')[0];
    const currentTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const prompt = `
Extract time preferences and scheduling information from this email content.

Current date: ${currentDate}
Current timezone: ${currentTimezone}

Email Content:
Subject: ${email.subject}
Body: ${email.body}

Analyze and extract:
- Specific days mentioned (monday, tuesday, etc.)
- Specific dates (if any concrete dates mentioned)
- Time preferences (morning, afternoon, specific times)
- Duration if mentioned
- Timezone if explicitly stated
- Urgency level based on language
- Times/days to avoid if mentioned
- Overall scheduling flexibility

Respond with JSON only:
{
  "preferredDays": ["monday", "tuesday"] or null,
  "specificDates": ["2024-08-05"] or null,
  "preferredTimes": ["morning", "2pm"] or null,
  "timeRange": "morning" | "afternoon" | "evening" | "flexible" or null,
  "duration": number (minutes) or null,
  "timezone": "timezone_name" or null,
  "urgency": "low" | "medium" | "high",
  "avoidTimes": ["early morning"] or null,
  "flexibility": "very_flexible" | "somewhat_flexible" | "specific_times",
  "businessDaysOnly": boolean,
  "reasoning": "brief explanation of extracted preferences"
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
        throw new Error('No response content from OpenAI');
      }

      try {
        return JSON.parse(content) as TimeExtractionResult;
      } catch (parseError) {
        console.error('OpenAI: Failed to parse JSON response:', content);
        throw new Error('Invalid JSON response from OpenAI');
      }
    });
  }

  async generateEmailResponse(options: ResponseGenerationOptions): Promise<string> {
    const { recipientName, proposedTimes, companyName, senderName, isReply } = options;

    const timeFormatter = new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short'
    });

    const formattedTimes = proposedTimes
      .map((time, index) => `${index + 1}. ${timeFormatter.format(time)}`)
      .join('\n');

    const prompt = `
Generate a professional, friendly email response for scheduling a product demo.

Context:
- Recipient: ${recipientName}
- Company: ${companyName || 'our company'}
- Sender: ${senderName || 'Sales Team'}
- This is ${isReply ? 'a reply to' : 'an initial response to'} a demo request
- Proposed meeting times:
${formattedTimes}

Requirements:
- Professional but warm tone
- Thank them for their interest
- Present the time options clearly
- Ask them to confirm which works best
- Mention you'll send a calendar invite
- Keep it concise (under 150 words)
- Include a brief closing about looking forward to the demo

Generate only the email body text (no subject line, no signature block).
    `.trim();

    return this.withRetry(async () => {
      const response = await this.client.chat.completions.create({
        model: config.openai.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 400
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response content from OpenAI');
      }

      return content.trim();
    });
  }

  async extractContactInfo(email: EmailMessage): Promise<ContactInfo> {
    const prompt = `
Extract contact information from this email.

Email:
From: ${email.from}
Subject: ${email.subject}
Body: ${email.body}

Extract and clean up:
- Person's name (from sender info or signature)
- Email address
- Company name (from email domain or signature)
- Phone number (if mentioned in signature)
- Job title (if mentioned)

Respond with JSON only:
{
  "name": "clean name",
  "email": "email@domain.com",
  "company": "Company Name" or null,
  "phoneNumber": "+1234567890" or null,
  "jobTitle": "Title" or null
}
    `.trim();

    return this.withRetry(async () => {
      const response = await this.client.chat.completions.create({
        model: config.openai.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 300,
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response content from OpenAI');
      }

      try {
        const parsed = JSON.parse(content);
        return {
          name: parsed.name || email.from.split('@')[0],
          email: parsed.email || email.from,
          company: parsed.company,
          phoneNumber: parsed.phoneNumber
        } as ContactInfo;
      } catch (parseError) {
        console.error('OpenAI: Failed to parse contact info:', content);
        // Fallback to basic extraction
        return {
          name: email.from.split('@')[0],
          email: email.from
        } as ContactInfo;
      }
    });
  }

  async improveEmailResponse(originalResponse: string, context: string): Promise<string> {
    const prompt = `
Improve this email response to make it more professional and engaging.

Original response:
${originalResponse}

Context: ${context}

Requirements:
- Keep the same information and structure
- Make it more personable and professional
- Ensure proper grammar and punctuation
- Maintain appropriate business tone
- Keep it concise

Return only the improved email text.
    `.trim();

    return this.withRetry(async () => {
      const response = await this.client.chat.completions.create({
        model: config.openai.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 500
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response content from OpenAI');
      }

      return content.trim();
    });
  }

  async classifyEmailType(email: EmailMessage): Promise<{
    type: 'demo_request' | 'followup' | 'question' | 'complaint' | 'other';
    confidence: number;
    shouldRespond: boolean;
  }> {
    const prompt = `
Classify this business email and determine if it needs an automated response.

Email:
Subject: ${email.subject}
From: ${email.from}
Body: ${email.body}

Classify as:
- demo_request: Requesting product demo or sales meeting
- followup: Following up on previous conversation
- question: Asking specific questions about product/service
- complaint: Expressing dissatisfaction or issues
- other: General inquiry or other type

Also determine if this email should receive an automated response from a sales assistant.

Respond with JSON only:
{
  "type": "demo_request" | "followup" | "question" | "complaint" | "other",
  "confidence": number (0.0-1.0),
  "shouldRespond": boolean
}
    `.trim();

    return this.withRetry(async () => {
      const response = await this.client.chat.completions.create({
        model: config.openai.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 200,
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response content from OpenAI');
      }

      try {
        return JSON.parse(content);
      } catch (parseError) {
        console.error('OpenAI: Failed to parse classification response:', content);
        // Return safe fallback
        return {
          type: 'other' as const,
          confidence: 0.1,
          shouldRespond: false
        };
      }
    });
  }

  // Test connection to OpenAI API
  async testConnection(): Promise<{ success: boolean; error?: string; model?: string }> {
    try {
      const response = await this.client.chat.completions.create({
        model: config.openai.model,
        messages: [{ role: 'user', content: 'Hello, this is a test message.' }],
        max_tokens: 10,
        temperature: 0
      });

      return { 
        success: true, 
        model: response.model 
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Get current API usage information (if available)
  async getApiUsage(): Promise<any> {
    // OpenAI doesn't provide usage info through the API directly
    // This would typically be monitored through their dashboard
    return {
      model: config.openai.model,
      maxRetries: this.maxRetries,
      baseDelay: this.baseDelay
    };
  }
}

// Export singleton instance
export const openaiService = new OpenAIService();