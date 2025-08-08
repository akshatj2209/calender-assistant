import express from 'express';
import { emailController } from '@/controllers/EmailController';

const router = express.Router();

// Email statistics (used by frontend)
router.get('/stats', emailController.getEmailStats.bind(emailController));

// Search emails with filters (used by frontend)
router.get('/', emailController.searchEmails.bind(emailController));

export default router;