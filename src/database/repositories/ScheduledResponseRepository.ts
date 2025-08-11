import { Prisma, ResponseStatus, ScheduledResponse } from '@prisma/client';
import { BaseRepository } from './BaseRepository';

export interface CreateScheduledResponseData {
  userId: string;
  emailRecordId: string;
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  body: string;
  proposedTimeSlots: Prisma.InputJsonValue;
  scheduledAt: Date;
  status: ResponseStatus;
}

export interface UpdateScheduledResponseData {
  subject?: string;
  body?: string;
  proposedTimeSlots?: Prisma.InputJsonValue;
  scheduledAt?: Date;
  status?: ResponseStatus;
  sentAt?: Date;
  sentMessageId?: string;
  lastEditedAt?: Date;
  editedBy?: string;
}

export class ScheduledResponseRepository extends BaseRepository<ScheduledResponse> {
  
  async delete(id: string): Promise<void> {
    await this.prisma.scheduledResponse.delete({
      where: { id }
    });
  }

  async findMany(options?: { userId?: string; limit?: number }): Promise<ScheduledResponse[]> {
    return this.prisma.scheduledResponse.findMany({
      where: options?.userId ? { userId: options.userId } : {},
      take: options?.limit,
      orderBy: { createdAt: 'desc' }
    });
  }
  
  async create(data: CreateScheduledResponseData): Promise<ScheduledResponse> {
    return this.prisma.scheduledResponse.create({
      data
    });
  }

  async findById(id: string): Promise<ScheduledResponse | null> {
    return this.prisma.scheduledResponse.findUnique({
      where: { id },
      include: {
        emailRecord: {
          include: {
            user: {
              select: {
                email: true,
                name: true
              }
            }
          }
        }
      }
    });
  }

  async update(id: string, data: UpdateScheduledResponseData): Promise<ScheduledResponse> {
    return this.prisma.scheduledResponse.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date()
      }
    });
  }

  async findReadyToSend(limit: number = 10): Promise<ScheduledResponse[]> {
    const now = new Date();
    
    return this.prisma.scheduledResponse.findMany({
      where: {
        status: ResponseStatus.SCHEDULED,
        scheduledAt: {
          lte: now
        }
      },
      orderBy: {
        scheduledAt: 'asc'
      },
      take: limit,
      include: {
        emailRecord: {
          include: {
            user: true
          }
        }
      }
    });
  }

  async findDraftsByUser(userId: string): Promise<ScheduledResponse[]> {
    return this.prisma.scheduledResponse.findMany({
      where: {
        userId,
        status: {
          in: [ResponseStatus.DRAFT, ResponseStatus.SCHEDULED, ResponseStatus.EDITING]
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        emailRecord: true
      }
    });
  }

  async markAsSent(id: string, sentMessageId: string): Promise<ScheduledResponse> {
    return this.update(id, {
      status: ResponseStatus.SENT,
      sentAt: new Date(),
      sentMessageId
    });
  }

  async markAsFailed(id: string): Promise<ScheduledResponse> {
    return this.update(id, {
      status: ResponseStatus.FAILED
    });
  }

  async markAsScheduled(id: string): Promise<ScheduledResponse> {
    return this.update(id, {
      status: ResponseStatus.SCHEDULED
    });
  }

  async cancel(id: string): Promise<ScheduledResponse> {
    return this.update(id, {
      status: ResponseStatus.CANCELLED
    });
  }

  async markAsExpired(id: string): Promise<ScheduledResponse> {
    return this.update(id, {
      status: ResponseStatus.EXPIRED
    });
  }

  async findByEmailRecordId(emailRecordId: string): Promise<ScheduledResponse | null> {
    return this.prisma.scheduledResponse.findFirst({
      where: { emailRecordId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findSentResponsesByThreadId(threadId: string): Promise<ScheduledResponse[]> {
    return this.prisma.scheduledResponse.findMany({
      where: {
        status: ResponseStatus.SENT,
        emailRecord: {
          gmailThreadId: threadId
        }
      },
      orderBy: { sentAt: 'desc' },
      include: {
        emailRecord: true
      }
    });
  }
}