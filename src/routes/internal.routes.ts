import { Router } from 'express';
import { releaseFunds } from '../controllers/settlement.controller';

const router = Router();

// Endpoint para Operadores aprovarem liquidações para as Wallets dos Merchants
router.post('/settlement/release', releaseFunds);

export default router;
