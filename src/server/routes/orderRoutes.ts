import { Router } from 'express';
import {
  checkout,
  getQuote,
  validateCoupon,
  getMyOrders,
  getOrderById,
  cancelMyOrder,
  checkoutSchema,
  quoteSchema,
} from '../controllers/orderController.js';
import { authenticate } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

router.post('/checkout/quote', validateBody(quoteSchema), getQuote);
router.post('/coupons/validate', validateCoupon);

// Authenticated endpoints
router.post('/checkout', authenticate, validateBody(checkoutSchema), checkout);
router.get('/orders', authenticate, getMyOrders);
router.get('/orders/:id', authenticate, getOrderById);
router.post('/orders/:id/cancel', authenticate, cancelMyOrder);

export default router;

