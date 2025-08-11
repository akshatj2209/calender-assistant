# Frontend Structure (Next.js)

## Overview
The frontend provides a clean, intuitive dashboard for monitoring and configuring the Gmail Calendar Assistant. Built with Next.js 13 using Pages Router, TypeScript, and Tailwind CSS for a modern, responsive experience.

## Application Structure

```
frontend/
├── src/
│   ├── pages/                 # Next.js Pages Router
│   │   ├── _app.tsx          # App configuration
│   │   ├── index.tsx         # Dashboard home
│   │   ├── login.tsx         # Login page
│   │   ├── scheduled-responses.tsx # Scheduled responses page
│   │   └── auth/             # Authentication flows
│   │       └── callback.tsx  # OAuth callback
│   ├── components/           # Reusable UI components
│   │   ├── Auth/            # Authentication components
│   │   │   └── ProtectedRoute.tsx
│   │   ├── Calendar/        # Calendar components
│   │   │   ├── CalendarView.tsx
│   │   │   └── EventCard.tsx
│   │   ├── Dashboard/       # Dashboard components
│   │   │   ├── Dashboard.tsx
│   │   │   └── StatsCards.tsx
│   │   ├── Email/          # Email management
│   │   │   ├── EmailCard.tsx
│   │   │   └── EmailList.tsx
│   │   ├── Layout/         # Layout components
│   │   │   └── Header.tsx
│   │   ├── ScheduledResponses/ # Response management
│   │   │   ├── ScheduledResponseCard.tsx
│   │   │   ├── ScheduledResponseEditModal.tsx
│   │   │   └── ScheduledResponsesList.tsx
│   │   └── UI/             # Base UI components
│   │       └── LoadingSpinner.tsx
│   ├── hooks/              # Custom React hooks
│   │   ├── useApi.ts       # API client hook
│   │   ├── useAuth.ts      # Authentication hook
│   │   └── useUser.ts      # User management hook
│   ├── types/              # TypeScript type definitions
│   │   ├── api.ts          # API response types
│   │   ├── calendar.ts     # Calendar types
│   │   ├── dashboard.ts    # Dashboard types
│   │   ├── email.ts        # Email types
│   │   ├── index.ts        # Main types export
│   │   └── user.ts         # User types
│   ├── styles/             # Styling
│   │   └── globals.css     # Global styles with Tailwind
│   └── utils/              # Utility functions
├── public/                 # Static assets
├── next.config.js          # Next.js configuration
├── tailwind.config.js      # Tailwind CSS configuration
└── tsconfig.json           # TypeScript configuration
```

## Core Pages & Features

### 1. Dashboard Overview (`/` - index.tsx)
**Purpose**: Real-time monitoring of email processing and system status

```typescript
const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const api = useApi();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto py-6 px-4">
        <h1 className="text-3xl font-bold mb-8">Gmail Assistant Dashboard</h1>
        
        <StatsCards />
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          <EmailList />
          <CalendarView />
        </div>
      </main>
    </div>
  );
};
```

#### Key Components:
- **StatsCards**: Display email processing statistics and metrics
- **EmailList**: Show recent processed emails with status indicators
- **CalendarView**: Display upcoming calendar events
- **Header**: Navigation and user authentication status

### 2. Scheduled Responses (`/scheduled-responses`)
**Purpose**: Manage and monitor scheduled email responses

```typescript
const ScheduledResponsesPage = () => {
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto py-6 px-4">
        <h1 className="text-2xl font-bold mb-6">Scheduled Responses</h1>
        
        <ScheduledResponsesList 
          responses={responses}
          onEdit={handleEdit}
          onCancel={handleCancel}
        />
        
        <ScheduledResponseEditModal />
      </main>
    </div>
  );
};
```

#### Features:
- **ScheduledResponsesList**: Display all scheduled email responses
- **Response Status**: Draft, scheduled, sent, cancelled status indicators
- **Edit Modal**: Modify response content and timing before sending
- **Response Management**: Cancel or reschedule pending responses

