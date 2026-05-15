import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';

const router = Router();

// Estas rotas ficam mapeadas como: /api/v1/dashboard/...
router.get('/wallets', DashboardController.getWallets);
router.get('/transactions', DashboardController.getTransactions);

export default router;
