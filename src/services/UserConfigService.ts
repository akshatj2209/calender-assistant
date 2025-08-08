import { userRepository } from '@/database/repositories';
import { User } from '@prisma/client';

export interface UserConfig {
  salesName: string;
  salesEmail: string;
  companyName: string;
  emailSignature: string;
  businessHoursStart: string;
  businessHoursEnd: string;
  workingDays: number[];
  timezone: string;
  meetingDuration: number;
  bufferTime: number;
}

export class UserConfigService {
  
  async getUserConfig(userId: string): Promise<UserConfig | null> {
    const user = await userRepository.findById(userId);
    if (!user) return null;
    
    return this.mapUserToConfig(user);
  }

  async getUserConfigByEmail(email: string): Promise<UserConfig | null> {
    const user = await userRepository.findByEmail(email);
    if (!user) return null;
    
    return this.mapUserToConfig(user);
  }

  private mapUserToConfig(user: User): UserConfig {
    return {
      salesName: user.salesName || user.name || 'Sales Team',
      salesEmail: user.salesEmail || user.email,
      companyName: user.companyName || 'Company',
      emailSignature: user.emailSignature || this.getDefaultSignature(
        user.salesName || user.name || 'Sales Team',
        user.companyName || 'Company'
      ),
      businessHoursStart: user.businessHoursStart,
      businessHoursEnd: user.businessHoursEnd, 
      workingDays: user.workingDays,
      timezone: user.timezone,
      meetingDuration: user.meetingDuration,
      bufferTime: user.bufferTime
    };
  }

  private getDefaultSignature(salesName: string, companyName: string): string {
    return `Best regards,
${salesName}
${companyName}

This email was sent automatically by our scheduling assistant.
If you have any questions, please reply to this email.`;
  }

  async updateUserConfig(userId: string, config: Partial<UserConfig>): Promise<UserConfig | null> {
    const updatedUser = await userRepository.update(userId, {
      salesName: config.salesName,
      salesEmail: config.salesEmail,
      companyName: config.companyName, 
      emailSignature: config.emailSignature,
      businessHoursStart: config.businessHoursStart,
      businessHoursEnd: config.businessHoursEnd,
      workingDays: config.workingDays,
      timezone: config.timezone,
      meetingDuration: config.meetingDuration,
      bufferTime: config.bufferTime
    });

    return this.mapUserToConfig(updatedUser);
  }

  // Get user config for the currently authenticated user (from auth context)
  async getCurrentUserConfig(): Promise<UserConfig | null> {
    // This would typically get the user ID from the authentication context
    // For now, we'll need to pass the user ID from the calling code
    throw new Error('getCurrentUserConfig requires authentication context - use getUserConfig(userId) instead');
  }

  // Helper to generate email signature with template substitution
  generateEmailSignature(config: UserConfig): string {
    if (config.emailSignature) {
      return config.emailSignature
        .replace('{salesName}', config.salesName)
        .replace('{companyName}', config.companyName);
    }
    
    return this.getDefaultSignature(config.salesName, config.companyName);
  }
}

export const userConfigService = new UserConfigService();