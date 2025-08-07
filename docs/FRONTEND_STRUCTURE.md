# Frontend Structure (Next.js)

## Overview
The frontend provides a clean, intuitive dashboard for monitoring and configuring the Gmail Calendar Assistant. Built with Next.js 14, TypeScript, and Tailwind CSS for a modern, responsive experience.

## Application Structure

```
frontend/
├── src/
│   ├── app/                    # App Router (Next.js 14)
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Dashboard home
│   │   ├── dashboard/         # Main dashboard views
│   │   ├── settings/          # Configuration pages
│   │   ├── auth/              # Authentication flows
│   │   └── api/               # API route handlers
│   ├── components/            # Reusable UI components
│   │   ├── ui/               # Base UI components
│   │   ├── dashboard/        # Dashboard-specific components
│   │   ├── forms/            # Form components
│   │   └── layout/           # Layout components
│   ├── hooks/                # Custom React hooks
│   ├── utils/                # Utility functions
│   ├── types/                # TypeScript type definitions
│   └── lib/                  # External library configurations
├── public/                   # Static assets
└── styles/                   # Global styles
```

## Core Pages & Features

### 1. Dashboard Overview (`/dashboard`)
**Purpose**: Real-time monitoring of email processing and system status

```typescript
interface DashboardProps {
  metrics: MonitoringMetrics;
  recentActivity: RecentActivity[];
  systemStatus: SystemStatus;
}

const Dashboard = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Key Metrics Cards */}
      <MetricsOverview />
      
      {/* System Status */}
      <SystemStatusCard />
      
      {/* Recent Activity Feed */}
      <RecentActivityFeed />
      
      {/* Email Processing Chart */}
      <EmailProcessingChart />
      
      {/* Response Rate Analytics */}
      <ResponseRateChart />
    </div>
  );
};
```

#### Key Components:
- **MetricsOverview**: Email stats, response rates, success metrics
- **SystemStatusCard**: API connection status, uptime, health checks
- **RecentActivityFeed**: Live feed of processed emails and responses
- **EmailProcessingChart**: Visualize email volume over time
- **ResponseRateChart**: Track response success rates

### 2. Email Monitoring (`/dashboard/emails`)
**Purpose**: Detailed view of email processing and management

```typescript
const EmailMonitoring = () => {
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [filter, setFilter] = useState<EmailFilter>({});
  
  return (
    <div className="space-y-6">
      {/* Email Filters */}
      <EmailFilters onFilterChange={setFilter} />
      
      {/* Email List */}
      <EmailList 
        emails={emails}
        onReprocess={handleReprocess}
        onMarkProcessed={handleMarkProcessed}
      />
      
      {/* Email Detail Modal */}
      <EmailDetailModal />
    </div>
  );
};
```

#### Features:
- **Email List**: Sortable, filterable list of processed emails
- **Status Indicators**: Visual status (processed, pending, error)
- **Manual Reprocessing**: Admin can reprocess failed emails
- **Email Preview**: View original email content and parsed data

### 3. Settings & Configuration (`/settings`)
**Purpose**: Configure system behavior and business rules

```typescript
const Settings = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Business Rules Configuration */}
      <BusinessRulesForm />
      
      {/* Email Templates */}
      <EmailTemplatesForm />
      
      {/* API Configuration */}
      <ApiConfigurationForm />
      
      {/* Notification Settings */}
      <NotificationSettingsForm />
    </div>
  );
};
```

#### Configuration Sections:
- **Business Rules**: Working hours, buffer times, meeting preferences
- **Email Templates**: Customize response templates
- **API Settings**: Google API credentials, OpenAI configuration
- **Notifications**: Alert preferences and thresholds

### 4. Authentication (`/auth`)
**Purpose**: Secure access and Google OAuth integration

```typescript
const AuthPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Gmail Calendar Assistant</CardTitle>
          <CardDescription>
            Connect your Google account to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GoogleOAuthButton />
        </CardContent>
      </Card>
    </div>
  );
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