# Scheduling Algorithm Design

## Overview
The scheduling algorithm is responsible for finding optimal meeting times based on calendar availability, user preferences, and business rules. It uses a multi-phase approach to ensure high-quality suggestions.

## Core Algorithm Phases

### Phase 1: Availability Discovery
**Purpose**: Identify all free time slots within the specified timeframe

```typescript
interface AvailabilityQuery {
  startDate: Date;
  endDate: Date; // Max 5 business days ahead
  duration: number; // Meeting duration in minutes
  timezone: string;
  includeWeekends?: boolean;
}

interface AvailabilitySlot {
  start: Date;
  end: Date;
  isAvailable: boolean;
  bufferNeeded: boolean;
  conflictingEvents: CalendarEvent[];
  score: number; // Quality score (0-100)
}

const findAvailableSlots = async (query: AvailabilityQuery): Promise<AvailabilitySlot[]> => {
  // 1. Get calendar events for the time range
  const events = await calendarService.getEvents(query.startDate, query.endDate);
  
  // 2. Generate time grid with business hours constraints
  const timeGrid = generateBusinessHoursGrid(query);
  
  // 3. Apply calendar conflicts
  const availableSlots = applyCalendarConflicts(timeGrid, events);
  
  // 4. Apply buffer time requirements
  const bufferedSlots = applyBufferTimeRules(availableSlots, events);
  
  // 5. Score each slot based on quality factors
  return scoreAvailabilitySlots(bufferedSlots, query);
};
```

### Phase 2: Business Rules Application
**Purpose**: Filter slots based on business constraints

```typescript
interface BusinessConstraints {
  businessHours: {
    start: string; // "09:00"
    end: string;   // "17:00"
  };
  workingDays: number[]; // [1,2,3,4,5] for Mon-Fri
  meetingDuration: number;
  bufferTime: number;
  travelBufferTime: number;
  maxAdvanceNotice: number; // hours
  minAdvanceNotice: number; // hours
  timezone: string;
}

const applyBusinessRules = (
  slots: AvailabilitySlot[],
  constraints: BusinessConstraints,
  preferences: TimePreference
): AvailabilitySlot[] => {
  return slots.filter(slot => {
    // 1. Business hours check
    if (!isWithinBusinessHours(slot, constraints)) {
      return false;
    }
    
    // 2. Working days check
    const dayOfWeek = slot.start.getDay();
    if (!constraints.workingDays.includes(dayOfWeek)) {
      return false;
    }
    
    // 3. Advance notice check
    const hoursUntilMeeting = (slot.start.getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntilMeeting < constraints.minAdvanceNotice || 
        hoursUntilMeeting > constraints.maxAdvanceNotice) {
      return false;
    }
    
    // 4. Sufficient duration check
    const slotDuration = (slot.end.getTime() - slot.start.getTime()) / (1000 * 60);
    if (slotDuration < constraints.meetingDuration) {
      return false;
    }
    
    return true;
  });
};
```

### Phase 3: Preference Matching
**Purpose**: Rank slots based on user preferences

```typescript
interface PreferenceScoring {
  preferredDayMatch: number;      // 30 points
  preferredTimeMatch: number;     // 25 points
  timeRangeMatch: number;         // 20 points
  urgencyAlignment: number;       // 15 points
  bufferOptimization: number;     // 10 points
}

const scorePreferenceMatch = (
  slot: AvailabilitySlot, 
  preferences: TimePreference
): number => {
  let score = 0;
  const maxScore = 100;
  
  // Preferred day matching (30 points)
  if (preferences.preferredDays?.length) {
    const slotDay = slot.start.getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const slotDayName = dayNames[slotDay];
    
    if (preferences.preferredDays.includes(slotDayName)) {
      score += 30;
    }
  } else {
    score += 15; // Neutral score if no preference
  }
  
  // Time range matching (25 points)
  if (preferences.timeRange) {
    const slotHour = slot.start.getHours();
    const timeRangeScores = {
      'morning': slotHour >= 9 && slotHour < 12 ? 25 : 0,
      'afternoon': slotHour >= 13 && slotHour < 17 ? 25 : 0,
      'evening': slotHour >= 17 && slotHour < 19 ? 25 : 0,
      'flexible': 15 // Neutral score
    };
    score += timeRangeScores[preferences.timeRange] || 0;
  } else {
    score += 15;
  }
  
  // Specific time matching (20 points)
  if (preferences.preferredTimes?.length) {
    const hasTimeMatch = preferences.preferredTimes.some(prefTime => {
      return matchesPreferredTime(slot.start, prefTime);
    });
    score += hasTimeMatch ? 20 : 0;
  } else {
    score += 10;
  }
  
  // Urgency alignment (15 points)
  const urgencyScores = {
    high: isWithinNextDay(slot.start) ? 15 : 5,
    medium: isWithinNextTwoDays(slot.start) ? 15 : 10,
    low: 15 // All times are good for low urgency
  };
  score += urgencyScores[preferences.urgency] || 10;
  
  // Buffer optimization (10 points)
  // Prefer slots with minimal required buffer time
  score += slot.bufferNeeded ? 5 : 10;
  
  return Math.min(score, maxScore);
};
```

