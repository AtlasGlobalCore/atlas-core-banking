import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';

const router = Router();

// Estas rotas serão montadas em /api/v1/auth
router.post('/login', AuthController.login);
router.post('/register', AuthController.register);
router.post('/verify-email', AuthController.verifyEmail);
router.get('/me', AuthController.getCurrentUser);

export default router;
