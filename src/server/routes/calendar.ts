import express from 'express';
import { calendarService } from '@/services/CalendarService';
import { authService } from '@/services/AuthService';
import { config } from '@/utils/config';

const router = express.Router();

// Middleware to check authentication
const requireAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const isAuthenticated = await authService.isAuthenticated();
    if (!isAuthenticated) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'Please authenticate with Google first'
      });
    }
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Authentication check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get calendar list
router.get('/calendars', requireAuth, async (req, res) => {
  try {
    const calendars = await calendarService.getCalendarList();
    
    res.json({
      success: true,
      calendars
    });
  } catch (error) {
    console.error('Calendar: Get calendars failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get calendar list',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get events from a calendar
router.get('/events', requireAuth, async (req, res) => {
  try {
    const {
      calendarId = 'primary',
      timeMin,
      timeMax,
      maxResults = '250',
      q: searchQuery
    } = req.query as Record<string, string>;

    const options: any = {
      maxResults: parseInt(maxResults)
    };

    if (timeMin) {
      options.timeMin = new Date(timeMin);
    }

    if (timeMax) {
      options.timeMax = new Date(timeMax);
    }

    if (searchQuery) {
      options.q = searchQuery;
    }

    const events = await calendarService.getEvents(calendarId, options);
    
    res.json({
      success: true,
      events,
      count: events.length
    });
  } catch (error) {
    console.error('Calendar: Get events failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get calendar events',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get specific event
router.get('/events/:eventId', requireAuth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { calendarId = 'primary' } = req.query as Record<string, string>;
    
    const event = await calendarService.getEvent(eventId, calendarId);
    
    res.json({
      success: true,
      event
    });
  } catch (error) {
    console.error(`Calendar: Get event ${req.params.eventId} failed:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to get calendar event',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Create new event
router.post('/events', requireAuth, async (req, res) => {
  try {
    const {
      summary,
      description,
      start,
      end,
      attendees,
      location,
      sendNotifications = true,
      calendarId = 'primary'
    } = req.body;

    if (!summary || !start || !end) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'summary, start, and end are required'
      });
    }

    const eventData = {
      summary,
      description,
      start: {
        dateTime: start.dateTime || start,
        timezone: start.timezone || config.businessRules.timezone
      },
      end: {
        dateTime: end.dateTime || end,
        timezone: end.timezone || config.businessRules.timezone
      },
      attendees: attendees || [],
      location,
      sendNotifications
    };

    const event = await calendarService.createEvent(eventData, calendarId);
    
    res.json({
      success: true,
      event,
      message: 'Event created successfully'
    });
  } catch (error) {
    console.error('Calendar: Create event failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create calendar event',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Update existing event
router.put('/events/:eventId', requireAuth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { calendarId = 'primary', ...updateData } = req.body;

    const event = await calendarService.updateEvent(eventId, updateData, calendarId);
    
    res.json({
      success: true,
      event,
      message: 'Event updated successfully'
    });
  } catch (error) {
    console.error(`Calendar: Update event ${req.params.eventId} failed:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to update calendar event',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Delete event
router.delete('/events/:eventId', requireAuth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { calendarId = 'primary' } = req.query as Record<string, string>;

    await calendarService.deleteEvent(eventId, calendarId);
    
    res.json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    console.error(`Calendar: Delete event ${req.params.eventId} failed:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete calendar event',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get free/busy information
router.post('/freebusy', requireAuth, async (req, res) => {
  try {
    const {
      calendars = ['primary'],
      timeMin,
      timeMax
    } = req.body;

    if (!timeMin || !timeMax) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'timeMin and timeMax are required'
      });
    }

    const freeBusy = await calendarService.getFreeBusy(
      calendars,
      new Date(timeMin),
      new Date(timeMax)
    );
    
    res.json({
      success: true,
      freeBusy
    });
  } catch (error) {
    console.error('Calendar: Get free/busy failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get free/busy information',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Find available time slots
router.post('/find-slots', requireAuth, async (req, res) => {
  try {
    const {
      duration = config.businessRules.meetingDuration,
      timeMin,
      timeMax,
      calendarIds = ['primary'],
      businessHours = config.businessRules.businessHours,
      workingDays = config.businessRules.workingDays
    } = req.body;

    if (!timeMin || !timeMax) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'timeMin and timeMax are required'
      });
    }

    const availableSlots = await calendarService.findAvailableSlots(
      duration,
      new Date(timeMin),
      new Date(timeMax),
      calendarIds,
      businessHours,
      workingDays
    );
    
    res.json({
      success: true,
      availableSlots,
      count: availableSlots.length,
      parameters: {
        duration,
        businessHours,
        workingDays
      }
    });
  } catch (error) {
    console.error('Calendar: Find available slots failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to find available time slots',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Create demo event
router.post('/create-demo', requireAuth, async (req, res) => {
  try {
    const {
      attendeeEmail,
      attendeeName,
      timeSlot,
      description,
      calendarId = 'primary'
    } = req.body;

    if (!attendeeEmail || !attendeeName || !timeSlot) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'attendeeEmail, attendeeName, and timeSlot are required'
      });
    }

    const event = await calendarService.createDemoEvent(
      attendeeEmail,
      attendeeName,
      {
        start: new Date(timeSlot.start),
        end: new Date(timeSlot.end),
        timezone: timeSlot.timezone || config.businessRules.timezone
      },
      description
    );
    
    res.json({
      success: true,
      event,
      message: 'Demo event created successfully'
    });
  } catch (error) {
    console.error('Calendar: Create demo event failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create demo event',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get upcoming events
router.get('/upcoming', requireAuth, async (req, res) => {
  try {
    const {
      days = '7',
      calendarId = 'primary'
    } = req.query as Record<string, string>;

    const events = await calendarService.getUpcomingEvents(parseInt(days), calendarId);
    
    res.json({
      success: true,
      events,
      count: events.length,
      daysAhead: parseInt(days)
    });
  } catch (error) {
    console.error('Calendar: Get upcoming events failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get upcoming events',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get today's events
router.get('/today', requireAuth, async (req, res) => {
  try {
    const { calendarId = 'primary' } = req.query as Record<string, string>;
    const events = await calendarService.getTodaysEvents(calendarId);
    
    res.json({
      success: true,
      events,
      count: events.length,
      date: new Date().toISOString().split('T')[0]
    });
  } catch (error) {
    console.error('Calendar: Get today\'s events failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get today\'s events',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Search events
router.get('/search', requireAuth, async (req, res) => {
  try {
    const {
      q: query,
      calendarId = 'primary'
    } = req.query as Record<string, string>;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Search query required',
        message: 'Please provide a search query (q parameter)'
      });
    }

    const events = await calendarService.searchEvents(query, calendarId);
    
    res.json({
      success: true,
      events,
      count: events.length,
      query
    });
  } catch (error) {
    console.error('Calendar: Search events failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search events',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Test calendar connection
router.get('/test', requireAuth, async (req, res) => {
  try {
    const testResult = await calendarService.testConnection();
    
    res.json({
      success: testResult.success,
      service: 'Google Calendar API',
      ...(testResult.error && { error: testResult.error })
    });
  } catch (error) {
    console.error('Calendar: Connection test failed:', error);
    res.status(500).json({
      success: false,
      service: 'Google Calendar API',
      error: 'Connection test failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get calendar information
router.get('/info', requireAuth, async (req, res) => {
  try {
    const { calendarId = 'primary' } = req.query as Record<string, string>;
    const info = await calendarService.getCalendarInfo(calendarId);
    
    res.json({
      success: true,
      info
    });
  } catch (error) {
    console.error('Calendar: Get info failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get calendar information',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get API usage stats
router.get('/usage', requireAuth, async (req, res) => {
  try {
    const usage = await calendarService.getApiUsage();
    
    res.json({
      success: true,
      usage
    });
  } catch (error) {
    console.error('Calendar: Get usage failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get API usage',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;