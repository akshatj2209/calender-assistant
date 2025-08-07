import { authService } from '@/services/AuthService';
import express from 'express';

const router = express.Router();

// Get OAuth authorization URL
router.get('/url', async (req, res) => {
  try {
    const scopes = req.query.scopes as string[] | undefined;
    const authUrl = authService.getAuthUrl(scopes);
    
    res.json({
      success: true,
      authUrl,
      message: 'Visit this URL to authorize the application'
    });
  } catch (error) {
    console.error('Auth: Failed to generate auth URL:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate authorization URL',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Handle OAuth callback (GET - from Google redirect)
router.get('/callback', async (req, res) => {
  try {
    const { code, error, state } = req.query;
    
    if (error) {
      console.error('OAuth error:', error);
      return res.redirect(`http://localhost:3000/auth/callback?error=${encodeURIComponent(error as string)}`);
    }

    if (!code) {
      return res.redirect(`http://localhost:3000/auth/callback?error=${encodeURIComponent('Missing authorization code')}`);
    }

    console.log('🔄 Processing OAuth callback with code...');
    const result = await authService.handleAuthCallback(code as string);
    
    console.log('✅ OAuth callback successful:', result.user?.email);
    
    // Redirect to frontend with success
    const params = new URLSearchParams({
      success: 'true',
      userId: result.user?.id || '',
      email: result.user?.email || ''
    });
    
    res.redirect(`http://localhost:3000/auth/callback?${params}`);
    
  } catch (error) {
    console.error('❌ Auth callback failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
    res.redirect(`http://localhost:3000/auth/callback?error=${encodeURIComponent(errorMessage)}`);
  }
});

// Handle OAuth callback (POST - from frontend)
router.post('/callback', async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Missing authorization code',
        message: 'Authorization code is required'
      });
    }

    const result = await authService.handleAuthCallback(code);
    
    res.json({
      success: true,
      message: 'Authentication successful',
      user: result.user,
      tokens: {
        hasAccessToken: !!result.tokens.access_token,
        hasRefreshToken: !!result.tokens.refresh_token,
        expiresAt: result.tokens.expiry_date ? new Date(result.tokens.expiry_date) : null
      }
    });
  } catch (error) {
    console.error('Auth: Callback failed:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get authentication status
router.get('/status', async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (userId) {
      // Check specific user authentication status
      const userRepository = await import('@/database/repositories/UserRepository');
      const userRepo = new userRepository.UserRepository();
      
      const user = await userRepo.findById(userId as string);
      if (!user) {
        return res.status(404).json({
          success: false,
          authenticated: false,
          error: 'User not found'
        });
      }
      
      // Check if user has valid Google tokens
      const hasValidTokens = !!(user.googleTokens && user.googleTokens.accessToken);
      
      res.json({
        success: true,
        authenticated: true,
        hasValidTokens,
        user: {
          id: (user as any).id,
          email: (user as any).email,
          name: (user as any).name || null
        }
      });
    } else {
      // Check current AuthService status (legacy)
      const status = await authService.getAuthStatus();
      
      res.json({
        success: true,
        status
      });
    }
  } catch (error) {
    console.error('Auth: Failed to get status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get authentication status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Refresh access token
router.post('/refresh', async (req, res) => {
  try {
    const tokens = await authService.refreshToken();
    
    res.json({
      success: true,
      message: 'Token refreshed successfully',
      tokens: {
        hasAccessToken: !!tokens.access_token,
        hasRefreshToken: !!tokens.refresh_token,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null
      }
    });
  } catch (error) {
    console.error('Auth: Token refresh failed:', error);
    res.status(500).json({
      success: false,
      error: 'Token refresh failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Revoke authentication
router.post('/revoke', async (req, res) => {
  try {
    await authService.revokeToken();
    
    res.json({
      success: true,
      message: 'Authentication revoked successfully'
    });
  } catch (error) {
    console.error('Auth: Token revocation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Token revocation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Check specific scopes
router.post('/check-scopes', async (req, res) => {
  try {
    const { scopes } = req.body;
    
    if (!Array.isArray(scopes)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid scopes format',
        message: 'Scopes must be an array of strings'
      });
    }

    const hasScopes = await authService.hasRequiredScopes(scopes);
    
    res.json({
      success: true,
      hasRequiredScopes: hasScopes,
      requestedScopes: scopes
    });
  } catch (error) {
    console.error('Auth: Scope check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Scope check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get token information
router.get('/token-info', async (req, res) => {
  try {
    const tokenInfo = await authService.getTokenInfo();
    
    if (!tokenInfo) {
      return res.status(401).json({
        success: false,
        error: 'No valid token found',
        message: 'Please authenticate first'
      });
    }

    res.json({
      success: true,
      tokenInfo: {
        email: tokenInfo.email,
        scope: tokenInfo.scope,
        expiresIn: tokenInfo.expires_in,
        audience: tokenInfo.audience
      }
    });
  } catch (error) {
    console.error('Auth: Failed to get token info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get token information',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;