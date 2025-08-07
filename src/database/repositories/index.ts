import { UserRepository } from './UserRepository';
import { EmailRepository } from './EmailRepository';
import { CalendarRepository } from './CalendarRepository';

// Create singleton instances
export const userRepository = new UserRepository();
export const emailRepository = new EmailRepository();
export const calendarRepository = new CalendarRepository();

// Re-export repositories and types
export { UserRepository, EmailRepository, CalendarRepository };
export type { 
  CreateUserData, 
  UpdateUserData, 
  UserWithTokens 
} from './UserRepository';
export type {
  CreateEmailData,
  UpdateEmailData,
  EmailSearchOptions
} from './EmailRepository';
export type {
  CreateCalendarEventData,
  UpdateCalendarEventData,
  CalendarEventSearchOptions
} from './CalendarRepository';