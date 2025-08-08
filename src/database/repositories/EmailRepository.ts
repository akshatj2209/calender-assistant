import { EmailRecord, ProcessingStatus, Prisma } from '@prisma/client';
import { BaseRepository } from './BaseRepository';

export interface CreateEmailData {
  userId: string;
  gmailMessageId: string;
  gmailThreadId: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  receivedAt: Date;
  isDemoRequest?: boolean;
}

export interface UpdateEmailData {
  processingStatus?: ProcessingStatus;
  processedAt?: Date;
  isDemoRequest?: boolean;
  responseGenerated?: boolean;
  responseSent?: boolean;
  responseMessageId?: string;
}

export interface EmailSearchOptions {
  userId?: string;
  processingStatus?: ProcessingStatus;
  isDemoRequest?: boolean;
  responseGenerated?: boolean;
  responseSent?: boolean;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class EmailRepository extends BaseRepository<EmailRecord> {
  
  async create(data: CreateEmailData): Promise<EmailRecord> {
    return this.prisma.emailRecord.create({
      data
    });
  }

  async findById(id: string): Promise<EmailRecord | null> {
    return this.prisma.emailRecord.findUnique({
      where: { id },
      include: {
        calendarEvents: true,
        user: {
          select: {
            email: true,
            name: true
          }
        }
      }
    });
  }

  async findByGmailMessageId(gmailMessageId: string): Promise<EmailRecord | null> {
    return this.prisma.emailRecord.findUnique({
      where: { gmailMessageId }
    });
  }

  async update(id: string, data: UpdateEmailData): Promise<EmailRecord> {
    const updateData: Prisma.EmailRecordUpdateInput = {
      ...data,
      updatedAt: new Date()
    };
    return this.prisma.emailRecord.update({
      where: { id },
      data: updateData
    });
  }

  async updateByGmailMessageId(gmailMessageId: string, data: UpdateEmailData): Promise<EmailRecord> {
    const updateData: Prisma.EmailRecordUpdateInput = {
      ...data,
      updatedAt: new Date()
    };
    return this.prisma.emailRecord.update({
      where: { gmailMessageId },
      data: updateData
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.emailRecord.delete({
      where: { id }
    });
  }

  async findMany(options?: EmailSearchOptions): Promise<EmailRecord[]> {
    const where: Prisma.EmailRecordWhereInput = {};

    if (options?.userId) where.userId = options.userId;
    if (options?.processingStatus) where.processingStatus = options.processingStatus;
    if (options?.isDemoRequest !== undefined) where.isDemoRequest = options.isDemoRequest;
    if (options?.responseGenerated !== undefined) where.responseGenerated = options.responseGenerated;
    if (options?.responseSent !== undefined) where.responseSent = options.responseSent;

    if (options?.startDate || options?.endDate) {
      where.receivedAt = this.getDateRangeFilter(options.startDate, options.endDate);
    }

    const queryOptions: Prisma.EmailRecordFindManyArgs = {
      where,
      include: {
        calendarEvents: true,
        user: {
          select: {
            email: true,
            name: true
          }
        }
      }
    };

    const paginationOptions = this.getPaginationOptions(options?.page, options?.limit);
    const sortOptions = this.getSortOptions(options?.sortBy || 'receivedAt', options?.sortOrder || 'desc');
    
    Object.assign(queryOptions, paginationOptions, sortOptions);

    return this.prisma.emailRecord.findMany(queryOptions);
  }

  async findPendingEmails(userId?: string, limit: number = 10): Promise<EmailRecord[]> {
    return this.findMany({
      userId,
      processingStatus: ProcessingStatus.PENDING,
      limit,
      sortBy: 'receivedAt',
      sortOrder: 'asc'
    });
  }

  async findFailedEmails(userId?: string, limit: number = 10): Promise<EmailRecord[]> {
    return this.findMany({
      userId,
      processingStatus: ProcessingStatus.FAILED,
      limit,
      sortBy: 'updatedAt',
      sortOrder: 'desc'
    });
  }

  async findDemoRequests(userId?: string, options?: {
    responded?: boolean;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<EmailRecord[]> {
    return this.findMany({
      userId,
      isDemoRequest: true,
      responseSent: options?.responded,
      startDate: options?.startDate,
      endDate: options?.endDate,
      limit: options?.limit,
      sortBy: 'receivedAt',
      sortOrder: 'desc'
    });
  }

  async markAsProcessed(id: string, isDemoRequest?: boolean): Promise<EmailRecord> {
    return this.update(id, {
      processingStatus: ProcessingStatus.COMPLETED,
      processedAt: new Date(),
      ...(isDemoRequest !== undefined && { isDemoRequest })
    });
  }

  async markAsFailed(id: string): Promise<EmailRecord> {
    return this.update(id, {
      processingStatus: ProcessingStatus.FAILED
    });
  }

  async markResponseSent(id: string, responseMessageId: string): Promise<EmailRecord> {
    return this.update(id, {
      responseGenerated: true,
      responseSent: true,
      responseMessageId
    });
  }


  // Get statistics for a user
  async getEmailStats(userId: string, days: number = 30): Promise<{
    total: number;
    pending: number;
    processed: number;
    failed: number;
    demoRequests: number;
    responsesSent: number;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stats = await this.prisma.emailRecord.groupBy({
      by: ['processingStatus'],
      where: {
        userId,
        createdAt: { gte: startDate }
      },
      _count: {
        id: true
      }
    });

    const demoRequestStats = await this.prisma.emailRecord.aggregate({
      where: {
        userId,
        isDemoRequest: true,
        createdAt: { gte: startDate }
      },
      _count: { id: true }
    });

    const responseStats = await this.prisma.emailRecord.aggregate({
      where: {
        userId,
        responseSent: true,
        createdAt: { gte: startDate }
      },
      _count: { id: true }
    });

    const result = {
      total: 0,
      pending: 0,
      processed: 0,
      failed: 0,
      demoRequests: demoRequestStats._count.id || 0,
      responsesSent: responseStats._count.id || 0
    };

    stats.forEach(stat => {
      result.total += stat._count.id;
      
      switch (stat.processingStatus) {
        case ProcessingStatus.PENDING:
          result.pending = stat._count.id;
          break;
        case ProcessingStatus.COMPLETED:
          result.processed = stat._count.id;
          break;
        case ProcessingStatus.FAILED:
          result.failed = stat._count.id;
          break;
      }
    });

    return result;
  }

  // Clean up old processed emails (older than specified days)
  async cleanupOldEmails(days: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await this.prisma.emailRecord.deleteMany({
      where: {
        processingStatus: ProcessingStatus.COMPLETED,
        processedAt: {
          lt: cutoffDate
        }
      }
    });

    return result.count;
  }

  // Create or update email record (upsert based on Gmail message ID)
  async upsertByGmailMessageId(gmailMessageId: string, data: CreateEmailData): Promise<EmailRecord> {
    return this.prisma.emailRecord.upsert({
      where: { gmailMessageId },
      create: data,
      update: {
        ...data,
        updatedAt: new Date()
      }
    });
  }

  // Bulk create emails (for initial sync)
  async bulkCreate(emails: CreateEmailData[]): Promise<number> {
    const result = await this.prisma.emailRecord.createMany({
      data: emails,
      skipDuplicates: true // Skip if Gmail message ID already exists
    });

    return result.count;
  }
}