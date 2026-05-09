import { Router } from 'express';
import { getCheckoutSession, processCheckoutPay } from '../controllers/checkout.controller';

const router = Router();

router.get('/session', getCheckoutSession);
router.post('/pay', processCheckoutPay);

export default router;
