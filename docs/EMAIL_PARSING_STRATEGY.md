# Email Parsing and NLP Strategy

## Overview
The email parsing system combines rule-based filtering with AI-powered natural language processing to accurately identify demo requests and extract scheduling preferences from email content.

## Multi-Layer Processing Pipeline

### Layer 1: Pre-filtering (Rule-based)
**Purpose**: Quick elimination of non-relevant emails to reduce API costs

```typescript
interface PreFilterRules {
  subjectKeywords: string[];
  bodyKeywords: string[];
  senderDomainWhitelist?: string[];
  senderDomainBlacklist: string[];
  autoReplyDetection: boolean;
  minimumWordCount: number;
}

const preFilterRules: PreFilterRules = {
  subjectKeywords: [
    'demo', 'meeting', 'schedule', 'call', 'presentation', 
    'product tour', 'walkthrough', 'consultation', 'discuss'
  ],
  bodyKeywords: [
    'interested', 'would like', 'can we meet', 'show me',
    'learn more', 'see the product', 'book a', 'set up'
  ],
  senderDomainBlacklist: [
    'noreply', 'no-reply', 'donotreply', 'mailer-daemon',
    'postmaster', 'bounce', 'delivery-status'
  ],
  autoReplyDetection: true,
  minimumWordCount: 10
};
```

### Layer 2: Intent Classification (AI-powered)
**Purpose**: Determine if email is genuinely requesting a demo/meeting

```typescript
const intentClassificationPrompt = `
You are an AI assistant that analyzes business emails to identify demo requests.

Analyze the following email and determine if it's requesting a product demonstration, sales meeting, or similar business meeting.

Consider these factors:
- Explicit requests ("can we schedule a demo")
- Implicit interest ("would like to learn more")  
- Business context (B2B communication)
- Urgency indicators
- Previous relationship indicators

Email Content:
Subject: {subject}
From: {from}
Body: {body}

Respond with a JSON object:
{
  "isDemoRequest": boolean,
  "confidence": number (0-1),
  "intentType": "demo" | "meeting" | "call" | "presentation" | "unknown",
  "urgency": "low" | "medium" | "high",
  "reasoning": "brief explanation",
  "keywords": ["extracted", "relevant", "keywords"]
}
`;

interface IntentAnalysisResult {
  isDemoRequest: boolean;
  confidence: number;
  intentType: 'demo' | 'meeting' | 'call' | 'presentation' | 'unknown';
  urgency: 'low' | 'medium' | 'high';
  reasoning: string;
  keywords: string[];
}
```

### Layer 3: Time Preference Extraction (AI-powered)
**Purpose**: Extract specific timing preferences from natural language

```typescript
const timeExtractionPrompt = `
Extract time preferences from this email content. Be very specific about any mentioned dates, times, or preferences.

Email: {emailContent}

Current date: {currentDate}
Current timezone: {currentTimezone}

Extract and return JSON:
{
  "preferredDays": ["monday", "tuesday"] | null,
  "specificDates": ["2024-08-05", "2024-08-06"] | null,
  "preferredTimes": ["morning", "2pm", "after 3"] | null,
  "timeRange": "morning" | "afternoon" | "evening" | "flexible" | null,
  "duration": number | null, // minutes if mentioned
  "timezone": string | null, // if explicitly mentioned
  "urgency": "low" | "medium" | "high",
  "avoidTimes": ["early morning", "friday afternoon"] | null,
  "flexibility": "very_flexible" | "somewhat_flexible" | "specific_times",
  "businessDaysOnly": boolean,
  "reasoning": "brief explanation of extracted preferences"
}
`;

interface TimeExtractionResult {
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
```

### Layer 4: Contact Information Extraction
**Purpose**: Parse sender information and company context

