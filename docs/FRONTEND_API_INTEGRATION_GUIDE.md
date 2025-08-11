# Frontend API Integration Guide

## 🎯 Overview

This guide provides step-by-step instructions for integrating the Gmail Calendar Assistant frontend with the backend APIs. The frontend is built with Next.js and uses the custom `useApi` hook for API interactions.

## 📋 Prerequisites

1. ✅ Database setup complete
2. ✅ Backend server running on `http://localhost:3001`
3. ✅ Frontend components created
4. ✅ API utilities implemented

## 🚀 Quick Start

### 1. Install Frontend Dependencies

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install
```

### 2. Start Frontend Development Server

```bash
# From project root
npm run dev:frontend

# OR from frontend directory
npm run dev
```

The frontend will be available at `http://localhost:3000`

## 🔌 API Integration Steps

### Step 1: Basic API Connection Test

Create a simple test component to verify API connectivity:

```tsx
// frontend/src/components/Test/ApiTest.tsx
import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';

const ApiTest: React.FC = () => {
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const api = useApi();

  useEffect(() => {
    const testConnection = async () => {
      try {
        const response = await api.system.health();
        setHealthStatus(response.data);
      } catch (err: any) {
        setError(err.message);
      }
    };
    
    testConnection();
  }, []);

  return (
    <div className="p-4 border rounded">
      <h3>API Connection Test</h3>
      {healthStatus ? (
        <div className="text-green-600">
          ✅ Connected: {healthStatus.status}
        </div>
      ) : error ? (
        <div className="text-red-600">
          ❌ Error: {error}
        </div>
      ) : (
        <div>⏳ Testing connection...</div>
      )}
    </div>
  );
};
```

### Step 2: User Management Integration

```tsx
// Example: Find or create user (main method used)
const findOrCreateUser = async (userData: any) => {
  try {
    const response = await api.users.findOrCreate({
      email: userData.email,
      name: userData.name
    });
    console.log('User found/created:', response.data.user);
    return response.data.user;
  } catch (error) {
    console.error('Failed to find/create user:', error);
    return null;
  }
};

// Example: Get user by ID  
const getUser = async (userId: string) => {
  try {
    const response = await api.users.getById(userId);
    return response.data.user;
  } catch (error) {
    console.error('Failed to get user:', error);
    return null;
  }
};

// Example: Update user information
const updateUser = async (userId: string, updates: any) => {
  try {
    const response = await api.users.update(userId, {
      salesName: 'John Sales',
      companyName: 'My Company', 
      businessHoursStart: '09:00',
      businessHoursEnd: '17:00',
      workingDays: [1, 2, 3, 4, 5], // Mon-Fri
      meetingDuration: 30,
      bufferTime: 15
    });
    console.log('User updated:', response.data);
  } catch (error) {
    console.error('Failed to update user:', error);
  }
};
```

### Step 3: Email Management Integration

```tsx
// Example: Search emails with filters
const fetchEmails = async (userId: string) => {
  try {
    const response = await api.emails.search({
      userId: userId,
      limit: 10,
      processingStatus: 'COMPLETED',
      isDemoRequest: true
    });
    return response.data.emails;
  } catch (error) {
    console.error('Failed to fetch emails:', error);
    return [];
  }
};

// Example: Get email statistics
const getEmailStats = async (userId: string, days: number = 30) => {
  try {
    const response = await api.emails.getStats({
      userId: userId,
      days: days
    });
    return response.data.stats;
  } catch (error) {
    console.error('Failed to get email stats:', error);
    return null;
  }
};

// Example: Trigger email processing job
const triggerEmailProcessing = async () => {
  try {
    const response = await api.emails.triggerProcessing();
    console.log('Email processing triggered:', response.data);
    return response.data;
  } catch (error) {
    console.error('Failed to trigger email processing:', error);
  }
};

// Example: Trigger response sending job
const triggerResponseSending = async () => {
  try {
    const response = await api.emails.triggerResponseSending();
    console.log('Response sending triggered:', response.data);
    return response.data;
  } catch (error) {
    console.error('Failed to trigger response sending:', error);
  }
};
```

### Step 4: Calendar Events Integration

