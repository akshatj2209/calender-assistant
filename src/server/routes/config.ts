import express from 'express';
import { config, validateConfig } from '@/utils/config';

const router = express.Router();

// Get current configuration (sanitized)
router.get('/', (req, res) => {
  try {
    // Return configuration without sensitive data
    const sanitizedConfig = {
      email: {
        salesEmail: config.email.salesEmail,
        salesName: config.email.salesName,
        companyName: config.email.companyName
      },
      businessRules: config.businessRules,
      monitoring: config.monitoring,
      google: {
        redirectUri: config.google.redirectUri,
        hasClientId: !!config.google.clientId,
        hasClientSecret: !!config.google.clientSecret
      },
      openai: {
        model: config.openai.model,
        hasApiKey: !!config.openai.apiKey
      }
    };

    res.json({
      success: true,
      config: sanitizedConfig
    });
  } catch (error) {
    console.error('Config: Get config failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get configuration',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Validate current configuration
router.get('/validate', (req, res) => {
  try {
    const validation = validateConfig();
    
    res.json({
      success: true,
      validation
    });
  } catch (error) {
    console.error('Config: Validation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Configuration validation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Update business rules (runtime configuration)
router.put('/business-rules', (req, res) => {
  try {
    const {
      businessHours,
      workingDays,
      meetingDuration,
      bufferTime,
      travelBufferTime,
      maxLookaheadDays,
      minAdvanceNotice,
      timezone
    } = req.body;

    // Validate the new business rules
    const errors: string[] = [];

    if (businessHours) {
      const { start, end } = businessHours;
      if (start && end) {
        const startHour = parseInt(start.split(':')[0]);
        const endHour = parseInt(end.split(':')[0]);
        
        if (startHour >= endHour) {
          errors.push('Business hours start time must be before end time');
        }
        
        if (startHour < 0 || startHour > 23 || endHour < 0 || endHour > 23) {
          errors.push('Business hours must be in 24-hour format (00:00 to 23:59)');
        }
      }
    }

    if (meetingDuration && (meetingDuration < 15 || meetingDuration > 240)) {
      errors.push('Meeting duration must be between 15 and 240 minutes');
    }

    if (bufferTime && (bufferTime < 0 || bufferTime > 240)) {
      errors.push('Buffer time must be between 0 and 240 minutes');
    }

    if (workingDays && (!Array.isArray(workingDays) || workingDays.some(day => day < 0 || day > 6))) {
      errors.push('Working days must be an array of numbers 0-6 (Sunday-Saturday)');
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid business rules',
        errors
      });
    }

    // Update the configuration (in memory only)
    // In a production app, this would update a database or config file
    if (businessHours) {
      Object.assign(config.businessRules.businessHours, businessHours);
    }
    
    if (workingDays) config.businessRules.workingDays = workingDays;
    if (meetingDuration) config.businessRules.meetingDuration = meetingDuration;
    if (bufferTime) config.businessRules.bufferTime = bufferTime;
    if (travelBufferTime) config.businessRules.travelBufferTime = travelBufferTime;
    if (maxLookaheadDays) config.businessRules.maxLookaheadDays = maxLookaheadDays;
    if (minAdvanceNotice) config.businessRules.minAdvanceNotice = minAdvanceNotice;
    if (timezone) config.businessRules.timezone = timezone;

    res.json({
      success: true,
      message: 'Business rules updated successfully',
      businessRules: config.businessRules
    });
  } catch (error) {
    console.error('Config: Update business rules failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update business rules',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Update email configuration
router.put('/email', (req, res) => {
  try {
    const { salesName, companyName, signatureTemplate } = req.body;

    // Update email configuration (in memory only)
    if (salesName) config.email.salesName = salesName;
    if (companyName) config.email.companyName = companyName;
    if (signatureTemplate) config.email.signatureTemplate = signatureTemplate;

    res.json({
      success: true,
      message: 'Email configuration updated successfully',
      email: {
        salesEmail: config.email.salesEmail,
        salesName: config.email.salesName,
        companyName: config.email.companyName
      }
    });
  } catch (error) {
    console.error('Config: Update email config failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update email configuration',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Update monitoring configuration
router.put('/monitoring', (req, res) => {
  try {
    const {
      checkIntervalMinutes,
      maxEmailsPerCheck,
      retryAttempts,
      retryDelayMs
    } = req.body;

    // Validate monitoring settings
    const errors: string[] = [];

    if (checkIntervalMinutes && (checkIntervalMinutes < 1 || checkIntervalMinutes > 60)) {
      errors.push('Check interval must be between 1 and 60 minutes');
    }

    if (maxEmailsPerCheck && (maxEmailsPerCheck < 1 || maxEmailsPerCheck > 100)) {
      errors.push('Max emails per check must be between 1 and 100');
    }

    if (retryAttempts && (retryAttempts < 1 || retryAttempts > 10)) {
      errors.push('Retry attempts must be between 1 and 10');
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid monitoring settings',
        errors
      });
    }

    // Update monitoring configuration (in memory only)
    if (checkIntervalMinutes) config.monitoring.checkIntervalMinutes = checkIntervalMinutes;
    if (maxEmailsPerCheck) config.monitoring.maxEmailsPerCheck = maxEmailsPerCheck;
    if (retryAttempts) config.monitoring.retryAttempts = retryAttempts;
    if (retryDelayMs) config.monitoring.retryDelayMs = retryDelayMs;

    res.json({
      success: true,
      message: 'Monitoring configuration updated successfully',
      monitoring: config.monitoring
    });
  } catch (error) {
    console.error('Config: Update monitoring config failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update monitoring configuration',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get environment information
router.get('/env', (req, res) => {
  try {
    const envInfo = {
      nodeEnv: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      platform: process.platform,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      hasRequiredEnvVars: {
        googleClientId: !!process.env.GOOGLE_CLIENT_ID,
        googleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
        openaiApiKey: !!process.env.OPENAI_API_KEY,
        salesEmail: !!process.env.SALES_EMAIL,
        salesName: !!process.env.SALES_NAME,
        companyName: !!process.env.COMPANY_NAME
      }
    };

    res.json({
      success: true,
      environment: envInfo
    });
  } catch (error) {
    console.error('Config: Get environment info failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get environment information',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Reset configuration to defaults
router.post('/reset', (req, res) => {
  try {
    // Reset business rules to defaults
    config.businessRules.businessHours = { start: '09:00', end: '17:00' };
    config.businessRules.workingDays = [1, 2, 3, 4, 5];
    config.businessRules.meetingDuration = 30;
    config.businessRules.bufferTime = 30;
    config.businessRules.travelBufferTime = 60;
    config.businessRules.maxLookaheadDays = 5;
    config.businessRules.minAdvanceNotice = 2;

    // Reset monitoring settings to defaults
    config.monitoring.checkIntervalMinutes = 5;
    config.monitoring.maxEmailsPerCheck = 10;
    config.monitoring.retryAttempts = 3;
    config.monitoring.retryDelayMs = 1000;

    res.json({
      success: true,
      message: 'Configuration reset to defaults',
      config: {
        businessRules: config.businessRules,
        monitoring: config.monitoring
      }
    });
  } catch (error) {
    console.error('Config: Reset config failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset configuration',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;