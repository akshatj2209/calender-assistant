import { User, GoogleTokens, Prisma } from '@prisma/client';
import { BaseRepository } from './BaseRepository';

export interface CreateUserData {
  email: string;
  name?: string;
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

export interface UpdateUserData {
  name?: string;
  email?: string;
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

export interface UserWithTokens extends User {
  googleTokens?: GoogleTokens | null;
}

export class UserRepository extends BaseRepository<User> {
  
  async create(data: CreateUserData): Promise<User> {
    return this.prisma.user.create({
      data: {
        email: data.email,
        name: data.name
      }
    });
  }

  async findById(id: string): Promise<UserWithTokens | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        googleTokens: true
      }
    });
  }

  async findByEmail(email: string): Promise<UserWithTokens | null> {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        googleTokens: true
      }
    });
  }

  async update(id: string, data: UpdateUserData): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({
      where: { id }
    });
  }

  async findMany(where?: Prisma.UserWhereInput, options?: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<User[]> {
    const queryOptions: Prisma.UserFindManyArgs = {
      where,
      include: {
        googleTokens: true
      }
    };

    const paginationOptions = this.getPaginationOptions(options?.page, options?.limit);
    const sortOptions = this.getSortOptions(options?.sortBy, options?.sortOrder);
    
    Object.assign(queryOptions, paginationOptions, sortOptions);

    return this.prisma.user.findMany(queryOptions);
  }

  async findOrCreate(email: string, name?: string): Promise<UserWithTokens> {
    let user = await this.findByEmail(email);
    
    if (!user) {
      user = await this.create({ email, name });
    }
    
    return user;
  }

  // Google Tokens management
  async upsertGoogleTokens(userId: string, tokens: {
    accessToken: string;
    refreshToken?: string;
    tokenType?: string;
    scope?: string;
    expiresAt?: Date;
  }): Promise<GoogleTokens> {
    return this.prisma.googleTokens.upsert({
      where: { userId },
      create: {
        userId,
        ...tokens
      },
      update: tokens
    });
  }

  async getGoogleTokens(userId: string): Promise<GoogleTokens | null> {
    return this.prisma.googleTokens.findUnique({
      where: { userId }
    });
  }

  async deleteGoogleTokens(userId: string): Promise<void> {
    await this.prisma.googleTokens.delete({
      where: { userId }
    });
  }

  // Get user statistics (simplified)
  async getUserStats(userId: string, days: number = 30): Promise<{
    totalEmails: number;
    eventsCreated: number;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [emailStats, eventStats] = await Promise.all([
      this.prisma.emailRecord.aggregate({
        where: {
          userId,
          createdAt: { gte: startDate }
        },
        _count: {
          id: true
        }
      }),
      this.prisma.calendarEventRecord.aggregate({
        where: {
          userId,
          createdAt: { gte: startDate }
        },
        _count: {
          id: true
        }
      })
    ]);

    return {
      totalEmails: emailStats._count.id || 0,
      eventsCreated: eventStats._count.id || 0
    };
  }

  // Check if user exists and has valid tokens
  async isUserAuthenticated(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        googleTokens: true
      }
    });

    if (!user?.googleTokens) {
      return false;
    }

    // Check if token is expired (with 5 minute buffer)
    if (user.googleTokens.expiresAt) {
      const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
      if (user.googleTokens.expiresAt <= fiveMinutesFromNow) {
        return false;
      }
    }

    return true;
  }

  // Get all users with expired tokens
  async getUsersWithExpiredTokens(): Promise<User[]> {
    const now = new Date();
    
    return this.prisma.user.findMany({
      where: {
        googleTokens: {
          expiresAt: {
            lte: now
          }
        }
      },
      include: {
        googleTokens: true
      }
    });
  }
}