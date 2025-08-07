import prisma from '../connection';

export abstract class BaseRepository<T> {
  protected prisma = prisma;

  // Common repository methods that can be overridden
  abstract create(data: any): Promise<T>;
  abstract findById(id: string): Promise<T | null>;
  abstract update(id: string, data: any): Promise<T>;
  abstract delete(id: string): Promise<void>;
  abstract findMany(where?: any, options?: any): Promise<T[]>;

  // Helper method for pagination
  protected getPaginationOptions(page?: number, limit?: number) {
    if (!page || !limit) return {};
    
    const skip = (page - 1) * limit;
    return {
      skip,
      take: limit
    };
  }

  // Helper method for sorting
  protected getSortOptions(sortBy?: string, sortOrder?: 'asc' | 'desc') {
    if (!sortBy) return {};
    
    return {
      orderBy: {
        [sortBy]: sortOrder || 'desc'
      }
    };
  }

  // Helper method for date range filtering
  protected getDateRangeFilter(startDate?: Date, endDate?: Date) {
    if (!startDate && !endDate) return {};
    
    const dateFilter: any = {};
    if (startDate) dateFilter.gte = startDate;
    if (endDate) dateFilter.lte = endDate;
    
    return dateFilter;
  }

  // Transaction helper
  async executeInTransaction<TResult>(
    callback: (prisma: typeof this.prisma) => Promise<TResult>
  ): Promise<TResult> {
    return this.prisma.$transaction(callback);
  }
}