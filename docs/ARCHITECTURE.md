# Gmail Calendar Assistant - System Architecture

## Overview
This system is designed to automatically monitor Gmail for demo requests and respond with available meeting times by integrating with Google Calendar. The architecture uses a modern Express.js backend with Prisma ORM, Next.js frontend, and background job processing.

## High-Level Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API    │    │  External APIs  │
│   (Next.js)     │◄──►│   (Express.js)   │◄──►│                 │
│                 │    │                  │    │  • Gmail API    │
│  • Dashboard    │    │  • Controllers   │    │  • Calendar API │
│  • Config UI    │    │  • Services      │    │  • OpenAI API   │
│  • Email List   │    │  • Background    │    │  • Calendar MCP │
│  • Calendar     │    │    Jobs          │    │                 │
└─────────────────┘    └──────┬───────────┘    └─────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │   Database Layer   │
                    │   (PostgreSQL)     │
                    │                    │
                    │  • Prisma ORM      │
                    │  • User Config     │
                    │  • Email Records   │
                    │  • Calendar Events │
                    │  • Scheduled       │
                    │    Responses       │
                    └────────────────────┘
```

## Core Components

### 1. Controllers (`src/controllers/`)
- **EmailController**: Handles email-related API endpoints
  - Email statistics, job triggering, email search
- **CalendarController**: Manages calendar events
  - CRUD operations, event statistics, upcoming events  
- **UserController**: User management
  - User creation, updates, find-or-create operations

### 2. Services (`src/services/`)
- **GmailService**: Interface with Gmail API
  - Fetch messages, send responses, OAuth handling
- **OpenAIService**: AI-powered email analysis
  - Intent detection, time preference extraction
- **CalendarMCP**: Calendar integration via MCP protocol
  - Calendar availability, event creation
- **AuthService**: Authentication management
  - Google OAuth flow, token management

### 3. Background Jobs (`src/jobs/`)
- **EmailProcessingJob**: Processes incoming emails
  - Monitors Gmail, analyzes content with AI
  - Updates database with processing results
- **ResponseSenderJob**: Sends scheduled responses
  - Monitors scheduled responses, sends via Gmail
  - Updates response status after sending

### 4. Database Layer (`src/database/`)
- **Prisma ORM**: Type-safe database operations
- **Repository Pattern**: Clean data access layer
  - UserRepository, EmailRepository, CalendarRepository
- **Connection Management**: Database connection pooling

### 5. Frontend Components (`frontend/src/`)
- **Dashboard**: Real-time overview of system activity
- **Email Management**: View and manage processed emails
- **Calendar View**: Display upcoming calendar events
- **User Configuration**: Manage business hours and preferences

## Data Flow

```
1. Email arrives in Gmail → Background EmailProcessingJob detects via API
2. OpenAIService analyzes email content for demo intent
3. Email record created/updated in database with analysis results
4. If demo request detected → ScheduledResponse created with time slots
5. ResponseSenderJob monitors scheduled responses
6. When ready → Gmail API sends response with available times
7. Frontend displays real-time statistics and email processing status
```

## Technology Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Background Jobs**: Node.js cron-based job system
- **Authentication**: Google OAuth 2.0
- **API Integration**: Google APIs Client Library

### Frontend  
- **Framework**: Next.js 14
- **Language**: TypeScript + React
- **Styling**: Tailwind CSS
- **Components**: Custom UI components
- **API Client**: Custom useApi hook

### Database
- **Database**: PostgreSQL
- **ORM**: Prisma with type-safe queries
- **Migrations**: Prisma migrate system
- **Schema**: User config, email records, calendar events, scheduled responses

### External Services
- **Gmail API**: Email monitoring and sending
- **Google Calendar API**: Calendar event management  
- **OpenAI API**: Email intent analysis and NLP
- **Calendar MCP**: Enhanced calendar integration via Model Context Protocol

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