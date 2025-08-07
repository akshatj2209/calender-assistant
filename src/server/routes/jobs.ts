import { Router } from 'express';
import { jobManager } from '@/jobs';

const router = Router();

// Get job status
router.get('/status', async (req, res) => {
  try {
    const status = jobManager.getStatus();
    res.json(status);
  } catch (error) {
    console.error('Error getting job status:', error);
    res.status(500).json({ error: 'Failed to get job status' });
  }
});

// Manually trigger email processing (includes sync)
router.post('/email-processing/trigger', async (req, res) => {
  try {
    await jobManager.triggerEmailProcessing();
    res.json({ message: 'Email processing triggered successfully' });
  } catch (error) {
    console.error('Error triggering email processing:', error);
    res.status(500).json({ error: 'Failed to trigger email processing' });
  }
});

// Manually trigger response sending
router.post('/response-sender/trigger', async (req, res) => {
  try {
    await jobManager.triggerResponseSending();
    res.json({ message: 'Response sending triggered successfully' });
  } catch (error) {
    console.error('Error triggering response sending:', error);
    res.status(500).json({ error: 'Failed to trigger response sending' });
  }
});

export default router;