```tsx
// Example: Fetch upcoming events
const fetchUpcomingEvents = async (userId: string, days: number = 7) => {
  try {
    const response = await api.calendarEvents.getUpcoming({
      userId: userId,
      days: days
    });
    return response.data.events;
  } catch (error) {
    console.error('Failed to fetch events:', error);
    return [];
  }
};

// Example: Get calendar statistics
const getCalendarStats = async (userId: string, days: number = 30) => {
  try {
    const response = await api.calendarEvents.getStats({
      userId: userId,
      days: days
    });
    return response.data.stats;
  } catch (error) {
    console.error('Failed to get calendar stats:', error);
    return null;
  }
};

// Example: Create calendar event
const createCalendarEvent = async (userId: string, eventData: any) => {
  try {
    const response = await api.calendarEvents.create({
      userId: userId,
      emailRecordId: eventData.emailRecordId,
      googleEventId: eventData.googleEventId,
      summary: eventData.summary,
      startTime: eventData.startTime,
      endTime: eventData.endTime,
      timezone: eventData.timezone || 'UTC',
      attendeeEmail: eventData.attendeeEmail,
      attendeeName: eventData.attendeeName,
      status: 'CONFIRMED'
    });
    console.log('Event created:', response.data.event);
    return response.data.event;
  } catch (error) {
    console.error('Failed to create event:', error);
  }
};

// Example: Cancel calendar event
const cancelEvent = async (eventId: string) => {
  try {
    const response = await api.calendarEvents.cancel(eventId);
    console.log('Event cancelled:', response.data);
  } catch (error) {
    console.error('Failed to cancel event:', error);
  }
};

// Example: Confirm calendar event
const confirmEvent = async (eventId: string) => {
  try {
    const response = await api.calendarEvents.confirm(eventId);
    console.log('Event confirmed:', response.data);
  } catch (error) {
    console.error('Failed to confirm event:', error);
  }
};
```

## 🎨 Using Components with API Integration

### Dashboard Component Usage

```tsx
// pages/index.tsx or your main page
import Dashboard from '../components/Dashboard/Dashboard';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Dashboard />
    </div>
  );
}
```

### Email List Component Usage

```tsx
import { useState, useEffect } from 'react';
import EmailList from '../components/Email/EmailList';
import { useApi } from '../hooks/useApi';

const EmailPage: React.FC = () => {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const api = useApi();

  const fetchEmails = async () => {
    setLoading(true);
    try {
      const response = await api.emails.search({ limit: 20 });
      setEmails(response.data.emails);
    } catch (error) {
      console.error('Failed to fetch emails:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmails();
  }, []);

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Email Management</h1>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <EmailList 
          emails={emails}
          onRefresh={fetchEmails}
        />
      )}
    </div>
  );
};
```

### Calendar Component Usage

```tsx
import { useState, useEffect } from 'react';
import CalendarView from '../components/Calendar/CalendarView';
import { useApi } from '../hooks/useApi';

const CalendarPage: React.FC = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const api = useApi();

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const response = await api.calendarEvents.getUpcoming({ days: 14 });
      setEvents(response.data.events);
    } catch (error) {
      console.error('Failed to fetch events:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Calendar Events</h1>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <CalendarView 
          events={events}
          onRefresh={fetchEvents}
        />
      )}
    </div>
  );
};
```

## 🔧 Advanced API Patterns

### Error Handling

```tsx
import { useState } from 'react';
import { useApi } from '../hooks/useApi';

const useApiWithErrorHandling = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const api = useApi();

  const executeWithErrorHandling = async <T>(
    apiCall: () => Promise<T>
  ): Promise<T | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await apiCall();
      return result;
    } catch (err: any) {
      console.error('API Error:', err);
      
      if (err.status === 0) {
        setError('Unable to connect to server. Please check if the backend is running.');
      } else if (err.status >= 500) {
        setError('Server error. Please try again later.');
      } else if (err.status === 404) {
        setError('Resource not found.');
      } else {
        setError(err.message || 'An unexpected error occurred.');
      }
      
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { executeWithErrorHandling, loading, error };
};
```

### Real-time Data Updates

```tsx
import { useState, useEffect, useCallback } from 'react';
import { useApi } from '../hooks/useApi';

const useRealTimeData = <T>(
  fetcher: () => Promise<T>,
  interval: number = 30000 // 30 seconds
) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const result = await fetcher();
      setData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [fetcher]);

  useEffect(() => {
    fetchData();
    const intervalId = setInterval(fetchData, interval);
    
    return () => clearInterval(intervalId);
  }, [fetchData, interval]);

  return { data, loading, error, refresh: fetchData };
};

// Usage
const Dashboard: React.FC = () => {
  const api = useApi();
  
  const { data: emails, loading, error, refresh } = useRealTimeData(
    () => api.emails.search({ limit: 10 }),
    30000 // Refresh every 30 seconds
  );

  // Component implementation...
};
```

### Pagination Support

```tsx
import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';

const usePaginatedData = <T>(
  endpoint: string,
  limit: number = 10
) => {
  const [data, setData] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const api = useApi();

  const fetchPage = async (pageNum: number) => {
    setLoading(true);
    try {
      const response = await api.get(`${endpoint}?page=${pageNum}&limit=${limit}`);
      const newData = response.data.data || response.data.emails || response.data.events;
      
      if (pageNum === 1) {
        setData(newData);
      } else {
        setData(prev => [...prev, ...newData]);
      }
      
      setHasMore(newData.length === limit);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      setPage(prev => prev + 1);
    }
  };

  const refresh = () => {
    setPage(1);
    fetchPage(1);
  };

  useEffect(() => {
    fetchPage(page);
  }, [page]);

  return { data, loading, hasMore, loadMore, refresh };
};
```