### Phase 4: Optimal Selection
**Purpose**: Select the best 2-3 time slots to propose

```typescript
interface SelectionCriteria {
  maxSuggestions: number; // Usually 3
  minSpacingHours: number; // Avoid suggesting too close times
  diversifyDays: boolean; // Prefer different days
  diversifyTimes: boolean; // Prefer different times of day
}

const selectOptimalSlots = (
  scoredSlots: AvailabilitySlot[],
  criteria: SelectionCriteria
): AvailabilitySlot[] => {
  // 1. Sort by score (highest first)
  const sortedSlots = scoredSlots.sort((a, b) => b.score - a.score);
  
  // 2. Apply selection logic
  const selectedSlots: AvailabilitySlot[] = [];
  
  for (const slot of sortedSlots) {
    if (selectedSlots.length >= criteria.maxSuggestions) {
      break;
    }
    
    // Check spacing constraint
    const hasConflict = selectedSlots.some(selected => {
      const timeDiff = Math.abs(slot.start.getTime() - selected.start.getTime());
      const hoursDiff = timeDiff / (1000 * 60 * 60);
      return hoursDiff < criteria.minSpacingHours;
    });
    
    if (hasConflict) {
      continue;
    }
    
    // Check diversity constraints
    if (criteria.diversifyDays) {
      const sameDay = selectedSlots.some(selected => 
        slot.start.toDateString() === selected.start.toDateString()
      );
      if (sameDay && selectedSlots.length > 0) {
        continue;
      }
    }
    
    selectedSlots.push(slot);
  }
  
  // 3. Ensure minimum quality threshold
  return selectedSlots.filter(slot => slot.score >= 50);
};
```

## Buffer Time Algorithms

### Standard Buffer Time
```typescript
const calculateBufferTime = (
  currentEvent: CalendarEvent,
  nextEvent?: CalendarEvent,
  previousEvent?: CalendarEvent
): number => {
  let bufferMinutes = 30; // Default buffer
  
  // Increase buffer for in-person meetings
  if (currentEvent.isInPersonMeeting()) {
    bufferMinutes = Math.max(bufferMinutes, 60);
  }
  
  // Increase buffer if travel is required
  if (nextEvent && requiresTravel(currentEvent, nextEvent)) {
    bufferMinutes = Math.max(bufferMinutes, 90);
  }
  
  // Reduce buffer for back-to-back virtual meetings
  if (nextEvent && 
      !currentEvent.isInPersonMeeting() && 
      !nextEvent.isInPersonMeeting()) {
    bufferMinutes = Math.min(bufferMinutes, 15);
  }
  
  return bufferMinutes;
};

const requiresTravel = (event1: CalendarEvent, event2: CalendarEvent): boolean => {
  if (!event1.location || !event2.location) return false;
  
  // Simple heuristic: different non-virtual locations require travel
  return event1.isInPersonMeeting() && 
         event2.isInPersonMeeting() &&
         event1.location !== event2.location;
};
```

### Intelligent Buffer Sizing
```typescript
interface BufferContext {
  meetingType: 'demo' | 'internal' | 'customer' | 'interview';
  attendeeCount: number;
  isVirtual: boolean;
  previousMeetingType?: string;
  nextMeetingType?: string;
}

const getIntelligentBuffer = (context: BufferContext): number => {
  let buffer = 30; // Base buffer
  
  // Meeting type adjustments
  const typeMultipliers = {
    'demo': 1.2,      // Demos may run long
    'internal': 0.8,   // Internal meetings more predictable
    'customer': 1.1,   // Customer meetings need prep time
    'interview': 1.3   // Interviews need prep and notes
  };
  
  buffer *= typeMultipliers[context.meetingType] || 1.0;
  
  // Virtual meeting buffer reduction
  if (context.isVirtual) {
    buffer *= 0.7;
  }
  
  // Large meeting buffer increase (more coordination needed)
  if (context.attendeeCount > 5) {
    buffer *= 1.3;
  }
  
  return Math.round(Math.max(buffer, 15)); // Minimum 15 minutes
};
```

## Conflict Detection

### Event Overlap Detection
```typescript
const detectConflicts = (
  proposedSlot: TimeSlot,
  existingEvents: CalendarEvent[]
): CalendarEvent[] => {
  return existingEvents.filter(event => {
    // Skip cancelled or declined events
    if (event.isCancelled() || event.isDeclined()) {
      return false;
    }
    
    const eventStart = event.getStartDate();
    const eventEnd = event.getEndDate();
    
    // Check for any time overlap
    return (proposedSlot.start < eventEnd && proposedSlot.end > eventStart);
  });
};
```

