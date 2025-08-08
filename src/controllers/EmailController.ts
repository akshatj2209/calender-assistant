import { Request, Response } from 'express';
import { emailRepository } from '@/database/repositories';
import { ProcessingStatus } from '@prisma/client';
import { z } from 'zod';
import { emailProcessingJob } from '@/jobs/EmailProcessingJob';
import { responseSenderJob } from '@/jobs/ResponseSenderJob';

// Validation schemas
const createEmailSchema = z.object({
  userId: z.string(),
  gmailMessageId: z.string(),
  gmailThreadId: z.string(),
  from: z.string().email(),
  to: z.string().email(),
  subject: z.string(),
  body: z.string(),
  receivedAt: z.string().datetime()
});

const updateEmailSchema = z.object({
  processingStatus: z.nativeEnum(ProcessingStatus).optional(),
  isDemoRequest: z.boolean().optional(),
  intentAnalysis: z.any().optional(),
  timePreferences: z.any().optional(),
  contactInfo: z.any().optional(),
  responseGenerated: z.boolean().optional(),
  responseSent: z.boolean().optional(),
  responseMessageId: z.string().optional()
});

const emailSearchSchema = z.object({
  userId: z.string().optional(),
  processingStatus: z.nativeEnum(ProcessingStatus).optional(),
  isDemoRequest: z.boolean().optional(),
  responseGenerated: z.boolean().optional(),
  responseSent: z.boolean().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional()
});

export class EmailController {
  
