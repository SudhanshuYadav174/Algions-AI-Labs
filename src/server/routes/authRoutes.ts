import { Router } from 'express';
import {
  register,
  login,
  getProfile,
  addAddress,
  deleteAddress,
  registerSchema,
  loginSchema,
  addressSchema,
} from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

router.post('/register', validateBody(registerSchema), register);
router.post('/login', validateBody(loginSchema), login);
router.get('/me', authenticate, getProfile);
router.post('/addresses', authenticate, validateBody(addressSchema), addAddress);
router.delete('/addresses/:id', authenticate, deleteAddress);

export default router;
