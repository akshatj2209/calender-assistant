import { Request, Response } from 'express';
import { userRepository } from '@/database/repositories';
import { z } from 'zod';

// Validation schemas
const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().optional()
});

const updateUserSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional()
});

const updateConfigSchema = z.object({
  businessHoursStart: z.string().optional(),
  businessHoursEnd: z.string().optional(),
  workingDays: z.array(z.number().min(0).max(6)).optional(),
  timezone: z.string().optional(),
  meetingDuration: z.number().min(15).max(240).optional(),
  bufferTime: z.number().min(0).max(240).optional(),
  travelBufferTime: z.number().min(0).max(240).optional(),
  maxLookaheadDays: z.number().min(1).max(30).optional(),
  minAdvanceNotice: z.number().min(1).max(48).optional(),
  salesName: z.string().optional(),
  companyName: z.string().optional(),
  emailSignature: z.string().optional(),
  autoRespond: z.boolean().optional(),
  checkIntervalMinutes: z.number().min(1).max(60).optional(),
  maxEmailsPerCheck: z.number().min(1).max(100).optional()
});

export class UserController {
  
  // GET /api/users/:id
  async getUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const user = await userRepository.findById(id);
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found'
        });
        return;
      }

      // Remove sensitive data
      const { googleTokens, ...safeUser } = user;
      const response = {
        ...safeUser,
        hasGoogleTokens: !!googleTokens,
        tokenExpiry: googleTokens?.expiresAt
      };

      res.json({
        success: true,
        user: response
      });
    } catch (error) {
      console.error('UserController.getUser:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get user',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // GET /api/users/email/:email
  async getUserByEmail(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.params;
      
      const user = await userRepository.findByEmail(email);
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found'
        });
        return;
      }

      // Remove sensitive data
      const { googleTokens, ...safeUser } = user;
      const response = {
        ...safeUser,
        hasGoogleTokens: !!googleTokens,
        tokenExpiry: googleTokens?.expiresAt
      };

      res.json({
        success: true,
        user: response
      });
    } catch (error) {
      console.error('UserController.getUserByEmail:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get user',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // POST /api/users
  async createUser(req: Request, res: Response): Promise<void> {
    try {
      const validation = createUserSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid input',
          details: validation.error.errors
        });
        return;
      }

      const { email, name } = validation.data;

      // Check if user already exists
      const existingUser = await userRepository.findByEmail(email);
      if (existingUser) {
        res.status(409).json({
          success: false,
          error: 'User already exists'
        });
        return;
      }

      const user = await userRepository.create({ email, name });

      res.status(201).json({
        success: true,
        user,
        message: 'User created successfully'
      });
    } catch (error) {
      console.error('UserController.createUser:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create user',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // PUT /api/users/:id
  async updateUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const validation = updateUserSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid input',
          details: validation.error.errors
        });
        return;
      }

      const user = await userRepository.update(id, validation.data);

      res.json({
        success: true,
        user,
        message: 'User updated successfully'
      });
    } catch (error) {
      console.error('UserController.updateUser:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update user',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // DELETE /api/users/:id
  async deleteUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      await userRepository.delete(id);

      res.json({
        success: true,
        message: 'User deleted successfully'
      });
    } catch (error) {
      console.error('UserController.deleteUser:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete user',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // GET /api/users/:id/config
  async getUserConfig(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const config = await userRepository.getUserConfig(id);
      if (!config) {
        res.status(404).json({
          success: false,
          error: 'User configuration not found'
        });
        return;
      }

      res.json({
        success: true,
        config
      });
    } catch (error) {
      console.error('UserController.getUserConfig:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get user configuration',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // PUT /api/users/:id/config
  async updateUserConfig(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const validation = updateConfigSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid configuration',
          details: validation.error.errors
        });
        return;
      }

      const config = await userRepository.updateUserConfig(id, validation.data);

      res.json({
        success: true,
        config,
        message: 'Configuration updated successfully'
      });
    } catch (error) {
      console.error('UserController.updateUserConfig:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update configuration',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // GET /api/users/:id/stats
  async getUserStats(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { days = '30' } = req.query as Record<string, string>;
      
      const stats = await userRepository.getUserStats(id, parseInt(days));

      res.json({
        success: true,
        stats,
        period: parseInt(days)
      });
    } catch (error) {
      console.error('UserController.getUserStats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get user statistics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // POST /api/users/:id/google-tokens
  async upsertGoogleTokens(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const {
        accessToken,
        refreshToken,
        tokenType = 'Bearer',
        scope,
        expiresAt
      } = req.body;

      if (!accessToken) {
        res.status(400).json({
          success: false,
          error: 'Access token is required'
        });
        return;
      }

      const tokens = await userRepository.upsertGoogleTokens(id, {
        accessToken,
        refreshToken,
        tokenType,
        scope,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined
      });

      res.json({
        success: true,
        tokens: {
          id: tokens.id,
          tokenType: tokens.tokenType,
          scope: tokens.scope,
          expiresAt: tokens.expiresAt,
          hasRefreshToken: !!tokens.refreshToken
        },
        message: 'Google tokens updated successfully'
      });
    } catch (error) {
      console.error('UserController.upsertGoogleTokens:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update Google tokens',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // DELETE /api/users/:id/google-tokens
  async deleteGoogleTokens(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      await userRepository.deleteGoogleTokens(id);

      res.json({
        success: true,
        message: 'Google tokens deleted successfully'
      });
    } catch (error) {
      console.error('UserController.deleteGoogleTokens:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete Google tokens',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // POST /api/users/find-or-create
  async findOrCreateUser(req: Request, res: Response): Promise<void> {
    try {
      const validation = createUserSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid input',
          details: validation.error.errors
        });
        return;
      }

      const { email, name } = validation.data;
      const user = await userRepository.findOrCreate(email, name);

      // Remove sensitive data
      const { googleTokens, ...safeUser } = user;
      const response = {
        ...safeUser,
        hasGoogleTokens: !!googleTokens,
        tokenExpiry: googleTokens?.expiresAt
      };

      res.json({
        success: true,
        user: response
      });
    } catch (error) {
      console.error('UserController.findOrCreateUser:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to find or create user',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

// Export singleton instance
export const userController = new UserController();