import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config, serverPort, corsOrigins, isDevelopment } from '@/utils/config';
import { authService } from '@/services/AuthService';
import prisma from '@/database/connection';
import authRoutes from './routes/auth';
import gmailRoutes from './routes/gmail';
import calendarRoutes from './routes/calendar';
import configRoutes from './routes/config';
import statusRoutes from './routes/status';
// Database-backed routes
import usersRoutes from './routes/users';
import emailsRoutes from './routes/emails';
import calendarEventsRoutes from './routes/calendar-events';
import scheduledResponsesRoutes from './routes/scheduled-responses';
import jobsRoutes from './routes/jobs';

const app = express();

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false, // Allow embedding for development
  contentSecurityPolicy: isDevelopment ? false : undefined
}));

// CORS configuration
app.use(cors({
  origin: corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging in development
if (isDevelopment) {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/gmail', gmailRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/config', configRoutes);
app.use('/api/status', statusRoutes);

// Database-backed routes
app.use('/api/users', usersRoutes);
app.use('/api/emails', emailsRoutes);
app.use('/api/calendar-events', calendarEventsRoutes);
app.use('/api/scheduled-responses', scheduledResponsesRoutes);
app.use('/api/jobs', jobsRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Gmail Calendar Assistant API',
    version: process.env.npm_package_version || '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      gmail: '/api/gmail',
      calendar: '/api/calendar',
      config: '/api/config',
      status: '/api/status',
      users: '/api/users',
      emails: '/api/emails',
      calendarEvents: '/api/calendar-events',
      scheduledResponses: '/api/scheduled-responses',
      jobs: '/api/jobs'
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`,
    availableEndpoints: [
      '/health',
      '/api/auth',
      '/api/gmail',
      '/api/calendar',
      '/api/config',
      '/api/status'
    ]
  });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server Error:', err);

  // Don't expose internal errors in production
  const isProduction = process.env.NODE_ENV === 'production';
  
  res.status(err.status || 500).json({
    error: isProduction ? 'Internal Server Error' : err.message,
    ...(isDevelopment && { stack: err.stack })
  });
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  process.exit(0);
});

// Initialize services and start server
async function startServer() {
  try {
    console.log('🚀 Starting Gmail Calendar Assistant...');
    
    // Initialize database connection
    await prisma.$connect();
    console.log('✅ Database connection established');
    
    // Initialize authentication service
    await authService.initialize();
    console.log('✅ Authentication service initialized');
    
    // Start background jobs
    const { jobManager } = await import('@/jobs');
    jobManager.startAll();
    console.log('✅ Background jobs started');
    
    // Validate configuration
    const { isValid, errors } = await import('@/utils/config').then(m => m.validateConfig());
    if (!isValid) {
      console.error('❌ Configuration validation failed:');
      errors.forEach(error => console.error(`  - ${error}`));
      process.exit(1);
    }
    console.log('✅ Configuration validated');

    // Start HTTP server
    app.listen(serverPort, () => {
      console.log(`🌐 Server running on http://localhost:${serverPort}`);
      console.log(`📧 Gmail API: ${config.email.salesEmail}`);
      console.log(`🏢 Company: ${config.email.companyName}`);
      console.log(`⏰ Business Hours: ${config.businessRules.businessHours.start} - ${config.businessRules.businessHours.end}`);
      console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
      
      if (isDevelopment) {
        console.log('\n📋 Available endpoints:');
        console.log('  - GET  /health                 - Health check');
        console.log('  - GET  /api/auth/url          - Get OAuth URL');
        console.log('  - POST /api/auth/callback     - Handle OAuth callback');
        console.log('  - GET  /api/auth/status       - Check auth status');
        console.log('  - GET  /api/gmail/profile     - Get Gmail profile');
        console.log('  - GET  /api/gmail/messages    - List Gmail messages');
        console.log('  - GET  /api/calendar/events   - List calendar events');
        console.log('  - GET  /api/status            - System status');
      }
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

export default app;