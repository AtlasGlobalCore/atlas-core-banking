import { Router } from 'express';
import { getCheckoutSession, processPayment } from '../controllers/checkout.controller';

const router = Router();

router.get('/checkout/:storeSlug/:linkId', getCheckoutSession);
router.post('/checkout/:storeSlug/:linkId/pay', processPayment);

export default router;
