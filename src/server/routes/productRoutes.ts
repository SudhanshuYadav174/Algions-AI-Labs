import { Router } from 'express';
import {
  getProducts,
  getProductBySlugOrId,
  getCategories,
  getFeaturedProducts,
} from '../controllers/productController.js';

const router = Router();

router.get('/', getProducts);
router.get('/featured', getFeaturedProducts);
router.get('/categories', getCategories);
router.get('/:slugOrId', getProductBySlugOrId);

export default router;
