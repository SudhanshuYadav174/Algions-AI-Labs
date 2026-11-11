import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { pool, getClient } from '../config/db.js';
import { transitionOrderStatus } from '../services/orderService.js';
import { logAudit } from '../services/auditService.js';

export const updateOrderStatusSchema = z.object({
  status: z.enum(['placed', 'paid', 'packed', 'shipped', 'delivered', 'cancelled']),
});

export const adjustInventorySchema = z.object({
  stockQuantity: z.number().int().min(0, 'Stock cannot be negative'),
  reason: z.string().min(2, 'Adjustment reason is required'),
});

export const productMutationSchema = z.object({
  name: z.string().min(2, 'Product name is required'),
  slug: z.string().min(2, 'Slug is required'),
  description: z.string().min(5, 'Description is required'),
  price: z.number().positive('Price must be greater than 0'),
  compareAtPrice: z.number().positive().optional().nullable(),
  categoryId: z.number().int().positive().optional().nullable(),
  imageUrl: z.string().url('Valid image URL is required'),
  isFeatured: z.boolean().optional(),
  isActive: z.boolean().optional(),
  variants: z.array(
    z.object({
      id: z.number().int().optional(),
      size: z.string().min(1),
      color: z.string().min(1),
      sku: z.string().min(2),
      priceAdjustment: z.number().default(0),
      stockQuantity: z.number().int().min(0),
    })
  ).min(1, 'At least one variant is required'),
});

export async function getDashboardReports(req: Request, res: Response, next: NextFunction) {
  try {
    // 1. Reconciled Financial Metrics from PostgreSQL
    const revenueRes = await pool.query(`
      SELECT 
        COALESCE(SUM(total_amount), 0) AS total_revenue,
        COUNT(*) AS total_orders_all,
        COUNT(*) FILTER (WHERE status IN ('paid', 'packed', 'shipped', 'delivered')) AS paid_orders,
        COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled_orders,
        COALESCE(AVG(total_amount) FILTER (WHERE status IN ('paid', 'packed', 'shipped', 'delivered')), 0) AS avg_order_value
      FROM orders
    `);

    // 2. Status Breakdown
    const statusRes = await pool.query(`
      SELECT status, COUNT(*) AS count, COALESCE(SUM(total_amount), 0) AS revenue
      FROM orders
      GROUP BY status
      ORDER BY count DESC
    `);

    // 3. Low Stock Alerts (< 15 units)
    const lowStockRes = await pool.query(`
      SELECT 
        v.id AS variant_id,
        v.size,
        v.color,
        v.sku,
        v.stock_quantity,
        p.id AS product_id,
        p.name AS product_name
      FROM product_variants v
      JOIN products p ON v.product_id = p.id
      WHERE v.stock_quantity < 15
      ORDER BY v.stock_quantity ASC
      LIMIT 10
    `);

    // 4. Top Selling Products
    const topSellingRes = await pool.query(`
      SELECT 
        oi.product_id,
        oi.product_name,
        SUM(oi.quantity) AS total_units_sold,
        SUM(oi.total_price) AS total_sales
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status IN ('paid', 'packed', 'shipped', 'delivered')
      GROUP BY oi.product_id, oi.product_name
      ORDER BY total_units_sold DESC
      LIMIT 5
    `);

    // 5. Customer summary
    const customersCountRes = await pool.query(`
      SELECT COUNT(*) AS total_customers FROM users WHERE role = 'customer'
    `);

    res.json({
      summary: {
        totalRevenue: Number(Number(revenueRes.rows[0].total_revenue).toFixed(2)),
        totalOrdersAll: parseInt(revenueRes.rows[0].total_orders_all),
        paidOrders: parseInt(revenueRes.rows[0].paid_orders),
        cancelledOrders: parseInt(revenueRes.rows[0].cancelled_orders),
        avgOrderValue: Number(Number(revenueRes.rows[0].avg_order_value).toFixed(2)),
        totalCustomers: parseInt(customersCountRes.rows[0].total_customers),
      },
      statusBreakdown: statusRes.rows.map(r => ({
        status: r.status,
        count: parseInt(r.count),
        revenue: Number(Number(r.revenue).toFixed(2)),
      })),
      lowStockAlerts: lowStockRes.rows,
      topProducts: topSellingRes.rows.map(r => ({
        productId: r.product_id,
        productName: r.product_name,
        totalUnitsSold: parseInt(r.total_units_sold),
        totalSales: Number(Number(r.total_sales).toFixed(2)),
      })),
    });
  } catch (error) {
    next(error);
  }
}

