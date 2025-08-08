import { Request, Response } from 'express';
import { calendarRepository } from '@/database/repositories';
import { CalendarEventStatus } from '@prisma/client';
import { z } from 'zod';

const createEventSchema = z.object({
  userId: z.string(),
  emailRecordId: z.string().optional(),
  googleEventId: z.string(),
  calendarId: z.string().optional(),
  summary: z.string(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  timezone: z.string(),
  attendeeEmail: z.string().email(),
  attendeeName: z.string().optional()
});

const updateEventSchema = z.object({
  summary: z.string().optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  timezone: z.string().optional(),
  status: z.nativeEnum(CalendarEventStatus).optional(),
  attendeeName: z.string().optional()
});

const eventSearchSchema = z.object({
  userId: z.string().optional(),
  emailRecordId: z.string().optional(),
  attendeeEmail: z.string().email().optional(),
  status: z.nativeEnum(CalendarEventStatus).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional()
});

export class CalendarController {

  async getEvent(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const event = await calendarRepository.findById(id);
      if (!event) {
        res.status(404).json({
          success: false,
          error: 'Calendar event not found'
        });
        return;
      }

      res.json({
        success: true,
        event
      });
    } catch (error) {
      console.error('CalendarController.getEvent:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get calendar event',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getEventByGoogleId(req: Request, res: Response): Promise<void> {
    try {
      const { googleEventId } = req.params;
      const { calendarId = 'primary' } = req.query as Record<string, string>;
      
      const event = await calendarRepository.findByGoogleEventId(googleEventId, calendarId);
      if (!event) {
        res.status(404).json({
          success: false,
          error: 'Calendar event not found'
        });
        return;
      }

      res.json({
        success: true,
        event
      });
    } catch (error) {
      console.error('CalendarController.getEventByGoogleId:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get calendar event',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async createEvent(req: Request, res: Response): Promise<void> {
    try {
      const validation = createEventSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid input',
          details: validation.error.errors
        });
        return;
      }

      const data = {
        ...validation.data,
        startTime: new Date(validation.data.startTime),
        endTime: new Date(validation.data.endTime)
      };

      const event = await calendarRepository.create(data);

      res.status(201).json({
        success: true,
        event,
        message: 'Calendar event created successfully'
      });
    } catch (error) {
      console.error('CalendarController.createEvent:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create calendar event',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async updateEvent(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const validation = updateEventSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid input',
          details: validation.error.errors
        });
        return;
      }

      const updateData: any = { ...validation.data };
      if (validation.data.startTime) {
        updateData.startTime = new Date(validation.data.startTime);
      }
      if (validation.data.endTime) {
        updateData.endTime = new Date(validation.data.endTime);
      }

      const event = await calendarRepository.update(id, updateData);

      res.json({
        success: true,
        event,
        message: 'Calendar event updated successfully'
      });
    } catch (error) {
      console.error('CalendarController.updateEvent:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update calendar event',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async deleteEvent(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      await calendarRepository.delete(id);

      res.json({
        success: true,
        message: 'Calendar event deleted successfully'
      });
    } catch (error) {
      console.error('CalendarController.deleteEvent:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete calendar event',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async searchEvents(req: Request, res: Response): Promise<void> {
    try {
      const queryData = {
        ...req.query,
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        isDemo: req.query.isDemo === 'true' ? true : 
                req.query.isDemo === 'false' ? false : undefined
      };

      const validation = eventSearchSchema.safeParse(queryData);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid search parameters',
          details: validation.error.errors
        });
        return;
      }

      const options = {
        ...validation.data,
        startDate: validation.data.startDate ? new Date(validation.data.startDate) : undefined,
        endDate: validation.data.endDate ? new Date(validation.data.endDate) : undefined
      };

      const events = await calendarRepository.findMany(options);

      res.json({
        success: true,
        events,
        count: events.length,
        filters: options
      });
    } catch (error) {
      console.error('CalendarController.searchEvents:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to search calendar events',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getUpcomingEvents(req: Request, res: Response): Promise<void> {
    try {
      const { userId, days = '7' } = req.query as Record<string, string>;
      
      if (!userId) {
        res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
        return;
      }
      
      const events = await calendarRepository.findUpcomingEvents(
        userId, 
        parseInt(days)
      );

      res.json({
        success: true,
        events,
        count: events.length,
        daysAhead: parseInt(days)
      });
    } catch (error) {
      console.error('CalendarController.getUpcomingEvents:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get upcoming events',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }



  async cancelEvent(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const event = await calendarRepository.markEventCancelled(id);

      res.json({
        success: true,
        event,
        message: 'Event cancelled successfully'
      });
    } catch (error) {
      console.error('CalendarController.cancelEvent:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to cancel event',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async confirmEvent(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const event = await calendarRepository.markEventConfirmed(id);

      res.json({
        success: true,
        event,
        message: 'Event confirmed successfully'
      });
    } catch (error) {
      console.error('CalendarController.confirmEvent:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to confirm event',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getCalendarStats(req: Request, res: Response): Promise<void> {
    try {
      const { userId, days = '30' } = req.query as Record<string, string>;

      if (!userId) {
        res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
        return;
      }

      const stats = await calendarRepository.getCalendarStats(userId, parseInt(days));

      res.json({
        success: true,
        stats,
        period: parseInt(days)
      });
    } catch (error) {
      console.error('CalendarController.getCalendarStats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get calendar statistics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

}

export const calendarController = new CalendarController();