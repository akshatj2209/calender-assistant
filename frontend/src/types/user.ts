// User-related types for frontend

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  hasGoogleTokens: boolean;
}

export interface UserConfig {
  id?: string;
  salesName?: string;
  salesEmail?: string;
  companyName?: string;
  emailSignature?: string;
  businessHoursStart?: string;
  businessHoursEnd?: string;
  workingDays?: number[];
  timezone?: string;
  meetingDuration?: number;
  bufferTime?: number;
}

export interface UserStats {
  totalEmails: number;
  demoRequests: number;
  responsesSent: number;
  scheduledMeetings: number;
  period: number;
}