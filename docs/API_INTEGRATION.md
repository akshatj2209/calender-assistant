# API Integration Strategy

## Google APIs Integration

### Gmail API Integration
**Purpose**: Monitor incoming emails and send responses

#### Authentication Flow
1. **OAuth 2.0 Setup**:
   - Client credentials from Google Cloud Console
   - Scopes: `gmail.readonly`, `gmail.send`, `gmail.modify`
   - Local auth for development, service account for production

#### Key Operations
```typescript
// Monitor for new emails
const listMessages = async (query: string) => {
  const response = await gmail.users.messages.list({
    userId: 'me',
    q: query, // e.g., "is:unread subject:(demo OR meeting OR schedule)"
  });
  return response.data.messages;
};

// Get email content
const getMessage = async (messageId: string) => {
  const response = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'full',
  });
  return response.data;
};

// Send response email
const sendMessage = async (message: GmailMessage) => {
  const response = await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: Buffer.from(message).toString('base64url'),
    },
  });
  return response.data;
};
```

#### Email Filtering Strategy
- **Subject Keywords**: "demo", "meeting", "schedule", "call", "presentation"
- **Content Keywords**: "interested", "would like to", "can we meet"
- **Sender Validation**: External domains only (not internal emails)
- **Time Sensitivity**: Exclude auto-replies and bounces

### Google Calendar API Integration
**Purpose**: Check availability and create calendar events

#### Key Operations
```typescript
// Get calendar events for availability checking
const getEvents = async (timeMin: string, timeMax: string) => {
  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin,
    timeMax,
    singleEvents: true,
    orderBy: 'startTime',
  });
  return response.data.items;
};

// Create new calendar event
const createEvent = async (event: calendar_v3.Schema$Event) => {
  const response = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: event,
  });
  return response.data;
};

// Check for conflicts
const getFreeBusy = async (items: string[], timeMin: string, timeMax: string) => {
  const response = await calendar.freebusy.query({
    requestBody: {
      timeMin,
      timeMax,
      items: items.map(id => ({ id })),
    },
  });
  return response.data;
};
```

## OpenAI API Integration
**Purpose**: Natural language processing for email content

### Email Intent Detection
```typescript
const detectDemoIntent = async (emailContent: string): Promise<boolean> => {
  const prompt = `
    Analyze this email and determine if it's requesting a product demo or sales meeting.
    Return only "true" or "false".
    
    Email: ${emailContent}
  `;
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.1,
  });
  
  return response.choices[0].message.content?.toLowerCase() === 'true';
};
```

### Time Preference Extraction
```typescript
interface TimePreference {
  preferredDays?: string[];
  preferredTimes?: string[];
  timeRange?: 'morning' | 'afternoon' | 'evening';
  urgency?: 'low' | 'medium' | 'high';
  timezone?: string;
}

const extractTimePreferences = async (emailContent: string): Promise<TimePreference> => {
  const prompt = `
    Extract time preferences from this email. Return JSON with:
    {
      "preferredDays": ["monday", "tuesday"], // if mentioned
      "preferredTimes": ["2pm", "afternoon"], // if mentioned  
      "timeRange": "morning|afternoon|evening", // inferred
      "urgency": "low|medium|high", // based on language
      "timezone": "America/New_York" // if mentioned
    }
    
    Email: ${emailContent}
  `;
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.1,
  });
  
  return JSON.parse(response.choices[0].message.content || '{}');
};
```

## MCP Integration Strategy
**Purpose**: Enhanced context and memory for AI operations

### MCP Server Configuration
```typescript
// MCP server for Gmail operations
const gmailMcpServer = {
  name: 'gmail-mcp',
  version: '1.0.0',
  tools: [
    {
      name: 'read_emails',
      description: 'Read and analyze Gmail messages',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          maxResults: { type: 'number' }
        }
      }
    },
    {
      name: 'send_email',
      description: 'Send email responses',
      inputSchema: {
        type: 'object', 
        properties: {
          to: { type: 'string' },
          subject: { type: 'string' },
          body: { type: 'string' }
        }
      }
    }
  ]
};

// MCP server for Calendar operations  
const calendarMcpServer = {
  name: 'calendar-mcp',
  version: '1.0.0',
  tools: [
    {
      name: 'check_availability',
      description: 'Check calendar availability',
      inputSchema: {
        type: 'object',
        properties: {
          startDate: { type: 'string' },
          endDate: { type: 'string' },
          duration: { type: 'number' }
        }
      }
    },
    {
      name: 'create_event',
      description: 'Create calendar events',
      inputSchema: {
        type: 'object',
        properties: {
          summary: { type: 'string' },
          start: { type: 'object' },
          end: { type: 'object' },
          attendees: { type: 'array' }
        }
      }
    }
  ]
};
```

## Error Handling Strategy

### API Rate Limiting
- **Gmail API**: 1 billion quota units/day, 250 quota units/user/second
- **Calendar API**: 1 million requests/day, 100 requests/100 seconds/user
- **OpenAI API**: Based on tier, implement exponential backoff

### Retry Logic
```typescript
const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      
      const delay = baseDelay * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
};
```

### Fallback Mechanisms
1. **Gmail API Failure**: Log error, continue monitoring
2. **Calendar API Failure**: Use cached availability, warn user
3. **OpenAI API Failure**: Use rule-based parsing fallback
4. **Network Issues**: Implement offline queue for pending responses

## Security & Authentication

### Google API Security
- Store credentials securely (environment variables)
- Implement token refresh logic
- Use least privilege principle for scopes
- Validate all input data

### OpenAI API Security  
- Secure API key storage
- Input sanitization to prevent prompt injection
- Rate limiting to prevent abuse
- Monitor usage and costs

## Performance Optimization

### Caching Strategy
- Cache calendar availability for 5-minute intervals
- Cache email parsing results for duplicate content
- Cache OpenAI responses for similar requests

### Batch Operations
- Process multiple emails in single API calls where possible
- Batch calendar availability checks
- Combine multiple OpenAI requests when feasible