import { Router } from 'express';
import {
  getDashboardReports,
  getAllOrders,
  updateOrderStatus,
  adjustInventory,
  createProduct,
  updateProduct,
  deleteProduct,
  getAuditLogs,
  updateOrderStatusSchema,
  adjustInventorySchema,
  productMutationSchema,
} from '../controllers/adminController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

// Server-side RBAC protection: MUST be logged in and role === 'admin'
router.use(authenticate, requireAdmin);

router.get('/reports/sales', getDashboardReports);
router.get('/orders', getAllOrders);
router.put('/orders/:id/status', validateBody(updateOrderStatusSchema), updateOrderStatus);
router.put('/inventory/:variantId', validateBody(adjustInventorySchema), adjustInventory);
router.post('/products', validateBody(productMutationSchema), createProduct);
router.put('/products/:id', validateBody(productMutationSchema.partial()), updateProduct);
router.delete('/products/:id', deleteProduct);
router.get('/audit-logs', getAuditLogs);

export default router;

