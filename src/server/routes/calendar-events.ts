import express from 'express';
import { calendarController } from '@/controllers/CalendarController';

const router = express.Router();

// IMPORTANT: Specific routes must come BEFORE parameterized routes
// Otherwise /:id will match everything

// Get upcoming events
router.get('/upcoming', calendarController.getUpcomingEvents.bind(calendarController));

// Get demo events
router.get('/demo-events', calendarController.getDemoEvents.bind(calendarController));

// Get events by attendee email
router.get('/attendee/:email', calendarController.getEventsByAttendee.bind(calendarController));

// Get events in time range
router.get('/time-range', calendarController.getEventsInTimeRange.bind(calendarController));

// Calendar statistics
router.get('/stats', calendarController.getCalendarStats.bind(calendarController));

// Get event by Google event ID
router.get('/google/:googleEventId', calendarController.getEventByGoogleId.bind(calendarController));

// Search events with filters (must be before /:id)
router.get('/', calendarController.searchEvents.bind(calendarController));

// Create new event
router.post('/', calendarController.createEvent.bind(calendarController));

// Event status updates
router.post('/:id/update-response', calendarController.updateAttendeeResponse.bind(calendarController));
router.post('/:id/cancel', calendarController.cancelEvent.bind(calendarController));
router.post('/:id/confirm', calendarController.confirmEvent.bind(calendarController));

// Upsert event by Google event ID
router.post('/upsert-google', calendarController.upsertByGoogleEventId.bind(calendarController));

// Cleanup old events
router.delete('/cleanup', calendarController.cleanupOldEvents.bind(calendarController));

// Update event
router.put('/:id', calendarController.updateEvent.bind(calendarController));

// Delete event
router.delete('/:id', calendarController.deleteEvent.bind(calendarController));

// Get event by ID (MUST be last among GET routes)
router.get('/:id', calendarController.getEvent.bind(calendarController));

export default router;