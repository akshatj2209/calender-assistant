// Dashboard-related types for frontend

import type { Email } from './email';
import type { CalendarEvent } from './calendar';

export interface DashboardData {
  emails: Email[];
  calendarEvents: CalendarEvent[];
  stats: DashboardStats;
}

export interface DashboardStats {
  totalEmails: number;
  demoRequests: number;
  scheduledMeetings: number;
  responseRate: number;
}

export type DashboardTab = 'overview' | 'emails' | 'calendar' | 'scheduled-responses';

export interface StatsCardProps {
  stats: DashboardStats;
}