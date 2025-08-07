import express from 'express';
import { userController } from '@/controllers/UserController';

const router = express.Router();

// Get user by ID
router.get('/:id', userController.getUser.bind(userController));

// Get user by email
router.get('/email/:email', userController.getUserByEmail.bind(userController));

// Create new user
router.post('/', userController.createUser.bind(userController));

// Update user
router.put('/:id', userController.updateUser.bind(userController));

// Delete user
router.delete('/:id', userController.deleteUser.bind(userController));

// Find or create user (used by auth flow)
router.post('/find-or-create', userController.findOrCreateUser.bind(userController));

// User configuration routes
router.get('/:id/config', userController.getUserConfig.bind(userController));
router.put('/:id/config', userController.updateUserConfig.bind(userController));

// User statistics
router.get('/:id/stats', userController.getUserStats.bind(userController));

// Google tokens management
router.post('/:id/google-tokens', userController.upsertGoogleTokens.bind(userController));
router.delete('/:id/google-tokens', userController.deleteGoogleTokens.bind(userController));

export default router;