### 3. Authentication Pages
#### Login Page (`/login`)
```typescript
const LoginPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold">Gmail Calendar Assistant</h2>
          <p className="mt-2 text-gray-600">Sign in with your Google account</p>
        </div>
        
        <GoogleOAuthButton />
      </div>
    </div>
  );
};
```

#### OAuth Callback (`/auth/callback`)
```typescript
const AuthCallback = () => {
  const router = useRouter();
  const { code } = router.query;
  
  useEffect(() => {
    if (code) {
      handleAuthCallback(code);
    }
  }, [code]);
  
  return <div>Processing authentication...</div>;
};
```

#### Features:
- **Google OAuth Integration**: Secure authentication with Google accounts
- **Automatic Redirection**: Redirect to dashboard after successful login
- **Error Handling**: Display authentication errors gracefully

## Custom Hooks

### useApi Hook
**Purpose**: Centralized API client for all backend communication

```typescript
const useApi = () => {
  const baseUrl = 'http://localhost:3001';
  
  return {
    users: {
      findOrCreate: (userData) => request('/api/users/find-or-create', { method: 'POST', body: userData }),
      getById: (id) => request(`/api/users/${id}`)
    },
    emails: {
      getStats: (params) => request('/api/emails/stats', { params }),
      search: (params) => request('/api/emails', { params })
    },
    calendarEvents: {
      getStats: (params) => request('/api/calendar-events/stats', { params }),
      getUpcoming: (params) => request('/api/calendar-events/upcoming', { params })
    }
  };
};
```

### useUser Hook
**Purpose**: User session management and automatic user creation

```typescript
const useUser = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    initializeUser();
  }, []);
  
  return { user, loading, setUser };
};
```

## Component Architecture

### Base UI Components (`/components/ui`)
Reusable components following design system principles:

```typescript
// Button component with variants
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'danger' | 'ghost';
  size: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
}

// Card component for consistent layouts
interface CardProps {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

// Status badge for system states
interface StatusBadgeProps {
  status: 'success' | 'warning' | 'error' | 'info';
  text: string;
  pulse?: boolean;
}
```

### Dashboard Components (`/components/dashboard`)
Specialized components for dashboard functionality:

```typescript
// Metrics card with trending indicators
const MetricCard = ({ 
  title, 
  value, 
  change, 
  trend, 
  icon 
}: MetricCardProps) => {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
        <div className="text-primary-500">
          {icon}
        </div>
      </div>
      {change && (
        <div className="mt-2 flex items-center text-sm">
          <TrendIcon trend={trend} />
          <span className={`ml-1 ${getTrendColor(trend)}`}>
            {Math.abs(change)}% from last period
          </span>
        </div>
      )}
    </Card>
  );
};

// Activity timeline component
const ActivityTimeline = ({ activities }: ActivityTimelineProps) => {
  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <div key={activity.id} className="flex items-start space-x-3">
          <StatusIcon status={activity.status} />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-900">{activity.description}</p>
            <p className="text-xs text-gray-500">
              {formatDistanceToNow(activity.timestamp)} ago
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};
```

### Form Components (`/components/forms`)
Intelligent form components with validation:

```typescript
// Business rules form with validation
const BusinessRulesForm = () => {
  const { register, handleSubmit, formState: { errors } } = useForm<BusinessRules>();
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <FormSection title="Working Hours">
        <div className="grid grid-cols-2 gap-4">
          <TimeInput
            label="Start Time"
            {...register('businessHours.start', { required: true })}
            error={errors.businessHours?.start}
          />
          <TimeInput
            label="End Time"
            {...register('businessHours.end', { required: true })}
            error={errors.businessHours?.end}
          />
        </div>
      </FormSection>
      
      <FormSection title="Buffer Times">
        <SliderInput
          label="Standard Buffer (minutes)"
          min={15}
          max={120}
          step={15}
          {...register('bufferTime')}
        />
      </FormSection>
    </form>
  );
};
```

## Custom Hooks

