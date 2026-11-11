import { Router } from 'express';
import {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  addToCartSchema,
  updateCartItemSchema,
} from '../controllers/cartController.js';
import { optionalAuthenticate } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

router.use(optionalAuthenticate);

router.get('/', getCart);
router.post('/items', validateBody(addToCartSchema), addToCart);
router.put('/items/:id', validateBody(updateCartItemSchema), updateCartItem);
router.delete('/items/:id', removeCartItem);
router.delete('/', clearCart);

export default router;
