import { AppConfig, BusinessRules } from '@/types';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const requiredEnvVars = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'OPENAI_API_KEY'
] as const;

const validateRequiredEnvVars = (): void => {
  const missing = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env file and ensure all required variables are set.'
    );
  }
};

const parseBusinessRules = (): BusinessRules => {
  return {
    businessHours: {
      start: process.env.BUSINESS_HOURS_START || '09:00',
      end: process.env.BUSINESS_HOURS_END || '17:00'
    },
    workingDays: [1, 2, 3, 4, 5],
    meetingDuration: parseInt(process.env.MEETING_DURATION_MINUTES || '30'),
    bufferTime: parseInt(process.env.BUFFER_TIME_MINUTES || '30'),
    travelBufferTime: parseInt(process.env.TRAVEL_BUFFER_TIME_MINUTES || '60'),
    maxLookaheadDays: parseInt(process.env.MAX_LOOKAHEAD_DAYS || '5'),
    minAdvanceNotice: parseInt(process.env.MIN_ADVANCE_NOTICE_HOURS || '2'),
    timezone: process.env.DEFAULT_TIMEZONE || 'America/Los_Angeles'
  };
};

export const createAppConfig = (): AppConfig => {
  validateRequiredEnvVars();

  return {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/callback'
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY!,
      model: process.env.OPENAI_MODEL || 'gpt-4o'
    },
    monitoring: {
      checkIntervalMinutes: parseInt(process.env.CHECK_INTERVAL_MINUTES || '5'),
      maxEmailsPerCheck: parseInt(process.env.MAX_EMAILS_PER_CHECK || '10'),
      retryAttempts: parseInt(process.env.RETRY_ATTEMPTS || '3'),
      retryDelayMs: parseInt(process.env.RETRY_DELAY_MS || '1000')
    },
    businessRules: parseBusinessRules()
  };
};

export const config = createAppConfig();

export const validateConfig = (): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  const { start, end } = config.businessRules.businessHours;
  const startHour = parseInt(start.split(':')[0]);
  const endHour = parseInt(end.split(':')[0]);
  
  if (startHour >= endHour) {
    errors.push('Business hours start time must be before end time');
  }
  
  if (startHour < 0 || startHour > 23 || endHour < 0 || endHour > 23) {
    errors.push('Business hours must be in 24-hour format (00:00 to 23:59)');
  }

  if (config.businessRules.bufferTime < 0 || config.businessRules.bufferTime > 240) {
    errors.push('Buffer time must be between 0 and 240 minutes');
  }

  if (config.businessRules.meetingDuration < 15 || config.businessRules.meetingDuration > 240) {
    errors.push('Meeting duration must be between 15 and 240 minutes');
  }


  if (!config.openai.apiKey.startsWith('sk-')) {
    errors.push('OpenAI API key should start with "sk-"');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Environment-specific configurations
export const isDevelopment = process.env.NODE_ENV === 'development';
export const isProduction = process.env.NODE_ENV === 'production';
export const isTest = process.env.NODE_ENV === 'test';

export const serverPort = parseInt(process.env.PORT || '3001');
export const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
export const backendUrl = process.env.BACKEND_URL || `http://localhost:${serverPort}`;

// Credentials file paths  
export const tokenPath = path.join(process.cwd(), 'token.json');

// Security settings
export const corsOrigins = process.env.CORS_ORIGINS?.split(',') || [frontendUrl];

export default config;