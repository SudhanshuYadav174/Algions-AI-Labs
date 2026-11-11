import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/server/app.js';
import { getTestTokens } from '../testHelpers.js';
import { pool } from '../../src/server/config/db.js';

describe('Concurrency: Order Cancellation & Exact Stock Restoration (Criteria 12, 13)', () => {
  let tokens: any;
  let testVariantId: number;

  beforeAll(async () => {
    tokens = await getTestTokens();

    const res = await pool.query(`SELECT id FROM product_variants WHERE stock_quantity >= 10 LIMIT 1`);
    testVariantId = res.rows[0].id;
  });

  it('restores stock exactly once and rejects repeat cancellations', async () => {
    // 1. Get stock before purchase
    const stockBeforeRes = await pool.query(
      `SELECT stock_quantity FROM product_variants WHERE id = $1`,
      [testVariantId]
    );
    const stockBefore = Number(stockBeforeRes.rows[0].stock_quantity);

    // 2. Place an order for 2 units
    const orderRes = await request(app)
      .post('/api/checkout')
      .set('Authorization', `Bearer ${tokens.customerToken}`)
      .send({
        items: [{ variantId: testVariantId, quantity: 2 }],
        shippingAddress: {
          fullName: 'Marcus Vance',
          phone: '+1 555-234-5678',
          streetAddress: '452 Broadway Ave',
          city: 'New York',
          state: 'NY',
          postalCode: '10013',
          country: 'United States',
        },
      });

    expect(orderRes.status).toBe(201);
    const orderId = orderRes.body.orderId;

    // Verify stock dropped by 2
    const stockAfterOrder = Number((await pool.query(
      `SELECT stock_quantity FROM product_variants WHERE id = $1`,
      [testVariantId]
    )).rows[0].stock_quantity);
    expect(stockAfterOrder).toBe(stockBefore - 2);

    // 3. Cancel order
    const cancelRes = await request(app)
      .post(`/api/orders/${orderId}/cancel`)
      .set('Authorization', `Bearer ${tokens.customerToken}`)
      .send({ reason: 'Changed mind' });

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.order.status).toBe('cancelled');

    // 4. Verify stock is restored back to original baseline
    const stockAfterCancel = Number((await pool.query(
      `SELECT stock_quantity FROM product_variants WHERE id = $1`,
      [testVariantId]
    )).rows[0].stock_quantity);
    expect(stockAfterCancel).toBe(stockBefore);

    // 5. Repeat cancellation attempt MUST be rejected!
    const repeatCancelRes = await request(app)
      .post(`/api/orders/${orderId}/cancel`)
      .set('Authorization', `Bearer ${tokens.customerToken}`);

    expect(repeatCancelRes.status).toBe(400);
    expect(repeatCancelRes.body.message).toContain('Order is already cancelled');

    // Stock MUST still equal stockBefore (NO double-restoration)
    const stockAfterRepeat = Number((await pool.query(
      `SELECT stock_quantity FROM product_variants WHERE id = $1`,
      [testVariantId]
    )).rows[0].stock_quantity);
    expect(stockAfterRepeat).toBe(stockBefore);
  });

  // Criterion 13: Invalid order state transitions are rejected
  it('rejects invalid state transitions (e.g. delivered -> placed)', async () => {
    // Create an order in delivered state
    const orderRes = await pool.query(`
      INSERT INTO orders (
        order_number, user_id, status, subtotal, discount_amount, tax_amount, shipping_fee, total_amount, shipping_address, payment_status, payment_method
      ) VALUES (
        $1, $2, 'delivered', 34.00, 0.00, 2.72, 10.00, 46.72,
        '{"streetAddress":"123 Test St"}', 'completed', 'credit_card'
      ) RETURNING id
    `, [`UT-INVALID-TRANS-${Date.now()}`, tokens.customerUser.id]);

    const orderId = orderRes.rows[0].id;

    // Admin attempts illegal transition: delivered -> placed
    const res = await request(app)
      .put(`/api/admin/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${tokens.adminToken}`)
      .send({ status: 'placed' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid state transition');
    expect(res.body.message).toContain('Invalid order state transition from "delivered" to "placed"');
  });
});