export async function getAllOrders(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;
    const statusFilter = req.query.status as string;

    const conditions: string[] = [];
    const params: any[] = [];

    if (statusFilter && statusFilter !== 'all') {
      params.push(statusFilter);
      conditions.push(`o.status = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await pool.query(`SELECT COUNT(*) FROM orders o ${whereClause}`, params);
    const totalCount = parseInt(countRes.rows[0].count);

    const ordersRes = await pool.query(
      `SELECT 
        o.id,
        o.order_number,
        o.user_id,
        o.status,
        o.subtotal,
        o.discount_amount,
        o.coupon_code,
        o.tax_amount,
        o.shipping_fee,
        o.total_amount,
        o.shipping_address,
        o.payment_status,
        o.cancellation_reason,
        o.created_at,
        u.email AS customer_email,
        u.full_name AS customer_name,
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'id', oi.id,
            'productName', oi.product_name,
            'variantInfo', oi.variant_info,
            'unitPrice', oi.unit_price,
            'quantity', oi.quantity,
            'totalPrice', oi.total_price
          )
        ) AS items
       FROM orders o
       JOIN users u ON o.user_id = u.id
       LEFT JOIN order_items oi ON o.id = oi.order_id
       ${whereClause}
       GROUP BY o.id, u.email, u.full_name
       ORDER BY o.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    res.json({
      orders: ordersRes.rows.map(row => ({
        ...row,
        subtotal: Number(row.subtotal),
        discount_amount: Number(row.discount_amount),
        tax_amount: Number(row.tax_amount),
        shipping_fee: Number(row.shipping_fee),
        total_amount: Number(row.total_amount),
      })),
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateOrderStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const orderId = parseInt(req.params.id);
    const { status } = req.body;
    const adminUser = req.user!;

    const updated = await transitionOrderStatus(orderId, status, adminUser.id, 'admin');

    res.json({
      message: `Order status updated to ${status}`,
      order: updated,
    });
  } catch (error) {
    next(error);
  }
}

export async function adjustInventory(req: Request, res: Response, next: NextFunction) {
  const client = await getClient();
  try {
    const variantId = parseInt(req.params.variantId);
    const { stockQuantity, reason } = req.body;
    const adminUser = req.user!;

    await client.query('BEGIN');

    const varRes = await client.query(
      `SELECT v.id, v.stock_quantity, v.sku, p.name 
       FROM product_variants v
       JOIN products p ON v.product_id = p.id
       WHERE v.id = $1 FOR UPDATE`,
      [variantId]
    );

    if (varRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Variant not found' });
    }

    const previousStock = Number(varRes.rows[0].stock_quantity);
    const changeAmount = stockQuantity - previousStock;

    await client.query(
      `UPDATE product_variants SET stock_quantity = $1, updated_at = NOW() WHERE id = $2`,
      [stockQuantity, variantId]
    );

    await client.query(
      `INSERT INTO inventory_logs (variant_id, change_amount, previous_stock, new_stock, reason)
       VALUES ($1, $2, $3, $4, $5)`,
      [variantId, changeAmount, previousStock, stockQuantity, `Admin adjustment: ${reason}`]
    );

    // Audit log
    await logAudit(
      {
        userId: adminUser.id,
        action: 'INVENTORY_MANUAL_ADJUSTMENT',
        entityType: 'product_variant',
        entityId: variantId.toString(),
        previousState: { stockQuantity: previousStock },
        newState: { stockQuantity, reason },
        ipAddress: req.ip,
      },
      client
    );

    await client.query('COMMIT');

    res.json({
      message: 'Inventory adjusted successfully',
      variantId,
      previousStock,
      newStock: stockQuantity,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
}

export async function createProduct(req: Request, res: Response, next: NextFunction) {
  const client = await getClient();
  try {
    const { name, slug, description, price, compareAtPrice, categoryId, imageUrl, isFeatured, isActive, variants } = req.body;
    const adminUser = req.user!;

    await client.query('BEGIN');

    const prodRes = await client.query(
      `INSERT INTO products (
        name, slug, description, price, compare_at_price, category_id, image_url, is_featured, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        name,
        slug,
        description,
        price,
        compareAtPrice || null,
        categoryId || null,
        imageUrl,
        !!isFeatured,
        isActive !== false,
      ]
    );

    const product = prodRes.rows[0];

    for (const v of variants) {
      await client.query(
        `INSERT INTO product_variants (product_id, size, color, sku, price_adjustment, stock_quantity)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [product.id, v.size, v.color, v.sku, v.priceAdjustment || 0, v.stockQuantity || 0]
      );
    }

    await logAudit(
      {
        userId: adminUser.id,
        action: 'CREATE_PRODUCT',
        entityType: 'product',
        entityId: product.id.toString(),
        newState: { name, slug, price },
        ipAddress: req.ip,
      },
      client
    );

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Product created successfully',
      product,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
}

export async function updateProduct(req: Request, res: Response, next: NextFunction) {
  const client = await getClient();
  try {
    const productId = parseInt(req.params.id);
    const { name, slug, description, price, compareAtPrice, categoryId, imageUrl, isFeatured, isActive } = req.body;
    const adminUser = req.user!;

    await client.query('BEGIN');

    const existing = await client.query('SELECT * FROM products WHERE id = $1 FOR UPDATE', [productId]);
    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Product not found' });
    }

    const prev = existing.rows[0];

    const updatedRes = await client.query(
      `UPDATE products SET 
        name = $1, slug = $2, description = $3, price = $4, compare_at_price = $5,
        category_id = $6, image_url = $7, is_featured = $8, is_active = $9, updated_at = NOW()
       WHERE id = $10
       RETURNING *`,
      [
        name,
        slug,
        description,
        price,
        compareAtPrice || null,
        categoryId || null,
        imageUrl,
        !!isFeatured,
        isActive !== false,
        productId,
      ]
    );

    await logAudit(
      {
        userId: adminUser.id,
        action: 'UPDATE_PRODUCT',
        entityType: 'product',
        entityId: productId.toString(),
        previousState: { name: prev.name, price: prev.price, compare_at_price: prev.compare_at_price },
        newState: { name, price, compareAtPrice },
        ipAddress: req.ip,
      },
      client
    );

    await client.query('COMMIT');

    res.json({
      message: 'Product updated successfully',
      product: updatedRes.rows[0],
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
}

export async function deleteProduct(req: Request, res: Response, next: NextFunction) {
  const client = await getClient();
  try {
    const productId = parseInt(req.params.id);
    const adminUser = req.user!;

    await client.query('BEGIN');

    // Soft delete / deactivate product to preserve order history integrity
    const updated = await client.query(
      'UPDATE products SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING *',
      [productId]
    );

    if (updated.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Product not found' });
    }

    await logAudit(
      {
        userId: adminUser.id,
        action: 'DEACTIVATE_PRODUCT',
        entityType: 'product',
        entityId: productId.toString(),
        previousState: { isActive: true },
        newState: { isActive: false },
        ipAddress: req.ip,
      },
      client
    );

    await client.query('COMMIT');

    res.json({ message: 'Product deactivated successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
}

export async function getAuditLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 25));
    const offset = (page - 1) * limit;

    const countRes = await pool.query('SELECT COUNT(*) FROM audit_logs');
    const totalCount = parseInt(countRes.rows[0].count);

    const logsRes = await pool.query(
      `SELECT 
        al.id,
        al.user_id,
        u.email AS user_email,
        u.full_name AS user_name,
        al.action,
        al.entity_type,
        al.entity_id,
        al.previous_state,
        al.new_state,
        al.ip_address,
        al.created_at
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ORDER BY al.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.json({
      logs: logsRes.rows,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    next(error);
  }
}
