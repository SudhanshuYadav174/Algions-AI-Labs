import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/server/app.js';
import { getTestTokens } from '../testHelpers.js';
import { pool } from '../../src/server/config/db.js';

describe('Concurrency: Idempotency & Duplicate Order Prevention (Criterion 9)', () => {
  let tokens: any;
  let testVariantId: number;
  let initialStock: number;

  beforeAll(async () => {
    tokens = await getTestTokens();

    const res = await pool.query(`SELECT id, stock_quantity FROM product_variants WHERE stock_quantity >= 10 LIMIT 1`);
    testVariantId = res.rows[0].id;
    initialStock = Number(res.rows[0].stock_quantity);
  });

  it('guarantees that identical checkout requests do not create duplicate orders or double-charge inventory', async () => {
    const fixedIdempotencyKey = `IDEMP-CHECKOUT-KEY-${Date.now()}`;

    const payload = {
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
      idempotencyKey: fixedIdempotencyKey,
    };

    // First request
    const firstRes = await request(app)
      .post('/api/checkout')
      .set('Authorization', `Bearer ${tokens.customerToken}`)
      .set('Idempotency-Key', fixedIdempotencyKey)
      .send(payload);

    expect(firstRes.status).toBe(201);
    const orderNumber1 = firstRes.body.orderNumber;

    // Immediate duplicate retry (network retry / impatient user double-click)
    const secondRes = await request(app)
      .post('/api/checkout')
      .set('Authorization', `Bearer ${tokens.customerToken}`)
      .set('Idempotency-Key', fixedIdempotencyKey)
      .send(payload);

    // Idempotent replay: Returns HTTP 201 or 200 with the EXACT same order number
    expect([200, 201]).toContain(secondRes.status);
    const orderNumber2 = secondRes.body.orderNumber;
    expect(orderNumber2).toBe(orderNumber1);

    // Verify database orders table: Exactly ONE row with this idempotency key
    const orderCountRes = await pool.query(
      `SELECT COUNT(*) FROM orders WHERE idempotency_key = $1`,
      [fixedIdempotencyKey]
    );
    expect(Number(orderCountRes.rows[0].count)).toBe(1);

    // Verify stock was ONLY decremented by 1, NOT 2!
    const stockAfterRes = await pool.query(
      `SELECT stock_quantity FROM product_variants WHERE id = $1`,
      [testVariantId]
    );
    const stockAfter = Number(stockAfterRes.rows[0].stock_quantity);
    expect(stockAfter).toBe(initialStock - 1);
  });
});

