import { Router } from 'express';
import { requireProxySecret } from '../middlewares/proxyAuth.middleware';
import { WebhookController } from '../controllers/webhook.controller';

const router = Router();

// Endpoint que recebe as liquidações da NeXFlowX Proxy
router.post('/webhooks/proxy', requireProxySecret, WebhookController.handleProxyWebhook);

export default router;
