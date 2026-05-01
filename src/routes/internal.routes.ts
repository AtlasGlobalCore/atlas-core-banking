import { Router } from 'express';
import { WebhookController } from '../controllers/webhook.controller';
import { requireProxySecret } from '../middlewares/proxyAuth.middleware';

const router = Router();

// Rota protegida pela nossa barreira de segurança
router.post('/webhooks/proxy', requireProxySecret, WebhookController.handleProxyIncoming);

export default router;
