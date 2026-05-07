import { Router } from 'express';
import { proxyCallback } from '../controllers/webhook.controller';

const router = Router();

// Endpoint chamado pela London Proxy (Segurança adicional via header x-proxy-secret recomendada)
router.post('/proxy-callback', proxyCallback);

export default router;
