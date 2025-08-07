import { Router } from 'express';
import { ScheduledResponseRepository } from '@/repositories/ScheduledResponseRepository';
import { ResponseStatus } from '@prisma/client';

const router = Router();
const scheduledResponseRepository = new ScheduledResponseRepository();

// Get all draft responses for current user
router.get('/drafts', async (req, res) => {
  try {
    const userId = req.query.userId as string;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const drafts = await scheduledResponseRepository.findDraftsByUser(userId);
    res.json(drafts);
  } catch (error) {
    console.error('Error fetching drafts:', error);
    res.status(500).json({ error: 'Failed to fetch draft responses' });
  }
});

// Get specific scheduled response
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const response = await scheduledResponseRepository.findById(id);
    
    if (!response) {
      return res.status(404).json({ error: 'Scheduled response not found' });
    }

    res.json(response);
  } catch (error) {
    console.error('Error fetching scheduled response:', error);
    res.status(500).json({ error: 'Failed to fetch scheduled response' });
  }
});

// Update scheduled response (edit)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { subject, body, proposedTimeSlots, scheduledAt } = req.body;

    // Mark as editing while updating
    await scheduledResponseRepository.update(id, {
      status: ResponseStatus.EDITING
    });

    const updatedResponse = await scheduledResponseRepository.update(id, {
      subject,
      body,
      proposedTimeSlots,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      status: ResponseStatus.SCHEDULED,
      lastEditedAt: new Date()
    });

    res.json(updatedResponse);
  } catch (error) {
    console.error('Error updating scheduled response:', error);
    res.status(500).json({ error: 'Failed to update scheduled response' });
  }
});

// Send response immediately
router.post('/:id/send', async (req, res) => {
  try {
    const { id } = req.params;
    
    const response = await scheduledResponseRepository.findById(id);
    if (!response) {
      return res.status(404).json({ error: 'Scheduled response not found' });
    }

    // Mark as scheduled for immediate sending
    await scheduledResponseRepository.update(id, {
      status: ResponseStatus.SCHEDULED,
      scheduledAt: new Date() // Send now
    });

    res.json({ message: 'Response queued for immediate sending' });
  } catch (error) {
    console.error('Error queuing response for sending:', error);
    res.status(500).json({ error: 'Failed to queue response for sending' });
  }
});

// Cancel scheduled response
router.post('/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    
    const cancelledResponse = await scheduledResponseRepository.cancel(id);
    
    res.json(cancelledResponse);
  } catch (error) {
    console.error('Error cancelling scheduled response:', error);
    res.status(500).json({ error: 'Failed to cancel scheduled response' });
  }
});

// Reschedule response
router.post('/:id/reschedule', async (req, res) => {
  try {
    const { id } = req.params;
    const { scheduledAt } = req.body;
    
    if (!scheduledAt) {
      return res.status(400).json({ error: 'New scheduled time is required' });
    }

    const rescheduledResponse = await scheduledResponseRepository.update(id, {
      scheduledAt: new Date(scheduledAt),
      status: ResponseStatus.SCHEDULED
    });
    
    res.json(rescheduledResponse);
  } catch (error) {
    console.error('Error rescheduling response:', error);
    res.status(500).json({ error: 'Failed to reschedule response' });
  }
});

export default router;