```typescript
interface ContactExtraction {
  name: string;
  email: string;
  company?: string;
  jobTitle?: string;
  phoneNumber?: string;
  timezone?: string;
  linkedInProfile?: string;
}

const extractContactInfo = (email: EmailMessage): ContactExtraction => {
  // Parse "John Doe <john@company.com>" format
  const parseFromField = (from: string) => {
    const match = from.match(/^(.+?)\s*<(.+?)>$/);
    if (match) {
      return { name: match[1].trim(), email: match[2].trim() };
    }
    return { name: '', email: from.trim() };
  };

  // Extract company from email domain
  const extractCompanyFromDomain = (email: string): string | undefined => {
    const domain = email.split('@')[1];
    if (!domain) return undefined;
    
    const cleanDomain = domain
      .replace(/^(www\.|mail\.)/, '')
      .replace(/\.(com|org|net|io|co).*$/, '');
    
    return cleanDomain.charAt(0).toUpperCase() + cleanDomain.slice(1);
  };

  // Extract additional info from signature
  const extractFromSignature = (body: string) => {
    const signaturePatterns = {
      phone: /(\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4})/,
      jobTitle: /^(.+?)[\r\n].*@/m,
      linkedin: /(linkedin\.com\/in\/[\w-]+)/i
    };
    
    return {
      phoneNumber: body.match(signaturePatterns.phone)?.[0],
      linkedInProfile: body.match(signaturePatterns.linkedin)?.[0]
    };
  };

  const { name, email: emailAddr } = parseFromField(email.from);
  const signatureInfo = extractFromSignature(email.body);
  
  return {
    name: name || emailAddr.split('@')[0],
    email: emailAddr,
    company: extractCompanyFromDomain(emailAddr),
    ...signatureInfo
  };
};
```

## Fallback Mechanisms

### Rule-based Fallback
When AI processing fails or confidence is low:

```typescript
const ruleBasedIntent = {
  demoKeywords: [
    'demo', 'demonstration', 'product tour', 'walkthrough',
    'show me', 'can you show', 'see the product'
  ],
  meetingKeywords: [
    'meeting', 'call', 'chat', 'discuss', 'talk',
    'schedule', 'book', 'appointment'
  ],
  urgencyKeywords: {
    high: ['urgent', 'asap', 'immediately', 'today', 'this week'],
    medium: ['soon', 'next week', 'when possible'],
    low: ['eventually', 'sometime', 'no rush']
  },
  timeKeywords: {
    morning: ['morning', 'am', '9am', '10am', '11am'],
    afternoon: ['afternoon', 'pm', '1pm', '2pm', '3pm', '4pm'],
    evening: ['evening', '5pm', '6pm', 'after work']
  }
};

const fallbackIntentDetection = (email: EmailMessage): IntentAnalysisResult => {
  const content = `${email.subject} ${email.body}`.toLowerCase();
  
  const hasDemo = ruleBasedIntent.demoKeywords.some(k => content.includes(k));
  const hasMeeting = ruleBasedIntent.meetingKeywords.some(k => content.includes(k));
  const isDemoRequest = hasDemo || hasMeeting;
  
  // Determine urgency
  let urgency: 'low' | 'medium' | 'high' = 'medium';
  if (ruleBasedIntent.urgencyKeywords.high.some(k => content.includes(k))) {
    urgency = 'high';
  } else if (ruleBasedIntent.urgencyKeywords.low.some(k => content.includes(k))) {
    urgency = 'low';
  }
  
  return {
    isDemoRequest,
    confidence: isDemoRequest ? 0.6 : 0.2, // Lower confidence for rule-based
    intentType: hasDemo ? 'demo' : hasMeeting ? 'meeting' : 'unknown',
    urgency,
    reasoning: 'Rule-based fallback analysis',
    keywords: []
  };
};
```

## Time Parsing Algorithms

