import { config, tokenPath } from '@/utils/config';
import { promises as fs } from 'fs';
import { google } from 'googleapis';

export interface GoogleAuthTokens {
  access_token?: string;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  expiry_date?: number;
}

export class AuthService {
  private oauth2Client: any;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      config.google.clientId,
      config.google.clientSecret,
      config.google.redirectUri
    );
  }

  async initialize(): Promise<void> {
    try {
      // Try to load existing token
      const token = await this.loadSavedToken();
      if (token) {
        this.oauth2Client.setCredentials(token);
        console.log('Authentication: Loaded saved credentials');
      }
    } catch (error) {
      console.log('Authentication: No saved credentials found, will need to authenticate');
    }
  }

  async loadSavedToken(): Promise<GoogleAuthTokens | null> {
    try {
      const tokenData = await fs.readFile(tokenPath, 'utf8');
      return JSON.parse(tokenData);
    } catch (error) {
      return null;
    }
  }

  async saveToken(tokens: GoogleAuthTokens): Promise<void> {
    try {
      await fs.writeFile(tokenPath, JSON.stringify(tokens, null, 2));
      console.log('Authentication: Token saved to', tokenPath);
    } catch (error) {
      console.error('Authentication: Failed to save token:', error);
      throw error;
    }
  }

  getAuthUrl(scopes: string[] = []): string {
    const defaultScopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      'openid'
    ];

    const allScopes = [...defaultScopes, ...scopes];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: allScopes,
      prompt: 'consent' // Force consent screen to get refresh token
    });
  }

  async handleAuthCallback(code: string): Promise<{ tokens: GoogleAuthTokens; user: any }> {
    try {
      console.log('🔄 Exchanging authorization code for tokens...');
      const { tokens } = await this.oauth2Client.getToken(code);
      
      if (!tokens.access_token) {
        throw new Error('No access token received from Google');
      }
      
      console.log('✅ Got tokens from Google');
      
      // Set credentials for this session
      this.oauth2Client.setCredentials(tokens);
      
      // Get user info from Google's userinfo API
      console.log('🔄 Getting user info from Google API...');
      
      let userInfo;
      try {
        // Use the People API to get user information
        const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
        const userInfoResponse = await oauth2.userinfo.get();
        userInfo = userInfoResponse.data;
        console.log('✅ Got user info from Google API:', userInfo.email);
      } catch (error) {
        console.error('❌ Failed to get user info from Google API:', error);
        throw new Error('Failed to get user information from Google');
      }
      
      if (!userInfo || !userInfo.email) {
        throw new Error('No email found in user info');
      }
      
      // Use the user info from Google API
      console.log('Authentication: Using user info for:', userInfo.email);
      
      // Create or update user in database
      const userRepository = await import('@/database/repositories/UserRepository');
      const userRepo = new userRepository.UserRepository();
      
      let user;
      try {
        // Try to find existing user
        user = await userRepo.findByEmail(userInfo.email);
        if (user) {
          console.log('Authentication: Found existing user');
        } else {
          // Create new user if not found
          user = await userRepo.create({
            email: userInfo.email,
            name: userInfo.name || userInfo.given_name || userInfo.email
          });
          console.log('Authentication: Created new user');
        }
      } catch (error) {
        console.error('Authentication: Error during user lookup/creation:', error);
        throw new Error('Failed to handle user authentication');
      }
      
      // Ensure user is properly defined
      if (!user || !user.id) {
        throw new Error('Failed to create or retrieve user');
      }
      
      // Store Google tokens for this user
      const tokenRepository = await import('@/database/repositories');
      const prisma = (await import('@/database/connection')).default;
      
      await prisma.googleTokens.upsert({
        where: { userId: user.id },
        update: {
          accessToken: tokens.access_token!,
          refreshToken: tokens.refresh_token || undefined,
          expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
          scope: Array.isArray(tokens.scope) ? tokens.scope.join(' ') : tokens.scope || null
        },
        create: {
          userId: user.id,
          accessToken: tokens.access_token!,
          refreshToken: tokens.refresh_token || undefined,
          expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
          scope: Array.isArray(tokens.scope) ? tokens.scope.join(' ') : tokens.scope || null
        }
      });
      
      // Save tokens for file-based access (backward compatibility)
      await this.saveToken(tokens);
      
      console.log('Authentication: Successfully authenticated and saved tokens for user:', user.email);
      return { tokens, user: { ...user, googleUserInfo: userInfo } };
    } catch (error) {
      console.error('Authentication: Failed to exchange code for tokens:', error);
      throw new Error('Failed to complete authentication');
    }
  }

  async refreshToken(): Promise<GoogleAuthTokens> {
    try {
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      
      // Update stored credentials
      this.oauth2Client.setCredentials(credentials);
      
      // Save updated tokens
      await this.saveToken(credentials);
      
      console.log('Authentication: Successfully refreshed access token');
      return credentials;
    } catch (error) {
      console.error('Authentication: Failed to refresh token:', error);
      throw new Error('Failed to refresh authentication token');
    }
  }

  async ensureValidToken(): Promise<boolean> {
    try {
      // Check if we have credentials
      const credentials = this.oauth2Client.credentials;
      if (!credentials || !credentials.access_token) {
        console.log('Authentication: No access token available');
        return false;
      }

      // Check if token is expired or about to expire (within 5 minutes)
      const expiryDate = credentials.expiry_date;
      const now = new Date().getTime();
      const fiveMinutesFromNow = now + (5 * 60 * 1000);

      if (expiryDate && expiryDate <= fiveMinutesFromNow) {
        console.log('Authentication: Token expired or about to expire, refreshing...');
        
        if (credentials.refresh_token) {
          await this.refreshToken();
          return true;
        } else {
          console.log('Authentication: No refresh token available, need to re-authenticate');
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Authentication: Failed to ensure valid token:', error);
      return false;
    }
  }

  getAuthenticatedClient() {
    return this.oauth2Client;
  }

  async isAuthenticated(): Promise<boolean> {
    try {
      const credentials = this.oauth2Client.credentials;
      if (!credentials || !credentials.access_token) {
        return false;
      }

      // Try to make a simple API call to test authentication
      const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
      await gmail.users.getProfile({ userId: 'me' });
      
      return true;
    } catch (error) {
      console.log('Authentication: Token validation failed:', error);
      return false;
    }
  }

  async revokeToken(): Promise<void> {
    try {
      const credentials = this.oauth2Client.credentials;
      if (credentials && credentials.access_token) {
        await this.oauth2Client.revokeToken(credentials.access_token);
      }
      
      // Clear stored credentials
      this.oauth2Client.setCredentials({});
      
      // Remove saved token file
      try {
        await fs.unlink(tokenPath);
        console.log('Authentication: Token file removed');
      } catch (error) {
        // File might not exist, which is okay
      }
      
      console.log('Authentication: Successfully revoked token');
    } catch (error) {
      console.error('Authentication: Failed to revoke token:', error);
      throw error;
    }
  }

  async getTokenInfo(): Promise<any> {
    try {
      const credentials = this.oauth2Client.credentials;
      if (!credentials || !credentials.access_token) {
        return null;
      }

      // Get token info from Google
      const response = await fetch(
        `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${credentials.access_token}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to get token info');
      }

      return await response.json();
    } catch (error) {
      console.error('Authentication: Failed to get token info:', error);
      return null;
    }
  }

  // Utility method to check specific scopes
  async hasRequiredScopes(requiredScopes: string[]): Promise<boolean> {
    try {
      const tokenInfo = await this.getTokenInfo();
      if (!tokenInfo || !tokenInfo.scope) {
        return false;
      }

      const availableScopes = tokenInfo.scope.split(' ');
      return requiredScopes.every(scope => availableScopes.includes(scope));
    } catch (error) {
      console.error('Authentication: Failed to check scopes:', error);
      return false;
    }
  }

  // Get current authentication status
  async getAuthStatus(): Promise<{
    isAuthenticated: boolean;
    hasValidToken: boolean;
    tokenExpiry?: Date;
    scopes?: string[];
    userEmail?: string;
  }> {
    try {
      const isAuth = await this.isAuthenticated();
      const hasValid = await this.ensureValidToken();
      const credentials = this.oauth2Client.credentials;
      
      let tokenExpiry: Date | undefined;
      let scopes: string[] = [];
      let userEmail: string | undefined;
      
      if (credentials && credentials.expiry_date) {
        tokenExpiry = new Date(credentials.expiry_date);
      }
      
      if (isAuth) {
        const tokenInfo = await this.getTokenInfo();
        if (tokenInfo) {
          scopes = tokenInfo.scope ? tokenInfo.scope.split(' ') : [];
          userEmail = tokenInfo.email;
        }
      }
      
      return {
        isAuthenticated: isAuth,
        hasValidToken: hasValid,
        tokenExpiry,
        scopes,
        userEmail
      };
    } catch (error) {
      console.error('Authentication: Failed to get auth status:', error);
      return {
        isAuthenticated: false,
        hasValidToken: false
      };
    }
  }
}

// Export singleton instance
export const authService = new AuthService();