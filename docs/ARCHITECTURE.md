# Gmail Calendar Assistant - System Architecture

## Overview
This system is designed to automatically monitor Gmail for demo requests and respond with available meeting times by integrating with Google Calendar. The architecture follows a microservices pattern with clear separation of concerns.

## High-Level Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API    │    │  External APIs  │
│   (Next.js)     │◄──►│   (Express.js)   │◄──►│                 │
│                 │    │                  │    │  • Gmail API    │
│  • Dashboard    │    │  • Email Monitor │    │  • Calendar API │
│  • Config UI    │    │  • Scheduler     │    │  • OpenAI API   │
│  • Status View  │    │  • Responder     │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Core Components

### 1. Email Monitoring Service (`EmailMonitor`)
- **Purpose**: Continuously monitors Gmail for new demo request emails
- **Responsibilities**:
  - Poll Gmail API for new messages
  - Filter emails based on content and intent
  - Extract email metadata and content
- **Key Methods**:
  - `startMonitoring()`: Begin email polling
  - `processNewEmails()`: Handle new emails
  - `isValidDemoRequest()`: Filter logic

### 2. Email Parsing Service (`EmailParser`)
- **Purpose**: Parse email content to extract scheduling preferences
- **Responsibilities**:
  - Use NLP to understand time preferences
  - Extract contact information
  - Identify urgency and context
- **Key Methods**:
  - `parseEmail()`: Extract structured data from email
  - `extractTimePreferences()`: Identify preferred meeting times
  - `detectIntent()`: Confirm this is a demo request

### 3. Calendar Service (`CalendarService`)
- **Purpose**: Interface with Google Calendar API
- **Responsibilities**:
  - Fetch existing calendar events
  - Check availability
  - Create new calendar events
- **Key Methods**:
  - `getAvailability()`: Find free time slots
  - `createEvent()`: Schedule new meeting
  - `checkConflicts()`: Avoid double-booking

### 4. Scheduling Engine (`SchedulingEngine`)
- **Purpose**: Core business logic for finding optimal meeting times
- **Responsibilities**:
  - Apply business rules (business hours, buffers)
  - Find 2-3 optimal time slots
  - Consider travel time and preferences
- **Key Methods**:
  - `findAvailableSlots()`: Main scheduling algorithm
  - `applyBusinessRules()`: Filter by constraints
  - `rankTimeSlots()`: Prioritize suggestions

### 5. Email Response Service (`EmailResponder`)
- **Purpose**: Generate and send response emails
- **Responsibilities**:
  - Generate professional email responses
  - Include suggested meeting times
  - Send via Gmail API
- **Key Methods**:
  - `generateResponse()`: Create email content
  - `sendResponse()`: Send via Gmail API
  - `createCalendarInvite()`: Generate invite link

### 6. Configuration Manager (`ConfigManager`)
- **Purpose**: Manage application settings and preferences
- **Responsibilities**:
  - Load environment variables
  - Validate configuration
  - Provide runtime settings
- **Key Methods**:
  - `loadConfig()`: Initialize settings
  - `validateConfig()`: Ensure valid setup
  - `getBusinessHours()`: Return work schedule

## Data Flow

```
1. Email arrives → EmailMonitor detects new message
2. EmailParser extracts intent & preferences  
3. CalendarService fetches current availability
4. SchedulingEngine finds optimal time slots
5. EmailResponder generates and sends reply
6. CalendarService creates pending event (optional)
```

## Technology Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Testing**: Jest
- **API Integration**: Google APIs Client Library

### Frontend  
- **Framework**: Next.js 14
- **Language**: TypeScript + React
- **Styling**: Tailwind CSS
- **State Management**: React hooks + Context

### External Services
- **Gmail API**: Email monitoring and sending
- **Google Calendar API**: Calendar management
- **OpenAI API**: Natural language processing
- **MCP (Model Context Protocol)**: Enhanced AI integration

## Security Considerations

1. **OAuth 2.0**: Secure Google API authentication
2. **Environment Variables**: Sensitive data protection
3. **Input Validation**: Email content sanitization
4. **Rate Limiting**: API usage protection
5. **Error Handling**: Graceful failure management

## Scalability Considerations

1. **Modular Design**: Independent service components
2. **Queue System**: Future message queue integration
3. **Database Ready**: Easy persistence layer addition
4. **Caching**: Response caching for common patterns
5. **Multi-tenant**: Support for multiple users/orgs

## Business Rules

1. **Business Hours**: 9 AM - 5 PM local time only
2. **Meeting Duration**: 30 minutes standard
3. **Buffer Time**: 30 minutes between meetings (60 for travel)
4. **Look-ahead**: 5 business days maximum
5. **Suggestions**: Always provide 2-3 options
6. **Time Zones**: Automatic detection and conversion