## 🔍 Debugging API Integration

### Network Debugging

1. **Check Browser Network Tab**
   - Open Developer Tools (F12)
   - Go to Network tab
   - Look for failed requests (red entries)
   - Check request/response details

2. **Backend Server Status**
   ```bash
   # Check if backend is running
   curl http://localhost:3001/health
   
   # Should return:
   # {"status":"healthy","timestamp":"...","version":"1.0.0"}
   ```

3. **Database Connection**
   ```bash
   # Test database
   make test-db
   
   # OR
   npm run db:test
   ```

### Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Network Error | Backend not running | Run `make start` or `npm run dev:backend` |
| CORS Error | Frontend/Backend URL mismatch | Check `next.config.js` rewrites |
| 404 Errors | Wrong API endpoint | Verify endpoint in `useApi` hook |
| Database Errors | DB not connected | Run `make docker-up` and `make db-setup` |
| Authentication Errors | Missing tokens | Implement auth flow first |

### API Response Logging

```tsx
// Add to useApi hook for debugging
const request = async <T>(endpoint: string, options: RequestInit = {}) => {
  console.log(`[API] ${options.method || 'GET'} ${endpoint}`);
  
  try {
    const response = await fetch(url, { ...options, headers: defaultHeaders });
    const data = await response.json();
    
    console.log(`[API] Response:`, { status: response.status, data });
    
    return { data, status: response.status, statusText: response.statusText };
  } catch (error) {
    console.error(`[API] Error:`, error);
    throw error;
  }
};
```

## 📊 Performance Optimization

### 1. Implement Caching

```tsx
const useApiCache = () => {
  const cache = new Map();
  
  const getCached = <T>(key: string): T | null => {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < 300000) { // 5 minutes
      return cached.data;
    }
    return null;
  };
  
  const setCached = <T>(key: string, data: T) => {
    cache.set(key, { data, timestamp: Date.now() });
  };
  
  return { getCached, setCached };
};
```

### 2. Batch API Requests

```tsx
const useBatchedRequests = () => {
  const api = useApi();
  
  const fetchDashboardData = async () => {
    // Fetch multiple endpoints in parallel
    const [emails, events, stats] = await Promise.all([
      api.emails.search({ limit: 5 }),
      api.calendarEvents.getUpcoming({ days: 7 }),
      api.emails.getStats({ days: 30 })
    ]);
    
    return {
      emails: emails.data.emails,
      events: events.data.events,
      stats: stats.data
    };
  };
  
  return { fetchDashboardData };
};
```

## ✅ Testing API Integration

### 1. Manual Testing Checklist

- [ ] Health check endpoint responds
- [ ] User CRUD operations work
- [ ] Email fetching and processing work
- [ ] Calendar events CRUD work
- [ ] Error handling displays properly
- [ ] Loading states show correctly
- [ ] Data updates in real-time

### 2. Automated Testing

```tsx
// __tests__/api.test.tsx
import { renderHook, waitFor } from '@testing-library/react';
import { useApi } from '../hooks/useApi';

describe('API Integration', () => {
  it('should fetch health status', async () => {
    const { result } = renderHook(() => useApi());
    
    const response = await result.current.system.health();
    
    expect(response.data.status).toBe('healthy');
  });
  
  it('should handle network errors gracefully', async () => {
    // Mock fetch to simulate network error
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
    
    const { result } = renderHook(() => useApi());
    
    await expect(result.current.system.health()).rejects.toThrow('Network error');
  });
});
```

## 🎉 Next Steps

1. **Start the development servers**:
   ```bash
   # Terminal 1: Backend
   make start
   
   # Terminal 2: Frontend
   npm run dev:frontend
   ```

2. **Test the integration**:
   - Visit `http://localhost:3000`
   - Check the dashboard loads properly
   - Verify API calls in browser network tab

3. **Customize components**:
   - Modify colors and styling in `globals.css`
   - Add your company branding
   - Customize the dashboard layout

4. **Add authentication**:
   - Implement Google OAuth flow
   - Add user sessions
   - Protect API routes

5. **Deploy to production**:
   - Build the frontend: `npm run build`
   - Set up environment variables
   - Deploy backend and frontend

The frontend is now fully integrated with your backend APIs! 🚀

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Hook Documentation](https://react.dev/reference/react)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)

---

**Happy coding!** 🎯 If you run into any issues, check the troubleshooting section or create a test API call to debug the specific endpoint.