### Smart Conflict Resolution
```typescript
const findNearestAlternative = (
  conflictedSlot: TimeSlot,
  conflicts: CalendarEvent[],
  preferences: TimePreference
): TimeSlot[] => {
  const alternatives: TimeSlot[] = [];
  
  // Try slots after the conflicting event
  const lastConflictEnd = Math.max(
    ...conflicts.map(e => e.getEndDate().getTime())
  );
  
  const afterConflict = {
    start: new Date(lastConflictEnd + 30 * 60 * 1000), // 30 min buffer
    end: new Date(lastConflictEnd + (30 + 30) * 60 * 1000), // Meeting duration
    timezone: conflictedSlot.timezone
  };
  
  // Try slots before the conflicting event
  const firstConflictStart = Math.min(
    ...conflicts.map(e => e.getStartDate().getTime())
  );
  
  const beforeConflict = {
    start: new Date(firstConflictStart - (30 + 30) * 60 * 1000), // Duration + buffer
    end: new Date(firstConflictStart - 30 * 60 * 1000), // 30 min buffer
    timezone: conflictedSlot.timezone
  };
  
  // Validate alternatives against business rules
  [afterConflict, beforeConflict].forEach(alt => {
    if (isValidBusinessHoursSlot(alt) && alt.start > new Date()) {
      alternatives.push(alt);
    }
  });
  
  return alternatives;
};
```

## Quality Scoring System

### Comprehensive Slot Scoring
```typescript
interface QualityFactors {
  preferenceMatch: number;    // 0-40 points
  businessAlignment: number;  // 0-25 points
  calendarOptimization: number; // 0-20 points
  bufferEfficiency: number;   // 0-15 points
}

const calculateQualityScore = (
  slot: AvailabilitySlot,
  preferences: TimePreference,
  businessRules: BusinessConstraints,
  context: CalendarEvent[]
): number => {
  const factors: QualityFactors = {
    preferenceMatch: scorePreferenceMatch(slot, preferences),
    businessAlignment: scoreBusinessAlignment(slot, businessRules),
    calendarOptimization: scoreCalendarOptimization(slot, context),
    bufferEfficiency: scoreBufferEfficiency(slot, context)
  };
  
  // Weighted total
  return Math.round(
    factors.preferenceMatch * 0.4 +
    factors.businessAlignment * 0.25 +
    factors.calendarOptimization * 0.2 +
    factors.bufferEfficiency * 0.15
  );
};

const scoreBusinessAlignment = (
  slot: AvailabilitySlot,
  rules: BusinessConstraints
): number => {
  let score = 25; // Perfect score baseline
  
  const slotHour = slot.start.getHours();
  const businessStart = parseInt(rules.businessHours.start.split(':')[0]);
  const businessEnd = parseInt(rules.businessHours.end.split(':')[0]);
  
  // Penalize slots near business hours boundaries
  if (slotHour === businessStart || slotHour >= businessEnd - 1) {
    score -= 10; // Edge of business hours
  }
  
  // Prefer mid-day slots (better availability)
  const midDay = (businessStart + businessEnd) / 2;
  const distanceFromMid = Math.abs(slotHour - midDay);
  score -= distanceFromMid * 2;
  
  return Math.max(score, 0);
};

const scoreCalendarOptimization = (
  slot: AvailabilitySlot,
  context: CalendarEvent[]
): number => {
  let score = 20; // Perfect score baseline
  
  // Find adjacent events
  const beforeEvent = findEventEndingBefore(slot.start, context);
  const afterEvent = findEventStartingAfter(slot.end, context);
  
  // Penalize tight scheduling
  if (beforeEvent) {
    const gapBefore = (slot.start.getTime() - beforeEvent.getEndDate().getTime()) / (1000 * 60);
    if (gapBefore < 60) score -= 5; // Less than 1 hour gap
  }
  
  if (afterEvent) {
    const gapAfter = (afterEvent.getStartDate().getTime() - slot.end.getTime()) / (1000 * 60);
    if (gapAfter < 60) score -= 5; // Less than 1 hour gap
  }
  
  // Bonus for grouping meetings together
  if (beforeEvent && afterEvent) {
    score += 3; // Efficient calendar block
  }
  
  return Math.max(score, 0);
};
```

## Performance Optimizations

### Caching Strategy
```typescript
interface AvailabilityCache {
  key: string; // Hash of query parameters
  data: AvailabilitySlot[];
  timestamp: Date;
  ttl: number; // Time to live in minutes
}

const cacheAvailability = new Map<string, AvailabilityCache>();

const getCachedAvailability = (query: AvailabilityQuery): AvailabilitySlot[] | null => {
  const key = generateCacheKey(query);
  const cached = cacheAvailability.get(key);
  
  if (!cached) return null;
  
  const isExpired = (Date.now() - cached.timestamp.getTime()) > (cached.ttl * 60 * 1000);
  if (isExpired) {
    cacheAvailability.delete(key);
    return null;
  }
  
  return cached.data;
};
```

### Parallel Processing
```typescript
const processAvailabilityInParallel = async (
  queries: AvailabilityQuery[]
): Promise<AvailabilitySlot[][]> => {
  const promises = queries.map(async query => {
    // Check cache first
    const cached = getCachedAvailability(query);
    if (cached) return cached;
    
    // Process availability
    return findAvailableSlots(query);
  });
  
  return Promise.all(promises);
};
```

This comprehensive scheduling algorithm ensures high-quality meeting suggestions while maintaining performance and respecting all business constraints and user preferences.