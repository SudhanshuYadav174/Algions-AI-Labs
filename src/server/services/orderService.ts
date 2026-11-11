import { getClient, pool } from '../config/db.js';
import { calculateOrderPricing, type CartPricingItem } from './pricingService.js';
import { checkAndDeductStock, restoreStock, InsufficientStockError } from './inventoryService.js';
import { logAudit } from './auditService.js';

export interface CheckoutInput {
  userId: number;
  items: CartPricingItem[];
  shippingAddress: {
    fullName: string;
    phone: string;
    streetAddress: string;
    apartment?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  couponCode?: string | null;
  paymentMethod?: string;
  idempotencyKey?: string | null;
  simulatePaymentFailure?: boolean;
}

export const VALID_ORDER_TRANSITIONS: Record<string, string[]> = {
  placed: ['paid', 'cancelled'],
  paid: ['packed', 'cancelled'],
  packed: ['shipped'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

export class InvalidStateTransitionError extends Error {
  constructor(from: string, to: string) {
    super(`Invalid order state transition from "${from}" to "${to}".`);
    this.name = 'InvalidStateTransitionError';
  }
}

export async function processCheckout(input: CheckoutInput) {
  // 1. Idempotency Check
  if (input.idempotencyKey) {
    const existingKey = await pool.query(
      `SELECT response_code, response_body FROM idempotency_records WHERE idempotency_key = $1 AND user_id = $2`,
      [input.idempotencyKey, input.userId]
    );

    if (existingKey.rows.length > 0) {
      return {
        isDuplicateReplay: true,
        statusCode: existingKey.rows[0].response_code,
        data: existingKey.rows[0].response_body,
      };
    }
  }

  const client = await getClient();

  try {
    await client.query('BEGIN');

    // 2. Server-side recalculation of pricing & discounts
    const pricing = await calculateOrderPricing(input.items, input.couponCode, client);

    // 3. Payment Simulation Check (Before committing state or stock)
    if (input.simulatePaymentFailure) {
      throw new Error('Payment processing failed: Card was declined by issuing bank (Simulated failure).');
    }

    const orderNumber = `UT-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // 4. Create Order row with 'paid' or 'placed'
    const orderRes = await client.query(
      `INSERT INTO orders (
        order_number, user_id, status, subtotal, discount_amount, coupon_code,
        tax_amount, shipping_fee, total_amount, shipping_address, payment_status,
        payment_method, idempotency_key
      ) VALUES ($1, $2, 'paid', $3, $4, $5, $6, $7, $8, $9, 'completed', $10, $11)
      RETURNING *`,
      [
        orderNumber,
        input.userId,
        pricing.subtotal,
        pricing.discountAmount,
        pricing.couponCode,
        pricing.taxAmount,
        pricing.shippingFee,
        pricing.totalAmount,
        JSON.stringify(input.shippingAddress),
        input.paymentMethod || 'credit_card',
        input.idempotencyKey || null,
      ]
    );

    const order = orderRes.rows[0];

    // 5. Lock and Deduct Stock safely for every item
    for (const item of pricing.items) {
      await checkAndDeductStock(client, item.variantId, item.quantity, order.id, 'order_checkout');

      await client.query(
        `INSERT INTO order_items (
          order_id, product_id, variant_id, product_name, variant_info, unit_price, quantity, total_price
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          order.id,
          item.productId,
          item.variantId,
          item.productName,
          item.variantInfo,
          item.unitPrice,
          item.quantity,
          item.totalPrice,
        ]
      );
    }

    // 6. Clear user cart if exists
    const cartRes = await client.query(`SELECT id FROM carts WHERE user_id = $1`, [input.userId]);
    if (cartRes.rows.length > 0) {
      await client.query(`DELETE FROM cart_items WHERE cart_id = $1`, [cartRes.rows[0].id]);
    }

    // 7. Store idempotency record for safe retries
    const responseData = {
      orderId: order.id,
      orderNumber: order.order_number,
      status: order.status,
      paymentStatus: order.payment_status,
      subtotal: Number(order.subtotal),
      discountAmount: Number(order.discount_amount),
      taxAmount: Number(order.tax_amount),
      shippingFee: Number(order.shipping_fee),
      totalAmount: Number(order.total_amount),
      items: pricing.items,
      createdAt: order.created_at,
    };

    if (input.idempotencyKey) {
      await client.query(
        `INSERT INTO idempotency_records (idempotency_key, user_id, request_path, response_code, response_body)
         VALUES ($1, $2, '/api/checkout', 201, $3)
         ON CONFLICT (idempotency_key) DO NOTHING`,
        [input.idempotencyKey, input.userId, JSON.stringify(responseData)]
      );
    }

    // 8. Audit Log
    await logAudit(
      {
        userId: input.userId,
        action: 'ORDER_CHECKOUT_COMPLETED',
        entityType: 'order',
        entityId: order.id.toString(),
        newState: { orderNumber: order.order_number, total: order.total_amount },
      },
      client
    );

    await client.query('COMMIT');

    return {
      isDuplicateReplay: false,
      statusCode: 201,
      data: responseData,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function transitionOrderStatus(
  orderId: number,
  newStatus: string,
  actorUserId?: number,
  actorRole?: string
) {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // Row-level lock on order
    const orderRes = await client.query(
      `SELECT * FROM orders WHERE id = $1 FOR UPDATE`,
      [orderId]
    );

    if (orderRes.rows.length === 0) {
      throw new Error(`Order #${orderId} not found`);
    }

    const order = orderRes.rows[0];
    const currentStatus = order.status;

    if (currentStatus === newStatus) {
      await client.query('ROLLBACK');
      return order; // Idempotent same-state call
    }

    const allowed = VALID_ORDER_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(newStatus)) {
      throw new InvalidStateTransitionError(currentStatus, newStatus);
    }

    // If transitioning to cancelled, restore stock exactly once
    if (newStatus === 'cancelled') {
      const itemsRes = await client.query(
        `SELECT variant_id, quantity FROM order_items WHERE order_id = $1`,
        [orderId]
      );

      for (const item of itemsRes.rows) {
        if (item.variant_id) {
          await restoreStock(client, item.variant_id, item.quantity, orderId, 'order_cancelled');
        }
      }
    }

    const updatedRes = await client.query(
      `UPDATE orders 
       SET status = $1, updated_at = NOW() 
       WHERE id = $2 
       RETURNING *`,
      [newStatus, orderId]
    );

    // Audit Log
    await logAudit(
      {
        userId: actorUserId,
        action: `ORDER_STATUS_CHANGED_TO_${newStatus.toUpperCase()}`,
        entityType: 'order',
        entityId: orderId.toString(),
        previousState: { status: currentStatus },
        newState: { status: newStatus },
      },
      client
    );

    await client.query('COMMIT');
    return updatedRes.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function cancelOrder(orderId: number, userId: number, userRole: string, reason?: string) {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    const orderRes = await client.query(
      `SELECT * FROM orders WHERE id = $1 FOR UPDATE`,
      [orderId]
    );

    if (orderRes.rows.length === 0) {
      throw new Error(`Order #${orderId} not found`);
    }

    const order = orderRes.rows[0];

    // Authorization: customer can only cancel their own order
    if (userRole !== 'admin' && order.user_id !== userId) {
      const err: any = new Error('Access denied: You cannot modify another customer\'s order.');
      err.statusCode = 403;
      throw err;
    }

    if (order.status === 'cancelled') {
      const err: any = new Error('Order is already cancelled.');
      err.statusCode = 400;
      throw err;
    }

    const cancellableStates = ['placed', 'paid'];
    if (!cancellableStates.includes(order.status)) {
      const err: any = new Error(`Cannot cancel order in "${order.status}" status.`);
      err.statusCode = 400;
      throw err;
    }

    // Restore stock for all items
    const itemsRes = await client.query(
      `SELECT variant_id, quantity FROM order_items WHERE order_id = $1`,
      [orderId]
    );

    for (const item of itemsRes.rows) {
      if (item.variant_id) {
        await restoreStock(client, item.variant_id, item.quantity, orderId, 'customer_cancellation');
      }
    }

    const updatedRes = await client.query(
      `UPDATE orders 
       SET status = 'cancelled', 
           payment_status = 'refunded',
           cancellation_reason = $1, 
           updated_at = NOW() 
       WHERE id = $2 
       RETURNING *`,
      [reason || 'Cancelled by customer', orderId]
    );

    // Audit log
    await logAudit(
      {
        userId,
        action: 'ORDER_CANCELLED',
        entityType: 'order',
        entityId: orderId.toString(),
        previousState: { status: order.status },
        newState: { status: 'cancelled', reason },
      },
      client
    );

    await client.query('COMMIT');
    return updatedRes.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
