import express from 'express';
import { gmailService } from '@/services/GmailService';
import { openaiService } from '@/services/OpenAIService';
import { authService } from '@/services/AuthService';

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

// Get Gmail profile
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const profile = await gmailService.getProfile();
    
    res.json({
      success: true,
      profile
    });
  } catch (error) {
    console.error('Gmail: Profile request failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get Gmail profile',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// List Gmail messages
router.get('/messages', requireAuth, async (req, res) => {
  try {
    const {
      q: query,
      maxResults = '10',
      pageToken,
      labelIds
    } = req.query as Record<string, string>;

    const options = {
      query: query || '',
      maxResults: parseInt(maxResults),
      pageToken,
      labelIds: labelIds ? labelIds.split(',') : undefined
    };

    const result = await gmailService.listMessages(options);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Gmail: List messages failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list Gmail messages',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get specific message
router.get('/messages/:messageId', requireAuth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const message = await gmailService.getMessage(messageId);
    
    res.json({
      success: true,
      message
    });
  } catch (error) {
    console.error(`Gmail: Get message ${req.params.messageId} failed:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to get Gmail message',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Search emails with specific query
router.get('/search', requireAuth, async (req, res) => {
  try {
    const { q: query, maxResults = '50' } = req.query as Record<string, string>;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Search query required',
        message: 'Please provide a search query (q parameter)'
      });
    }

    const emails = await gmailService.searchEmails(query, parseInt(maxResults));
    
    res.json({
      success: true,
      emails,
      count: emails.length
    });
  } catch (error) {
    console.error('Gmail: Search emails failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search emails',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get unread emails
router.get('/unread', requireAuth, async (req, res) => {
  try {
    const { maxResults = '10' } = req.query as Record<string, string>;
    const emails = await gmailService.getUnreadEmails(parseInt(maxResults));
    
    res.json({
      success: true,
      emails,
      count: emails.length
    });
  } catch (error) {
    console.error('Gmail: Get unread emails failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get unread emails',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Search for potential demo requests
router.get('/demo-requests', requireAuth, async (req, res) => {
  try {
    const { maxResults = '10' } = req.query as Record<string, string>;
    const emails = await gmailService.searchDemoRequests(parseInt(maxResults));
    
    res.json({
      success: true,
      emails,
      count: emails.length
    });
  } catch (error) {
    console.error('Gmail: Get demo requests failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search demo requests',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Analyze email intent with AI
router.post('/analyze-intent', requireAuth, async (req, res) => {
  try {
    const { messageId } = req.body;
    
    if (!messageId) {
      return res.status(400).json({
        success: false,
        error: 'Message ID required',
        message: 'Please provide a message ID to analyze'
      });
    }

    // Get the message
    const gmailMessage = await gmailService.getMessage(messageId);
    const emailMessages = await gmailService.searchEmails(`rfc822msgid:${messageId}`, 1);
    
    if (!emailMessages || emailMessages.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Message not found',
        message: 'Could not find the specified message'
      });
    }

    // Analyze with AI
    const intentResult = await openaiService.analyzeEmailIntent(emailMessages[0]);
    
    res.json({
      success: true,
      analysis: intentResult
    });
  } catch (error) {
    console.error('Gmail: Intent analysis failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze email intent',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Send email
router.post('/send', requireAuth, async (req, res) => {
  try {
    const { to, subject, body, replyToMessageId, isHtml } = req.body;
    
    if (!to || !subject || !body) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'to, subject, and body are required'
      });
    }

    const result = await gmailService.sendEmail({
      to,
      subject,
      body,
      replyToMessageId,
      isHtml: isHtml || false
    });
    
    res.json({
      success: true,
      messageId: result.id,
      threadId: result.threadId
    });
  } catch (error) {
    console.error('Gmail: Send email failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send email',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Send demo response
router.post('/send-demo-response', requireAuth, async (req, res) => {
  try {
    const { recipientEmail, recipientName, proposedTimes, originalMessageId } = req.body;
    
    if (!recipientEmail || !recipientName || !proposedTimes) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'recipientEmail, recipientName, and proposedTimes are required'
      });
    }

    if (!Array.isArray(proposedTimes) || proposedTimes.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid proposed times',
        message: 'proposedTimes must be a non-empty array of date strings'
      });
    }

    const times = proposedTimes.map(time => new Date(time));
    const result = await gmailService.sendDemoResponse(
      recipientEmail,
      recipientName,
      times,
      originalMessageId
    );
    
    res.json({
      success: true,
      messageId: result.id,
      threadId: result.threadId,
      sentTo: recipientEmail
    });
  } catch (error) {
    console.error('Gmail: Send demo response failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send demo response',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Mark message as read
router.post('/messages/:messageId/mark-read', requireAuth, async (req, res) => {
  try {
    const { messageId } = req.params;
    await gmailService.markAsRead(messageId);
    
    res.json({
      success: true,
      message: 'Message marked as read'
    });
  } catch (error) {
    console.error(`Gmail: Mark as read failed for ${req.params.messageId}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark message as read',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get Gmail labels
router.get('/labels', requireAuth, async (req, res) => {
  try {
    const labels = await gmailService.getLabels();
    
    res.json({
      success: true,
      labels
    });
  } catch (error) {
    console.error('Gmail: Get labels failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get Gmail labels',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Test Gmail connection
router.get('/test', requireAuth, async (req, res) => {
  try {
    const testResult = await gmailService.testConnection();
    
    res.json({
      success: testResult.success,
      service: 'Gmail API',
      ...(testResult.error && { error: testResult.error })
    });
  } catch (error) {
    console.error('Gmail: Connection test failed:', error);
    res.status(500).json({
      success: false,
      service: 'Gmail API',
      error: 'Connection test failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get API usage stats
router.get('/usage', requireAuth, async (req, res) => {
  try {
    const usage = await gmailService.getApiUsage();
    
    res.json({
      success: true,
      usage
    });
  } catch (error) {
    console.error('Gmail: Get usage failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get API usage',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;