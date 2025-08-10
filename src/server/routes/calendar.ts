import { authService } from '@/services/AuthService';
import { calendarService } from '@/services/CalendarMCP';
import express from 'express';

const router = express.Router();

// Middleware to require authentication
async function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  try {
    const authStatus = await authService.getAuthStatus();
    if (!authStatus.isAuthenticated || !authStatus.hasValidToken) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please authenticate with Google to access calendar features'
      });
    }
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      error: 'Authentication error',
      message: 'Failed to verify authentication'
    });
  }
}

// Get upcoming calendar events (used by frontend dashboard)
router.get('/upcoming', requireAuth, async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const events = await calendarService.getEvents('primary', {
      timeMin: new Date(),
      timeMax: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
      orderBy: 'startTime'
    });
    
    res.json({
      success: true,
      events,
      totalEvents: events.length,
      daysAhead: days
    });
  } catch (error) {
    console.error('Calendar: Failed to get upcoming events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get upcoming events',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;