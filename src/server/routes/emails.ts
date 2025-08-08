import { emailController } from '@/controllers/EmailController';
import express from 'express';

const router = express.Router();

// Job management endpoints
router.post('/jobs/trigger-processing', emailController.triggerEmailProcessing.bind(emailController));
router.post('/jobs/trigger-response-sending', emailController.triggerResponseSending.bind(emailController));
router.get('/jobs/status', emailController.getJobStatus.bind(emailController));

// Email statistics (used by frontend)
router.get('/stats', emailController.getEmailStats.bind(emailController));

// Search emails with filters (used by frontend)
router.get('/', emailController.searchEmails.bind(emailController));


export default router;