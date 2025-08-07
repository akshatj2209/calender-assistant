import express from 'express';
import { emailController } from '@/controllers/EmailController';

const router = express.Router();

// IMPORTANT: Specific routes must come BEFORE parameterized routes
// Otherwise /:id will match everything

// Get pending emails
router.get('/status/pending', emailController.getPendingEmails.bind(emailController));

// Get failed emails
router.get('/status/failed', emailController.getFailedEmails.bind(emailController));

// Get demo requests
router.get('/demo-requests', emailController.getDemoRequests.bind(emailController));

// Get emails for retry
router.get('/retry', emailController.getEmailsForRetry.bind(emailController));

// Email statistics
router.get('/stats', emailController.getEmailStats.bind(emailController));

// Get email by Gmail message ID
router.get('/gmail/:messageId', emailController.getEmailByGmailId.bind(emailController));

// Search emails with filters (must be before /:id)
router.get('/', emailController.searchEmails.bind(emailController));

// Create new email record
router.post('/', emailController.createEmail.bind(emailController));

// Processing status updates
router.post('/:id/mark-processed', emailController.markAsProcessed.bind(emailController));
router.post('/:id/mark-failed', emailController.markAsFailed.bind(emailController));
router.post('/:id/mark-response-sent', emailController.markResponseSent.bind(emailController));

// Upsert email by Gmail message ID
router.post('/upsert-gmail', emailController.upsertByGmailMessageId.bind(emailController));

// Cleanup old emails
router.delete('/cleanup', emailController.cleanupOldEmails.bind(emailController));

// Update email record
router.put('/:id', emailController.updateEmail.bind(emailController));

// Delete email record
router.delete('/:id', emailController.deleteEmail.bind(emailController));

// Get email by ID (MUST be last among GET routes)
router.get('/:id', emailController.getEmail.bind(emailController));

export default router;