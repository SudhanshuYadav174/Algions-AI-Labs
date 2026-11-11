import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { pool } from '../config/db.js';
import { processCheckout, cancelOrder } from '../services/orderService.js';
import { calculateOrderPricing } from '../services/pricingService.js';

export const checkoutSchema = z.object({
  items: z.array(
    z.object({
      variantId: z.number().int().positive('Valid variant ID is required'),
      quantity: z.number().int().positive('Quantity must be at least 1'),
    })
  ).min(1, 'Cart items cannot be empty for checkout'),
  shippingAddress: z.object({
    fullName: z.string().min(2, 'Recipient full name is required'),
    phone: z.string().min(7, 'Contact phone number is required'),
    streetAddress: z.string().min(3, 'Street address is required'),
    apartment: z.string().optional(),
    city: z.string().min(2, 'City is required'),
    state: z.string().min(2, 'State / Province is required'),
    postalCode: z.string().min(3, 'Postal code is required'),
    country: z.string().default('United States'),
  }),
  couponCode: z.string().optional().nullable(),
  paymentMethod: z.string().default('credit_card'),
  idempotencyKey: z.string().optional().nullable(),
  simulatePaymentFailure: z.boolean().optional(),
});

export const quoteSchema = z.object({
  items: z.array(
    z.object({
      variantId: z.number().int().positive(),
      quantity: z.number().int().positive(),
    })
  ).min(1, 'Items cannot be empty'),
  couponCode: z.string().optional().nullable(),
});

export async function checkout(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const idempotencyHeader = (req.headers['idempotency-key'] as string) || req.body.idempotencyKey;

    const result = await processCheckout({
      userId,
      items: req.body.items,
      shippingAddress: req.body.shippingAddress,
      couponCode: req.body.couponCode,
      paymentMethod: req.body.paymentMethod,
      idempotencyKey: idempotencyHeader,
      simulatePaymentFailure: req.body.simulatePaymentFailure,
    });

    res.status(result.statusCode).json(result.data);
  } catch (error) {
    next(error);
  }
}

export async function getQuote(req: Request, res: Response, next: NextFunction) {
  try {
    const { items, couponCode } = req.body;
    const pricing = await calculateOrderPricing(items, couponCode);
    res.json(pricing);
  } catch (error) {
    next(error);
  }
}

export async function validateCoupon(req: Request, res: Response, next: NextFunction) {
  try {
    const code = (req.query.code as string || req.body.code as string)?.trim().toUpperCase();
    if (!code) {
      return res.status(400).json({ error: 'Coupon code is required' });
    }

    const resCoupon = await pool.query(
      `SELECT code, discount_type, discount_value, min_order_amount, expires_at 
       FROM coupons 
       WHERE code = $1 AND is_active = true 
       AND (expires_at IS NULL OR expires_at > NOW())`,
      [code]
    );

    if (resCoupon.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid or expired coupon code' });
    }

    res.json({
      valid: true,
      coupon: {
        code: resCoupon.rows[0].code,
        discountType: resCoupon.rows[0].discount_type,
        discountValue: Number(resCoupon.rows[0].discount_value),
        minOrderAmount: Number(resCoupon.rows[0].min_order_amount),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getMyOrders(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;

    const result = await pool.query(
      `SELECT 
        o.id,
        o.order_number,
        o.status,
        o.subtotal,
        o.discount_amount,
        o.coupon_code,
        o.tax_amount,
        o.shipping_fee,
        o.total_amount,
        o.shipping_address,
        o.payment_status,
        o.created_at,
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'id', oi.id,
            'productId', oi.product_id,
            'productName', oi.product_name,
            'variantInfo', oi.variant_info,
            'unitPrice', oi.unit_price,
            'quantity', oi.quantity,
            'totalPrice', oi.total_price
          )
        ) AS items
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       WHERE o.user_id = $1
       GROUP BY o.id
       ORDER BY o.created_at DESC`,
      [userId]
    );

    res.json({
      orders: result.rows.map(row => ({
        ...row,
        subtotal: Number(row.subtotal),
        discount_amount: Number(row.discount_amount),
        tax_amount: Number(row.tax_amount),
        shipping_fee: Number(row.shipping_fee),
        total_amount: Number(row.total_amount),
      })),
    });
  } catch (error) {
    next(error);
  }
}

export async function getOrderById(req: Request, res: Response, next: NextFunction) {
  try {
    const orderId = parseInt(req.params.id);
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const result = await pool.query(
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
        o.payment_method,
        o.cancellation_reason,
        o.created_at,
        o.updated_at,
        u.email AS customer_email,
        u.full_name AS customer_name,
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'id', oi.id,
            'productId', oi.product_id,
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
       WHERE o.id = $1
       GROUP BY o.id, u.email, u.full_name`,
      [orderId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = result.rows[0];

    // CRITICAL ENFORCEMENT of Criterion 4: Customers cannot access another customer's data!
    if (userRole !== 'admin' && order.user_id !== userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied: You are not authorized to view orders belonging to another customer.',
      });
    }

    res.json({
      order: {
        ...order,
        subtotal: Number(order.subtotal),
        discount_amount: Number(order.discount_amount),
        tax_amount: Number(order.tax_amount),
        shipping_fee: Number(order.shipping_fee),
        total_amount: Number(order.total_amount),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function cancelMyOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const orderId = parseInt(req.params.id);
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const { reason } = req.body;

    const cancelledOrder = await cancelOrder(orderId, userId, userRole, reason);

    res.json({
      message: 'Order cancelled successfully and inventory restored',
      order: cancelledOrder,
    });
  } catch (error) {
    next(error);
  }
}

