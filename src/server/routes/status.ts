import express from 'express';
import { authService } from '@/services/AuthService';
import { gmailService } from '@/services/GmailService';
import { calendarService } from '@/services/CalendarService';
import { openaiService } from '@/services/OpenAIService';
import { config, validateConfig } from '@/utils/config';

const router = express.Router();

// Get overall system status
router.get('/', async (req, res) => {
  try {
    const startTime = Date.now();

    // Check authentication status
    const authStatus = await authService.getAuthStatus();

    // Test API connections (with timeout)
    const connectionTests = await Promise.allSettled([
      Promise.race([
        gmailService.testConnection(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
      ]),
      Promise.race([
        calendarService.testConnection(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
      ]),
      Promise.race([
        openaiService.testConnection(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
      ])
    ]);

    const [gmailTest, calendarTest, openaiTest] = connectionTests;

    // Configuration validation
    const configValidation = validateConfig();

    // System information
    const systemInfo = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      nodeVersion: process.version,
      platform: process.platform,
      env: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime
    };

    const status = {
      overall: 'healthy', // Will be updated based on checks
      authentication: {
        isAuthenticated: authStatus.isAuthenticated,
        hasValidToken: authStatus.hasValidToken,
        tokenExpiry: authStatus.tokenExpiry,
        userEmail: authStatus.userEmail,
        scopes: authStatus.scopes
      },
      services: {
        gmail: {
          status: gmailTest.status === 'fulfilled' && gmailTest.value.success ? 'healthy' : 'error',
          ...(gmailTest.status === 'fulfilled' ? gmailTest.value : { error: 'Connection failed' })
        },
        calendar: {
          status: calendarTest.status === 'fulfilled' && calendarTest.value.success ? 'healthy' : 'error',
          ...(calendarTest.status === 'fulfilled' ? calendarTest.value : { error: 'Connection failed' })
        },
        openai: {
          status: openaiTest.status === 'fulfilled' && openaiTest.value.success ? 'healthy' : 'error',
          ...(openaiTest.status === 'fulfilled' ? openaiTest.value : { error: 'Connection failed' })
        }
      },
      configuration: {
        isValid: configValidation.isValid,
        errors: configValidation.errors,
        businessRules: config.businessRules,
        email: {
          salesEmail: config.email.salesEmail,
          salesName: config.email.salesName,
          companyName: config.email.companyName
        }
      },
      system: systemInfo
    };

    // Determine overall health
    const hasAuthIssues = !status.authentication.isAuthenticated || !status.authentication.hasValidToken;
    const hasServiceIssues = Object.values(status.services).some(service => service.status !== 'healthy');
    const hasConfigIssues = !status.configuration.isValid;

    if (hasAuthIssues) {
      status.overall = 'warning';
    } else if (hasServiceIssues || hasConfigIssues) {
      status.overall = 'error';
    }

    res.json({
      success: true,
      status
    });
  } catch (error) {
    console.error('Status: System status check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get system status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get detailed authentication status
router.get('/auth', async (req, res) => {
  try {
    const authStatus = await authService.getAuthStatus();
    
    res.json({
      success: true,
      auth: authStatus
    });
  } catch (error) {
    console.error('Status: Auth status check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get authentication status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Test all service connections
router.get('/services', async (req, res) => {
  try {
    const tests = await Promise.allSettled([
      gmailService.testConnection().then(result => ({ service: 'Gmail', ...result })),
      calendarService.testConnection().then(result => ({ service: 'Calendar', ...result })),
      openaiService.testConnection().then(result => ({ service: 'OpenAI', ...result }))
    ]);

    const services = tests.map((test, index) => {
      const serviceNames = ['Gmail', 'Calendar', 'OpenAI'];
      
      if (test.status === 'fulfilled') {
        return test.value;
      } else {
        return {
          service: serviceNames[index],
          success: false,
          error: test.reason?.message || 'Connection test failed'
        };
      }
    });

    const allHealthy = services.every(service => service.success);

    res.json({
      success: true,
      overall: allHealthy ? 'healthy' : 'error',
      services,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Status: Service tests failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test service connections',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Test specific service connection
router.get('/services/:service', async (req, res) => {
  try {
    const { service } = req.params;
    let testResult;

    switch (service.toLowerCase()) {
      case 'gmail':
        testResult = await gmailService.testConnection();
        break;
      case 'calendar':
        testResult = await calendarService.testConnection();
        break;
      case 'openai':
        testResult = await openaiService.testConnection();
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid service',
          message: 'Service must be one of: gmail, calendar, openai'
        });
    }

    res.json({
      success: true,
      service: service.toLowerCase(),
      test: testResult,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`Status: ${req.params.service} test failed:`, error);
    res.status(500).json({
      success: false,
      service: req.params.service,
      error: 'Service test failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get system metrics
router.get('/metrics', async (req, res) => {
  try {
    const metrics = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      platform: {
        arch: process.arch,
        platform: process.platform,
        version: process.version,
        versions: process.versions
      },
      environment: {
        nodeEnv: process.env.NODE_ENV || 'development',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        locale: Intl.DateTimeFormat().resolvedOptions().locale
      },
      configuration: {
        businessHours: config.businessRules.businessHours,
        workingDays: config.businessRules.workingDays,
        meetingDuration: config.businessRules.meetingDuration,
        bufferTime: config.businessRules.bufferTime,
        checkInterval: config.monitoring.checkIntervalMinutes
      },
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      metrics
    });
  } catch (error) {
    console.error('Status: Metrics collection failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to collect system metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get API usage statistics
router.get('/usage', async (req, res) => {
  try {
    const usage = await Promise.allSettled([
      gmailService.getApiUsage(),
      calendarService.getApiUsage(),
      openaiService.getApiUsage()
    ]);

    const apiUsage = {
      gmail: usage[0].status === 'fulfilled' ? usage[0].value : null,
      calendar: usage[1].status === 'fulfilled' ? usage[1].value : null,
      openai: usage[2].status === 'fulfilled' ? usage[2].value : null
    };

    res.json({
      success: true,
      usage: apiUsage,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Status: API usage collection failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to collect API usage statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Health check endpoint (simple)
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Readiness probe (for container orchestration)
router.get('/ready', async (req, res) => {
  try {
    // Check if essential services are ready
    const authStatus = await authService.getAuthStatus();
    const configValidation = validateConfig();

    const isReady = configValidation.isValid;

    if (isReady) {
      res.json({
        success: true,
        status: 'ready',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({
        success: false,
        status: 'not ready',
        errors: configValidation.errors,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    res.status(503).json({
      success: false,
      status: 'not ready',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;