# Gmail Calendar Assistant

An AI-powered calendar assistant that monitors Gmail for demo requests and automatically responds with available meeting times by integrating with Google Calendar.

## 🚀 Features

- **Intelligent Email Monitoring**: Automatically detects demo requests and meeting inquiries
- **Natural Language Processing**: Uses AI to understand time preferences from email content
- **Smart Scheduling**: Finds optimal meeting times based on calendar availability and business rules
- **Automated Responses**: Sends professional email responses with meeting time suggestions
- **Real-time Dashboard**: Monitor system performance and email processing
- **Flexible Configuration**: Customize business rules, working hours, and response templates

## 🏗️ Architecture

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

## 🛠️ Tech Stack

### Backend
- **Node.js** + **TypeScript** - Runtime and language
- **Express.js** - Web framework
- **Google APIs** - Gmail and Calendar integration
- **OpenAI API** - Natural language processing
- **Jest** - Testing framework

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **React Hooks** - State management

## 📋 Prerequisites

- Node.js 18+ 
- Google Cloud Console account
- OpenAI API account
- Gmail account for monitoring

## 🚀 Quick Start

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd gmail-assistant
npm install
```

### 2. Environment Setup

Copy the environment template:
```bash
cp .env.example .env
```

Configure your `.env` file:
```env
# Google API Configuration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/callback

# OpenAI Configuration  
OPENAI_API_KEY=your_openai_api_key

# Server Configuration
PORT=3001
NODE_ENV=development

# Application Configuration
SALES_EMAIL=sales@yourcompany.com
SALES_NAME="Your Name"
COMPANY_NAME="Your Company"
DEFAULT_TIMEZONE=America/Los_Angeles
```

### 3. Google API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Gmail API and Google Calendar API
4. Create credentials (OAuth 2.0 Client IDs)
5. Add authorized redirect URIs: `http://localhost:3000/auth/callback`
6. Download credentials and update your `.env` file

### 4. Run the Application

Development mode:
```bash
npm run dev
```

This will start:
- Backend server on `http://localhost:3001`
- Frontend application on `http://localhost:3000`

### 5. Authentication

1. Navigate to `http://localhost:3000`
2. Click "Connect Google Account"
3. Complete OAuth flow for Gmail and Calendar access

## 📖 Usage

### Dashboard Overview
- **System Status**: Monitor API connections and system health
- **Email Metrics**: Track processed emails and response rates  
- **Recent Activity**: View real-time email processing feed
- **Performance Charts**: Visualize system performance over time

### Configuration
Access settings at `/settings` to configure:

- **Business Rules**: Working hours, buffer times, meeting duration
- **Email Templates**: Customize automated response messages
- **API Settings**: Update API credentials and configurations
- **Notification Preferences**: Set up alerts and monitoring

### Email Processing Flow

1. **Detection**: System monitors Gmail for new emails
2. **Analysis**: AI determines if email is a demo request
3. **Parsing**: Extracts time preferences and contact information
4. **Scheduling**: Finds optimal meeting times based on calendar availability
5. **Response**: Sends professional email with meeting time suggestions

## 🧪 Testing

Run the complete test suite:
```bash
npm test
```

Run tests with coverage:
```bash
npm run test:coverage
```

Run tests in watch mode:
```bash
npm run test:watch
```

### Test Structure
- **Unit Tests**: Individual component and service testing
- **Integration Tests**: API endpoint and service interaction testing
- **E2E Tests**: Complete workflow testing

## 🚦 Development

### Code Quality
- **ESLint**: Code linting and style enforcement
- **TypeScript**: Static type checking
- **Prettier**: Code formatting (add `.prettierrc` if desired)

Run linting:
```bash
npm run lint
npm run lint:fix
```

Type checking:
```bash
npm run typecheck
```

### Project Structure
```
gmail-assistant/
├── src/
│   ├── server/          # Express server setup
│   ├── services/        # Core business logic
│   ├── models/          # Data models
│   ├── utils/           # Utility functions
│   └── types/           # TypeScript definitions
├── frontend/
│   ├── src/
│   │   ├── app/         # Next.js App Router
│   │   ├── components/  # React components
│   │   ├── hooks/       # Custom React hooks
│   │   └── utils/       # Frontend utilities
├── tests/               # Test files
├── docs/                # Documentation
└── dist/                # Compiled output
```

## 📚 Documentation

Detailed documentation is available in the `/docs` folder:

- [Architecture Overview](docs/ARCHITECTURE.md)
- [API Integration Guide](docs/API_INTEGRATION.md)
- [Email Parsing Strategy](docs/EMAIL_PARSING_STRATEGY.md)
- [Scheduling Algorithm](docs/SCHEDULING_ALGORITHM.md)
- [Frontend Structure](docs/FRONTEND_STRUCTURE.md)

## 🔧 Configuration

### Business Rules
Configure in `.env` or through the settings UI:

```env
# Calendar Configuration
BUSINESS_HOURS_START=09:00
BUSINESS_HOURS_END=17:00
MEETING_DURATION_MINUTES=30
BUFFER_TIME_MINUTES=30
TRAVEL_BUFFER_TIME_MINUTES=60
```

### Email Templates
Customize response templates in the settings UI or by modifying the service configuration.

## 🚨 Troubleshooting

### Common Issues

1. **Google API Authentication Errors**
   - Verify credentials in Google Cloud Console
   - Check OAuth redirect URIs
   - Ensure APIs are enabled

2. **Email Not Being Detected**
   - Check Gmail API permissions
   - Verify email filters and keywords
   - Review AI processing logs

3. **Calendar Conflicts**
   - Confirm Calendar API access
   - Check calendar sharing settings
   - Verify timezone configurations

### Debug Logging
Set `NODE_ENV=development` for detailed logging:
```bash
DEBUG=gmail-assistant:* npm run dev
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Write tests for new features
- Update documentation as needed
- Follow the existing code style

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Google APIs for Gmail and Calendar integration
- OpenAI for natural language processing capabilities
- Next.js team for the excellent React framework
- All contributors and testers

## 📞 Support

For support, please:
1. Check the documentation in `/docs`
2. Search existing issues
3. Create a new issue with detailed reproduction steps

---

Built with ❤️ for automating sales demo scheduling