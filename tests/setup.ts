// Jest setup file for global test configuration

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.GOOGLE_CLIENT_ID = 'test-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
process.env.OPENAI_API_KEY = 'test-openai-key';

// Mock console methods in tests
global.console = {
  ...console,
  // Uncomment to suppress console.log in tests
  // log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

// Mock Date for consistent testing
const mockDate = new Date('2024-08-05T14:00:00Z');
jest.useFakeTimers().setSystemTime(mockDate);

// Global test utilities
global.testUtils = {
  createMockEmailMessage: (overrides = {}) => ({
    id: 'test-email-1',
    threadId: 'thread-1',
    from: 'test@example.com',
    to: 'sales@company.com',
    subject: 'Demo Request',
    body: 'Hi, I would like to schedule a demo.',
    receivedAt: new Date(),
    isProcessed: false,
    ...overrides
  }),
  
  createMockCalendarEvent: (overrides = {}) => ({
    id: 'test-event-1',
    summary: 'Test Meeting',
    start: { dateTime: '2024-08-05T15:00:00Z', timezone: 'UTC' },
    end: { dateTime: '2024-08-05T15:30:00Z', timezone: 'UTC' },
    attendees: [],
    isPrivate: false,
    status: 'confirmed',
    ...overrides
  }),
  
  createMockTimeSlot: (overrides = {}) => ({
    start: new Date('2024-08-05T15:00:00Z'),
    end: new Date('2024-08-05T15:30:00Z'),
    timezone: 'UTC',
    ...overrides
  })
};

// Cleanup after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Extend Jest matchers if needed
expect.extend({
  toBeValidEmail(received: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const pass = emailRegex.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid email`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid email`,
        pass: false,
      };
    }
  },
});

// Type declarations for custom matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidEmail(): R;
    }
  }
  
  var testUtils: {
    createMockEmailMessage: (overrides?: any) => any;
    createMockCalendarEvent: (overrides?: any) => any;
    createMockTimeSlot: (overrides?: any) => any;
  };
}