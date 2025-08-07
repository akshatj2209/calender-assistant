# Google OAuth Setup Guide

## 🚀 Quick Setup Steps

### 1. **Create Google Cloud Project**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **"New Project"**
3. Name: `Gmail Calendar Assistant`
4. Click **"Create"**

### 2. **Enable APIs**
1. Go to **APIs & Services** → **Library**
2. Search and enable:
   - **Gmail API**
   - **Google Calendar API**

### 3. **Configure OAuth Consent Screen**
1. Go to **APIs & Services** → **OAuth consent screen**
2. Choose **External** (for testing)
3. Fill required fields:
   - **App name**: `Gmail Calendar Assistant`
   - **User support email**: Your email
   - **Developer contact**: Your email
4. **Scopes** → Add:
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/calendar`
5. **Test users** → Add your Gmail address

### 4. **Create OAuth Credentials**
1. Go to **APIs & Services** → **Credentials**
2. Click **"+ CREATE CREDENTIALS"** → **OAuth 2.0 Client IDs**
3. **Application type**: Web application
4. **Name**: `Gmail Calendar Assistant`
5. **Authorized redirect URIs**:
   ```
   http://localhost:3001/api/auth/callback
   http://localhost:3000/auth/callback
   ```
6. Click **"Create"**
7. **Copy Client ID and Client Secret**

### 5. **Update Environment Variables**
Add to your `.env` file:
```env
GOOGLE_CLIENT_ID="your-client-id-here.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret-here"
GOOGLE_REDIRECT_URI="http://localhost:3001/api/auth/callback"
```

## 🔧 Important Notes
- Use **External** OAuth for development (can add test users)
- Add both localhost:3001 and localhost:3000 redirect URIs
- Gmail/Calendar scopes are required for the app to work
- Keep Client Secret secure (never commit to Git)

Your OAuth setup will be ready once you complete these steps! ✅