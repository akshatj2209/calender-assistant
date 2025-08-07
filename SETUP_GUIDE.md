# Setup Guide - Gmail Calendar Assistant

## 🔧 Manual Setup Steps (Do These First!)

### 1. Google Cloud Console Setup

#### Create Project & Enable APIs
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Project name: `Gmail Calendar Assistant`
4. Click "Create"

#### Enable Required APIs
1. Go to "APIs & Services" → "Library"
2. Search and enable these APIs:
   - **Gmail API** - For email monitoring and sending
   - **Google Calendar API** - For calendar management

#### Create OAuth 2.0 Credentials
1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. If prompted, configure OAuth consent screen:
   - User Type: External (for testing)
   - App name: `Gmail Calendar Assistant`
   - User support email: Your email
   - Developer contact: Your email
4. Application type: **Web application**
5. Name: `Gmail Calendar Assistant`
6. Authorized redirect URIs:
   ```
   http://localhost:3000/auth/callback
   http://localhost:3001/auth/callback
   ```
7. Click "Create"
8. **Download the JSON file** and save as `credentials.json` in project root

### 2. OpenAI API Setup

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up/Login
3. Go to "API Keys"
4. Click "Create new secret key"
5. Name: `Gmail Calendar Assistant`
6. Copy the API key (starts with `sk-`)

### 3. Database Setup (PostgreSQL)

**Choose one option:**

#### Option A: Docker (Recommended for Development)
1. Create `docker-compose.yml`:
   ```yaml
   version: '3.8'
   services:
     postgres:
       image: postgres:15-alpine
       container_name: gmail-assistant-db
       environment:
         POSTGRES_DB: gmail_assistant
         POSTGRES_USER: gmail_app
         POSTGRES_PASSWORD: dev_password_123
       ports:
         - "5432:5432"
       volumes:
         - postgres_data:/var/lib/postgresql/data
   volumes:
     postgres_data:
   ```

2. Start database:
   ```bash
   docker-compose up -d
   ```

#### Option B: Local PostgreSQL
1. Install PostgreSQL 13+
2. Create database:
   ```sql
   CREATE DATABASE gmail_assistant;
   CREATE USER gmail_app WITH PASSWORD 'secure_password';
   GRANT ALL PRIVILEGES ON DATABASE gmail_assistant TO gmail_app;
   ```

**📖 For detailed database setup, see [DATABASE_SETUP.md](docs/DATABASE_SETUP.md)**

### 4. Environment Configuration

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Update `.env` with your credentials:
   ```env
   # From Google Cloud Console credentials.json
   GOOGLE_CLIENT_ID=your_client_id_here
   GOOGLE_CLIENT_SECRET=your_client_secret_here
   GOOGLE_REDIRECT_URI=http://localhost:3000/auth/callback

   # From OpenAI Platform
   OPENAI_API_KEY=sk-your_openai_key_here

   # Database (choose based on setup above)
   # For Docker:
   DATABASE_URL="postgresql://gmail_app:dev_password_123@localhost:5432/gmail_assistant?schema=public"
   # For Local PostgreSQL:
   DATABASE_URL="postgresql://gmail_app:secure_password@localhost:5432/gmail_assistant?schema=public"

   # Your business details
   SALES_EMAIL=your-email@company.com
   SALES_NAME="Your Name"
   COMPANY_NAME="Your Company"
   DEFAULT_TIMEZONE=America/Los_Angeles
   ```

### 5. Install Dependencies & Setup Database

```bash
# Install all dependencies
npm install

# Setup database
npm run db:generate  # Generate Prisma client
npm run db:migrate   # Run database migrations
npm run db:seed      # Seed with initial data

# Verify database setup
npm run db:studio    # Open database GUI (optional)
```

## 🚀 Development Workflow

### Start Development Servers
```bash
# Start both backend and frontend
npm run dev

# Or start individually:
npm run dev:backend    # Backend on port 3001
npm run dev:frontend   # Frontend on port 3000
```

### First Run Authentication Flow
1. Open http://localhost:3000
2. Click "Connect Google Account"
3. Complete OAuth flow
4. Grant permissions for Gmail and Calendar

## 📋 Verification Checklist

### ✅ Google APIs Working
- [ ] OAuth flow completes successfully
- [ ] Can read Gmail messages
- [ ] Can read Calendar events
- [ ] Can send emails
- [ ] Can create calendar events

### ✅ OpenAI Integration
- [ ] Can analyze email content
- [ ] Can extract time preferences
- [ ] Error handling for API limits

### ✅ Basic Features
- [ ] Email monitoring starts
- [ ] Dashboard shows system status
- [ ] Configuration can be updated
- [ ] Test email gets processed

## 🔍 Troubleshooting

### Google API Issues
1. **"Invalid client" error**: Check client ID/secret in .env
2. **"Redirect URI mismatch"**: Verify redirect URI in Google Console
3. **"Access denied"**: Check API scopes and permissions
4. **"Quota exceeded"**: Check API usage limits in Google Console

### OpenAI API Issues
1. **"Invalid API key"**: Verify key format (starts with sk-)
2. **"Quota exceeded"**: Check usage limits in OpenAI dashboard
3. **"Model not found"**: Verify model name (use gpt-4 or gpt-3.5-turbo)

### Common Setup Issues
1. **Port conflicts**: Make sure ports 3000 and 3001 are free
2. **CORS errors**: Check frontend/backend URLs match
3. **Module not found**: Run `npm install` in correct directories
4. **TypeScript errors**: Run `npm run typecheck`

## 🔒 Security Notes

1. **Never commit credentials**:
   - credentials.json
   - .env file
   - token.json (generated after auth)

2. **Production setup**:
   - Use environment variables
   - Enable production OAuth consent screen
   - Set proper redirect URIs for your domain

3. **API Key management**:
   - Rotate keys regularly
   - Set usage limits
   - Monitor API usage

## 📞 Next Steps After Setup

1. Test basic authentication flow
2. Verify API connections
3. Run first email monitoring test
4. Configure business rules
5. Test end-to-end demo request flow