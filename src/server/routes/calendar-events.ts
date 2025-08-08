import express from 'express';
import { calendarController } from '@/controllers/CalendarController';

const router = express.Router();

// Calendar statistics (used by frontend)
router.get('/stats', calendarController.getCalendarStats.bind(calendarController));

// Upcoming events
router.get('/upcoming', calendarController.getUpcomingEvents.bind(calendarController));

// CRUD operations for calendar events
router.get('/:id', calendarController.getEvent.bind(calendarController));
router.post('/', calendarController.createEvent.bind(calendarController));
router.put('/:id', calendarController.updateEvent.bind(calendarController));
router.delete('/:id', calendarController.deleteEvent.bind(calendarController));

// Event management
router.post('/:id/cancel', calendarController.cancelEvent.bind(calendarController));
router.post('/:id/confirm', calendarController.confirmEvent.bind(calendarController));

// Search events (must be after specific routes)
router.get('/', calendarController.searchEvents.bind(calendarController));

export default router;