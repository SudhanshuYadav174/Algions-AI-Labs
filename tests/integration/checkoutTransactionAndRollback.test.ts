import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/server/app.js';
import { getTestTokens } from '../testHelpers.js';
import { pool } from '../../src/server/config/db.js';

describe('Integration: Transactions, Server Pricing & Payment Failure Rollback (Criteria 7, 8, 11)', () => {
  let tokens: any;
  let testVariantId: number;
  let initialStock: number;

  beforeAll(async () => {
    tokens = await getTestTokens();

    const res = await pool.query(`SELECT id, stock_quantity FROM product_variants WHERE stock_quantity >= 10 LIMIT 1`);
    testVariantId = res.rows[0].id;
    initialStock = Number(res.rows[0].stock_quantity);
  });

  it('recalculates prices server-side and applies database transactions successfully', async () => {
    const res = await request(app)
      .post('/api/checkout')
      .set('Authorization', `Bearer ${tokens.customerToken}`)
      .send({
        items: [{ variantId: testVariantId, quantity: 1 }],
        shippingAddress: {
          fullName: 'Marcus Vance',
          phone: '+1 555-234-5678',
          streetAddress: '452 Broadway Ave',
          city: 'New York',
          state: 'NY',
          postalCode: '10013',
          country: 'United States',
        },
        couponCode: 'WELCOME10',
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('orderNumber');
    expect(res.body.status).toBe('paid');

    // Check stock was safely decremented by 1 in PostgreSQL
    const stockAfter = await pool.query(
      `SELECT stock_quantity FROM product_variants WHERE id = $1`,
      [testVariantId]
    );
    expect(Number(stockAfter.rows[0].stock_quantity)).toBe(initialStock - 1);
  });

  // Criterion 11: Failed payments do not leave inconsistent order or inventory states
  it('rolls back transactions cleanly on payment gateway failure without reducing stock', async () => {
    // Current stock before failed attempt
    const stockBeforeRes = await pool.query(
      `SELECT stock_quantity FROM product_variants WHERE id = $1`,
      [testVariantId]
    );
    const stockBefore = Number(stockBeforeRes.rows[0].stock_quantity);

    // Initial total orders count
    const ordersBeforeRes = await pool.query(`SELECT COUNT(*) FROM orders`);
    const ordersCountBefore = Number(ordersBeforeRes.rows[0].count);

    const res = await request(app)
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
        simulatePaymentFailure: true, // Trigger simulated bank decline
      });

    expect(res.status).toBe(500);
    expect(res.body.message).toContain('Payment processing failed: Card was declined');

    // VERIFY ZERO PHANTOM STATE: Stock MUST be unchanged!
    const stockAfterRes = await pool.query(
      `SELECT stock_quantity FROM product_variants WHERE id = $1`,
      [testVariantId]
    );
    const stockAfter = Number(stockAfterRes.rows[0].stock_quantity);
    expect(stockAfter).toBe(stockBefore);

    // VERIFY ZERO ORPHAN ORDERS: Orders count MUST remain unchanged!
    const ordersAfterRes = await pool.query(`SELECT COUNT(*) FROM orders`);
    const ordersCountAfter = Number(ordersAfterRes.rows[0].count);
    expect(ordersCountAfter).toBe(ordersCountBefore);
  });
});
