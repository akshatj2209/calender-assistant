import { CalendarEventRecord, CalendarEventStatus, AttendeeResponse, Prisma } from '@prisma/client';
import { BaseRepository } from './BaseRepository';

export interface CreateCalendarEventData {
  userId: string;
  emailRecordId?: string;
  googleEventId: string;
  calendarId?: string;
  summary: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  timezone: string;
  location?: string;
  attendeeEmail: string;
  attendeeName?: string;
  isDemo?: boolean;
  meetingType?: string;
}

export interface UpdateCalendarEventData {
  summary?: string;
  description?: string;
  startTime?: Date;
  endTime?: Date;
  timezone?: string;
  location?: string;
  status?: CalendarEventStatus;
  attendeeResponse?: AttendeeResponse;
}

export interface CalendarEventSearchOptions {
  userId?: string;
  emailRecordId?: string;
  attendeeEmail?: string;
  status?: CalendarEventStatus;
  isDemo?: boolean;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class CalendarRepository extends BaseRepository<CalendarEventRecord> {
  
  async create(data: CreateCalendarEventData): Promise<CalendarEventRecord> {
    return this.prisma.calendarEventRecord.create({
      data: {
        ...data,
        calendarId: data.calendarId || 'primary',
        isDemo: data.isDemo || false
      }
    });
  }

  async findById(id: string): Promise<CalendarEventRecord | null> {
    return this.prisma.calendarEventRecord.findUnique({
      where: { id },
      include: {
        emailRecord: true,
        user: {
          select: {
            email: true,
            name: true
          }
        }
      }
    });
  }

  async findByGoogleEventId(googleEventId: string, calendarId: string = 'primary'): Promise<CalendarEventRecord | null> {
    return this.prisma.calendarEventRecord.findUnique({
      where: {
        googleEventId_calendarId: {
          googleEventId,
          calendarId
        }
      }
    });
  }

  async update(id: string, data: UpdateCalendarEventData): Promise<CalendarEventRecord> {
    return this.prisma.calendarEventRecord.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date()
      }
    });
  }

  async updateByGoogleEventId(
    googleEventId: string, 
    calendarId: string = 'primary', 
    data: UpdateCalendarEventData
  ): Promise<CalendarEventRecord> {
    return this.prisma.calendarEventRecord.update({
      where: {
        googleEventId_calendarId: {
          googleEventId,
          calendarId
        }
      },
      data: {
        ...data,
        updatedAt: new Date()
      }
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.calendarEventRecord.delete({
      where: { id }
    });
  }

  async deleteByGoogleEventId(googleEventId: string, calendarId: string = 'primary'): Promise<void> {
    await this.prisma.calendarEventRecord.delete({
      where: {
        googleEventId_calendarId: {
          googleEventId,
          calendarId
        }
      }
    });
  }

  async findMany(options?: CalendarEventSearchOptions): Promise<CalendarEventRecord[]> {
    const where: Prisma.CalendarEventRecordWhereInput = {};

    if (options?.userId) where.userId = options.userId;
    if (options?.emailRecordId) where.emailRecordId = options.emailRecordId;
    if (options?.attendeeEmail) where.attendeeEmail = options.attendeeEmail;
    if (options?.status) where.status = options.status;
    if (options?.isDemo !== undefined) where.isDemo = options.isDemo;

    if (options?.startDate || options?.endDate) {
      where.startTime = this.getDateRangeFilter(options.startDate, options.endDate);
    }

    const queryOptions: Prisma.CalendarEventRecordFindManyArgs = {
      where,
      include: {
        emailRecord: true,
        user: {
          select: {
            email: true,
            name: true
          }
        }
      }
    };

    const paginationOptions = this.getPaginationOptions(options?.page, options?.limit);
    const sortOptions = this.getSortOptions(options?.sortBy || 'startTime', options?.sortOrder || 'asc');
    
    Object.assign(queryOptions, paginationOptions, sortOptions);

    return this.prisma.calendarEventRecord.findMany(queryOptions);
  }

  async findUpcomingEvents(userId?: string, days: number = 7): Promise<CalendarEventRecord[]> {
    const now = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    return this.findMany({
      userId,
      startDate: now,
      endDate,
      sortBy: 'startTime',
      sortOrder: 'asc'
    });
  }

  async findDemoEvents(userId?: string, options?: {
    startDate?: Date;
    endDate?: Date;
    status?: CalendarEventStatus;
    limit?: number;
  }): Promise<CalendarEventRecord[]> {
    return this.findMany({
      userId,
      isDemo: true,
      startDate: options?.startDate,
      endDate: options?.endDate,
      status: options?.status,
      limit: options?.limit,
      sortBy: 'startTime',
      sortOrder: 'desc'
    });
  }

  async findEventsByAttendee(attendeeEmail: string, options?: {
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<CalendarEventRecord[]> {
    return this.findMany({
      attendeeEmail,
      startDate: options?.startDate,
      endDate: options?.endDate,
      limit: options?.limit,
      sortBy: 'startTime',
      sortOrder: 'desc'
    });
  }

  async findEventsInTimeRange(
    userId: string,
    startTime: Date,
    endTime: Date
  ): Promise<CalendarEventRecord[]> {
    return this.prisma.calendarEventRecord.findMany({
      where: {
        userId,
        OR: [
          // Event starts within the range
          {
            startTime: {
              gte: startTime,
              lt: endTime
            }
          },
          // Event ends within the range
          {
            endTime: {
              gt: startTime,
              lte: endTime
            }
          },
          // Event spans the entire range
          {
            startTime: { lte: startTime },
            endTime: { gte: endTime }
          }
        ]
      },
      orderBy: {
        startTime: 'asc'
      }
    });
  }

  async updateAttendeeResponse(id: string, response: AttendeeResponse): Promise<CalendarEventRecord> {
    return this.update(id, {
      attendeeResponse: response
    });
  }

  async markEventCancelled(id: string): Promise<CalendarEventRecord> {
    return this.update(id, {
      status: CalendarEventStatus.CANCELLED
    });
  }

  async markEventConfirmed(id: string): Promise<CalendarEventRecord> {
    return this.update(id, {
      status: CalendarEventStatus.CONFIRMED
    });
  }

  // Get calendar statistics for a user
  async getCalendarStats(userId: string, days: number = 30): Promise<{
    totalEvents: number;
    demoEvents: number;
    confirmedEvents: number;
    cancelledEvents: number;
    upcomingEvents: number;
    attendeeResponses: {
      accepted: number;
      declined: number;
      tentative: number;
      needsAction: number;
    };
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const now = new Date();

    const [totalStats, demoStats, statusStats, upcomingStats, responseStats] = await Promise.all([
      this.prisma.calendarEventRecord.aggregate({
        where: {
          userId,
          createdAt: { gte: startDate }
        },
        _count: { id: true }
      }),
      this.prisma.calendarEventRecord.aggregate({
        where: {
          userId,
          isDemo: true,
          createdAt: { gte: startDate }
        },
        _count: { id: true }
      }),
      this.prisma.calendarEventRecord.groupBy({
        by: ['status'],
        where: {
          userId,
          createdAt: { gte: startDate }
        },
        _count: { id: true }
      }),
      this.prisma.calendarEventRecord.aggregate({
        where: {
          userId,
          startTime: { gte: now }
        },
        _count: { id: true }
      }),
      this.prisma.calendarEventRecord.groupBy({
        by: ['attendeeResponse'],
        where: {
          userId,
          createdAt: { gte: startDate }
        },
        _count: { id: true }
      })
    ]);

    const result = {
      totalEvents: totalStats._count.id || 0,
      demoEvents: demoStats._count.id || 0,
      confirmedEvents: 0,
      cancelledEvents: 0,
      upcomingEvents: upcomingStats._count.id || 0,
      attendeeResponses: {
        accepted: 0,
        declined: 0,
        tentative: 0,
        needsAction: 0
      }
    };

    statusStats.forEach(stat => {
      switch (stat.status) {
        case CalendarEventStatus.CONFIRMED:
          result.confirmedEvents = stat._count.id;
          break;
        case CalendarEventStatus.CANCELLED:
          result.cancelledEvents = stat._count.id;
          break;
      }
    });

    responseStats.forEach(stat => {
      switch (stat.attendeeResponse) {
        case AttendeeResponse.ACCEPTED:
          result.attendeeResponses.accepted = stat._count.id;
          break;
        case AttendeeResponse.DECLINED:
          result.attendeeResponses.declined = stat._count.id;
          break;
        case AttendeeResponse.TENTATIVE:
          result.attendeeResponses.tentative = stat._count.id;
          break;
        case AttendeeResponse.NEEDS_ACTION:
          result.attendeeResponses.needsAction = stat._count.id;
          break;
      }
    });

    return result;
  }

  // Create or update calendar event (upsert based on Google event ID)
  async upsertByGoogleEventId(
    googleEventId: string,
    calendarId: string = 'primary',
    data: CreateCalendarEventData
  ): Promise<CalendarEventRecord> {
    return this.prisma.calendarEventRecord.upsert({
      where: {
        googleEventId_calendarId: {
          googleEventId,
          calendarId
        }
      },
      create: data,
      update: {
        ...data,
        updatedAt: new Date()
      }
    });
  }

  // Clean up old events (older than specified days)
  async cleanupOldEvents(days: number = 365): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await this.prisma.calendarEventRecord.deleteMany({
      where: {
        endTime: {
          lt: cutoffDate
        }
      }
    });

    return result.count;
  }
}