### Natural Language Time Processing
```typescript
const parseNaturalLanguageTimes = (text: string, referenceDate: Date): TimeSlot[] => {
  const timePatterns = {
    // Specific times: "2pm", "2:30", "14:00"
    specificTime: /(\d{1,2}):?(\d{2})?\s?(am|pm|AM|PM)?/g,
    
    // Days: "Monday", "next Tuesday", "this Friday"
    dayNames: /(next\s+|this\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/gi,
    
    // Relative dates: "tomorrow", "next week", "in 2 days"
    relativeDates: /(tomorrow|next week|this week|in \d+ days?)/gi,
    
    // Time ranges: "morning", "afternoon", "after 3pm"
    timeRanges: /(early\s+)?(morning|afternoon|evening)|(after|before)\s+\d{1,2}:?\d{0,2}\s?(am|pm)?/gi
  };
  
  const slots: TimeSlot[] = [];
  
  // Process each pattern and convert to concrete time slots
  // Implementation would use date-fns or similar library
  
  return slots;
};
```

### Business Hours Mapping
```typescript
const mapToBusinessHours = (preferences: TimeExtractionResult, businessRules: BusinessRules): TimeSlot[] => {
  const businessHours = {
    morning: { start: '09:00', end: '12:00' },
    afternoon: { start: '13:00', end: '17:00' },
    evening: { start: '17:00', end: '19:00' } // Extended for flexibility
  };
  
  const slots: TimeSlot[] = [];
  
  if (preferences.timeRange) {
    const range = businessHours[preferences.timeRange];
    if (range) {
      // Generate slots within the preferred time range
      // over the next 5 business days
    }
  }
  
  return slots;
};
```

## Quality Assurance

### Confidence Scoring
```typescript
const calculateOverallConfidence = (
  intentResult: IntentAnalysisResult,
  timeResult: TimeExtractionResult,
  contactQuality: number
): number => {
  const weights = {
    intent: 0.5,
    timeExtraction: 0.3,
    contactQuality: 0.2
  };
  
  const timeConfidence = timeResult.flexibility === 'specific_times' ? 0.9 :
                        timeResult.flexibility === 'somewhat_flexible' ? 0.7 : 0.5;
  
  return (
    intentResult.confidence * weights.intent +
    timeConfidence * weights.timeExtraction +
    contactQuality * weights.contactQuality
  );
};
```

### Validation Rules
```typescript
const validateParsedEmail = (parsed: ParsedEmail): string[] => {
  const errors: string[] = [];
  
  if (parsed.intent.confidence < 0.3) {
    errors.push('Low confidence in intent detection');
  }
  
  if (!parsed.contactInfo.email) {
    errors.push('Missing sender email address');
  }
  
  if (parsed.timePreferences.flexibility === 'specific_times' && 
      !parsed.timePreferences.specificDates && 
      !parsed.timePreferences.preferredDays) {
    errors.push('Claimed specific times but no concrete preferences found');
  }
  
  return errors;
};
```

## Error Handling & Monitoring

### Retry Logic for AI Calls
```typescript
const withAIRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 2
): Promise<T> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) {
        // Log error and fall back to rule-based approach
        console.error('AI processing failed, falling back to rules');
        throw error;
      }
      
      // Exponential backoff
      await new Promise(resolve => 
        setTimeout(resolve, Math.pow(2, attempt) * 1000)
      );
    }
  }
  throw new Error('All retries exhausted');
};
```

### Performance Monitoring
```typescript
interface ParsingMetrics {
  totalEmailsProcessed: number;
  aiSuccessRate: number;
  averageProcessingTime: number;
  fallbackUsageRate: number;
  intentAccuracy: number; // Would need human validation
}

const trackParsingPerformance = (
  startTime: number,
  usedFallback: boolean,
  confidence: number
): void => {
  const processingTime = Date.now() - startTime;
  
  // Update metrics
  metrics.totalEmailsProcessed++;
  metrics.averageProcessingTime = 
    (metrics.averageProcessingTime + processingTime) / 2;
  
  if (usedFallback) {
    metrics.fallbackUsageRate = 
      (metrics.fallbackUsageRate * (metrics.totalEmailsProcessed - 1) + 1) / 
      metrics.totalEmailsProcessed;
  }
};
```

This multi-layered approach ensures high accuracy while maintaining cost efficiency and providing reliable fallbacks when AI processing fails.