### Data Fetching Hooks
```typescript
// Hook for real-time metrics
const useMetrics = (refreshInterval: number = 30000) => {
  const [metrics, setMetrics] = useState<MonitoringMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch('/api/metrics');
        const data = await response.json();
        setMetrics(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    
    fetchMetrics();
    const interval = setInterval(fetchMetrics, refreshInterval);
    
    return () => clearInterval(interval);
  }, [refreshInterval]);
  
  return { metrics, loading, error, refetch: () => fetchMetrics() };
};

// Hook for system status monitoring
const useSystemStatus = () => {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  
  useEffect(() => {
    const eventSource = new EventSource('/api/status/stream');
    
    eventSource.onmessage = (event) => {
      const statusData = JSON.parse(event.data);
      setStatus(statusData);
    };
    
    return () => eventSource.close();
  }, []);
  
  return status;
};
```

### Configuration Hooks
```typescript
// Hook for managing configuration
const useConfiguration = () => {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [saving, setSaving] = useState(false);
  
  const saveConfig = async (newConfig: Partial<AppConfig>) => {
    setSaving(true);
    try {
      await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig)
      });
      setConfig(prev => prev ? { ...prev, ...newConfig } : null);
    } finally {
      setSaving(false);
    }
  };
  
  const testConnection = async (service: 'gmail' | 'calendar' | 'openai') => {
    const response = await fetch(`/api/test/${service}`);
    return response.json();
  };
  
  return { config, saveConfig, testConnection, saving };
};
```

## State Management

### Context Providers
```typescript
// Global app context
const AppContext = createContext<{
  user: User | null;
  systemStatus: SystemStatus;
  notifications: Notification[];
}>({
  user: null,
  systemStatus: { isRunning: false, lastCheck: new Date(), uptime: 0 },
  notifications: []
});

// Configuration context
const ConfigContext = createContext<{
  config: AppConfig | null;
  updateConfig: (updates: Partial<AppConfig>) => Promise<void>;
  resetConfig: () => Promise<void>;
}>({
  config: null,
  updateConfig: async () => {},
  resetConfig: async () => {}
});
```

## Real-time Features

### WebSocket Integration
```typescript
// Real-time updates hook
const useRealtimeUpdates = () => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:3001/ws');
    
    ws.onmessage = (event) => {
      const update = JSON.parse(event.data);
      
      switch (update.type) {
        case 'email_processed':
          // Update email list
          break;
        case 'response_sent':
          // Update metrics
          break;
        case 'system_status':
          // Update status indicators
          break;
      }
    };
    
    setSocket(ws);
    return () => ws.close();
  }, []);
  
  return socket;
};
```

## Performance Optimizations

### Code Splitting
```typescript
// Lazy load heavy components
const EmailAnalytics = lazy(() => import('@/components/EmailAnalytics'));
const ConfigurationPanel = lazy(() => import('@/components/ConfigurationPanel'));

// Route-based code splitting
const DashboardPage = dynamic(() => import('@/pages/dashboard'), {
  loading: () => <DashboardSkeleton />
});
```

### Caching Strategy
```typescript
// SWR for data fetching with caching
const useEmails = (filter: EmailFilter) => {
  const { data, error, mutate } = useSWR(
    ['/api/emails', filter],
    ([url, filter]) => fetcher(url, { params: filter }),
    {
      refreshInterval: 30000,
      revalidateOnFocus: false
    }
  );
  
  return {
    emails: data?.emails || [],
    loading: !error && !data,
    error,
    refetch: mutate
  };
};
```

## Responsive Design

### Mobile-First Approach
```typescript
// Responsive dashboard layout
const ResponsiveDashboard = () => {
  return (
    <div className="p-4 md:p-6 lg:p-8">
      {/* Mobile: Stack vertically */}
      <div className="space-y-4 md:space-y-6">
        {/* Tablet/Desktop: Grid layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          <MetricsCard className="col-span-full md:col-span-1" />
          <StatusCard className="col-span-full md:col-span-1" />
          <ActivityCard className="col-span-full md:col-span-1 lg:col-span-1" />
        </div>
      </div>
    </div>
  );
};
```

This frontend structure provides a comprehensive, user-friendly interface for managing the Gmail Calendar Assistant while maintaining high performance and excellent user experience.