  // GET /api/emails/:id
  async getEmail(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const email = await emailRepository.findById(id);
      if (!email) {
        res.status(404).json({
          success: false,
          error: 'Email not found'
        });
        return;
      }

      res.json({
        success: true,
        email
      });
    } catch (error) {
      console.error('EmailController.getEmail:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get email',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // GET /api/emails/gmail/:messageId
  async getEmailByGmailId(req: Request, res: Response): Promise<void> {
    try {
      const { messageId } = req.params;
      
      const email = await emailRepository.findByGmailMessageId(messageId);
      if (!email) {
        res.status(404).json({
          success: false,
          error: 'Email not found'
        });
        return;
      }

      res.json({
        success: true,
        email
      });
    } catch (error) {
      console.error('EmailController.getEmailByGmailId:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get email',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // POST /api/emails
  async createEmail(req: Request, res: Response): Promise<void> {
    try {
      const validation = createEmailSchema.safeParse({
        ...req.body,
        receivedAt: req.body.receivedAt || new Date().toISOString()
      });
      
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
        receivedAt: new Date(validation.data.receivedAt)
      };

      const email = await emailRepository.create(data);

      res.status(201).json({
        success: true,
        email,
        message: 'Email created successfully'
      });
    } catch (error) {
      console.error('EmailController.createEmail:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create email',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // PUT /api/emails/:id
  async updateEmail(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const validation = updateEmailSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid input',
          details: validation.error.errors
        });
        return;
      }

      const email = await emailRepository.update(id, validation.data);

      res.json({
        success: true,
        email,
        message: 'Email updated successfully'
      });
    } catch (error) {
      console.error('EmailController.updateEmail:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update email',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // DELETE /api/emails/:id
  async deleteEmail(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      await emailRepository.delete(id);

      res.json({
        success: true,
        message: 'Email deleted successfully'
      });
    } catch (error) {
      console.error('EmailController.deleteEmail:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete email',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // GET /api/emails
  async searchEmails(req: Request, res: Response): Promise<void> {
    try {
      const queryData = {
        ...req.query,
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        isDemoRequest: req.query.isDemoRequest === 'true' ? true : 
                      req.query.isDemoRequest === 'false' ? false : undefined,
        responseGenerated: req.query.responseGenerated === 'true' ? true :
                          req.query.responseGenerated === 'false' ? false : undefined,
        responseSent: req.query.responseSent === 'true' ? true :
                     req.query.responseSent === 'false' ? false : undefined
      };

      const validation = emailSearchSchema.safeParse(queryData);
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

      const emails = await emailRepository.findMany(options);

      res.json({
        success: true,
        emails,
        count: emails.length,
        filters: options
      });
    } catch (error) {
      console.error('EmailController.searchEmails:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to search emails',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // GET /api/emails/pending
  async getPendingEmails(req: Request, res: Response): Promise<void> {
    try {
      const { userId, limit = '10' } = req.query as Record<string, string>;
      
      if (!userId) {
        res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
        return;
      }
      
      const emails = await emailRepository.findPendingEmails(
        userId, 
        parseInt(limit)
      );

      res.json({
        success: true,
        emails,
        count: emails.length
      });
    } catch (error) {
      console.error('EmailController.getPendingEmails:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get pending emails',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // GET /api/emails/failed
  async getFailedEmails(req: Request, res: Response): Promise<void> {
    try {
      const { userId, limit = '10' } = req.query as Record<string, string>;
      
      if (!userId) {
        res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
        return;
      }
      
      const emails = await emailRepository.findFailedEmails(
        userId, 
        parseInt(limit)
      );

      res.json({
        success: true,
        emails,
        count: emails.length
      });
    } catch (error) {
      console.error('EmailController.getFailedEmails:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get failed emails',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // GET /api/emails/demo-requests
  async getDemoRequests(req: Request, res: Response): Promise<void> {
    try {
      const { 
        userId, 
        responded,
        startDate,
        endDate,
        limit = '20'
      } = req.query as Record<string, string>;
      
      if (!userId) {
        res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
        return;
      }
      
      const options = {
        responded: responded === 'true' ? true : responded === 'false' ? false : undefined,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        limit: parseInt(limit)
      };

      const emails = await emailRepository.findDemoRequests(userId, options);

      res.json({
        success: true,
        emails,
        count: emails.length,
        filters: options
      });
    } catch (error) {
      console.error('EmailController.getDemoRequests:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get demo requests',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // POST /api/emails/:id/mark-processed
  async markAsProcessed(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { isDemoRequest, intentAnalysis, timePreferences, contactInfo } = req.body;

      const email = await emailRepository.markAsProcessed(id, isDemoRequest);

      res.json({
        success: true,
        email,
        message: 'Email marked as processed'
      });
    } catch (error) {
      console.error('EmailController.markAsProcessed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to mark email as processed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // POST /api/emails/:id/mark-failed
  async markAsFailed(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { error: errorMessage, incrementRetry = true } = req.body;

      if (!errorMessage) {
        res.status(400).json({
          success: false,
          error: 'Error message is required'
        });
        return;
      }

      const email = await emailRepository.markAsFailed(id);

      res.json({
        success: true,
        email,
        message: 'Email marked as failed'
      });
    } catch (error) {
      console.error('EmailController.markAsFailed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to mark email as failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // POST /api/emails/:id/mark-response-sent
  async markResponseSent(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { responseMessageId } = req.body;

      if (!responseMessageId) {
        res.status(400).json({
          success: false,
          error: 'Response message ID is required'
        });
        return;
      }

      const email = await emailRepository.markResponseSent(id, responseMessageId);

      res.json({
        success: true,
        email,
        message: 'Email marked as response sent'
      });
    } catch (error) {
      console.error('EmailController.markResponseSent:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to mark response as sent',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // GET /api/emails/retry
  async getEmailsForRetry(req: Request, res: Response): Promise<void> {
    try {
      const { maxRetries = '3' } = req.query as Record<string, string>;
      
      const emails = await emailRepository.findFailedEmails();

      res.json({
        success: true,
        emails,
        count: emails.length
      });
    } catch (error) {
      console.error('EmailController.getEmailsForRetry:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get emails for retry',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // GET /api/emails/stats
  async getEmailStats(req: Request, res: Response): Promise<void> {
    try {
      const { userId, days = '30' } = req.query as Record<string, string>;

      if (!userId) {
        res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
        return;
      }

      const stats = await emailRepository.getEmailStats(userId, parseInt(days));

      res.json({
        success: true,
        stats,
        period: parseInt(days)
      });
    } catch (error) {
      console.error('EmailController.getEmailStats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get email statistics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // POST /api/emails/upsert-gmail
  async upsertByGmailMessageId(req: Request, res: Response): Promise<void> {
    try {
      const validation = createEmailSchema.safeParse({
        ...req.body,
        receivedAt: req.body.receivedAt || new Date().toISOString()
      });
      
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
        receivedAt: new Date(validation.data.receivedAt)
      };

      const email = await emailRepository.upsertByGmailMessageId(
        data.gmailMessageId,
        data
      );

      res.json({
        success: true,
        email,
        message: 'Email upserted successfully'
      });
    } catch (error) {
      console.error('EmailController.upsertByGmailMessageId:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to upsert email',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // DELETE /api/emails/cleanup
  async cleanupOldEmails(req: Request, res: Response): Promise<void> {
    try {
      const { days = '90' } = req.query as Record<string, string>;
      
      const deletedCount = await emailRepository.cleanupOldEmails(parseInt(days));

      res.json({
        success: true,
        deletedCount,
        message: `Cleaned up ${deletedCount} old emails`
      });
    } catch (error) {
      console.error('EmailController.cleanupOldEmails:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to cleanup old emails',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // POST /api/emails/jobs/trigger-processing
  async triggerEmailProcessing(req: Request, res: Response): Promise<void> {
    try {
      console.log('🤖 API: Triggering email processing job manually...');
      
      // Trigger the email processing job
      await emailProcessingJob.triggerProcessing();
      
      // Get job status for response
      const status = emailProcessingJob.getStatus();
      
      res.json({
        success: true,
        message: 'Email processing job triggered successfully',
        status: {
          isRunning: status.isRunning,
          isStarted: status.isStarted,
          triggeredAt: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('EmailController.triggerEmailProcessing:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to trigger email processing job',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // POST /api/emails/jobs/trigger-response-sending
  async triggerResponseSending(req: Request, res: Response): Promise<void> {
    try {
      console.log('📤 API: Triggering response sending job manually...');
      
      // Trigger the response sending job
      await responseSenderJob.triggerSending();
      
      // Get job status for response
      const status = responseSenderJob.getStatus();
      
      res.json({
        success: true,
        message: 'Response sending job triggered successfully',
        status: {
          isRunning: status.isRunning,
          isStarted: status.isStarted,
          triggeredAt: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('EmailController.triggerResponseSending:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to trigger response sending job',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // GET /api/emails/jobs/status
  async getJobStatus(req: Request, res: Response): Promise<void> {
    try {
      const emailProcessingStatus = emailProcessingJob.getStatus();
      const responseSendingStatus = responseSenderJob.getStatus();
      
      res.json({
        success: true,
        jobs: {
          emailProcessing: {
            ...emailProcessingStatus,
            description: 'Fetches emails from Gmail and processes demo requests'
          },
          responseSending: {
            ...responseSendingStatus,
            description: 'Sends scheduled responses to demo requests'
          }
        },
        lastChecked: new Date().toISOString()
      });
    } catch (error) {
      console.error('EmailController.getJobStatus:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get job status',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

// Export singleton instance
export const emailController = new EmailController();