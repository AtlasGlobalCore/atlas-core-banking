import { Router } from 'express';
import { WebhookController } from '../controllers/webhook.controller';
import { requireProxySecret } from '../middlewares/proxyAuth.middleware';

const router = Router();

// Rota blindada: Apenas a NeXFlowX Proxy com a chave certa consegue injetar os dólares
router.post('/webhooks/proxy', requireProxySecret, WebhookController.handleProxyIncoming);

export default router;
