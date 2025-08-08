import express from 'express';
import { userController } from '@/controllers/UserController';

const router = express.Router();

// Core user CRUD (used by frontend and auth)
router.get('/:id', userController.getUser.bind(userController));
router.get('/email/:email', userController.getUserByEmail.bind(userController));
router.post('/', userController.createUser.bind(userController));
router.put('/:id', userController.updateUser.bind(userController));
router.post('/find-or-create', userController.findOrCreateUser.bind(userController));

export default router;