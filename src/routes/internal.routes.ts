import { Router } from 'express';
import { releaseFunds } from '../controllers/settlement.controller';
import { PayoutController } from '../controllers/payout.controller';

const router = Router();

// Endpoint para Operadores aprovarem liquidações para as Wallets dos Merchants
router.post('/settlement/release', releaseFunds);

// Endpoint para a NEXOR gerir saques (Crypto Automático ou Fiat Manual com taxa de 3%)
router.post('/payouts', PayoutController.requestPayout);

export default router;
