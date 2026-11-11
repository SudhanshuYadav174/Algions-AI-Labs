import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/server/app.js';
import { getTestTokens } from '../testHelpers.js';
import { pool } from '../../src/server/config/db.js';

describe('Concurrency: Race Conditions & Inventory Consistency (Criterion 10)', () => {
  let tokens: any;
  let limitedVariantId: number;

  beforeAll(async () => {
    tokens = await getTestTokens();

    // Create a special product variant with EXACTLY 1 unit of stock
    const prodRes = await pool.query(`SELECT id FROM products LIMIT 1`);
    const productId = prodRes.rows[0].id;

    const uniqueTag = `RACE_${Date.now()}`;
    const variantRes = await pool.query(
      `INSERT INTO product_variants (product_id, size, color, sku, price_adjustment, stock_quantity)
       VALUES ($1, $2, $2, $3, 0.00, 1)
       RETURNING id, stock_quantity`,
      [productId, uniqueTag, `SKU-${uniqueTag}`]
    );

    limitedVariantId = variantRes.rows[0].id;
  });

  it('prevents overselling when 10 concurrent checkout requests compete for 1 item', async () => {
    const address = {
      fullName: 'Marcus Vance',
      phone: '+1 555-234-5678',
      streetAddress: '452 Broadway Ave',
      city: 'New York',
      state: 'NY',
      postalCode: '10013',
      country: 'United States',
    };

    // Dispatch 10 concurrent requests simultaneously
    const concurrentRequests = Array.from({ length: 10 }).map((_, index) => {
      return request(app)
        .post('/api/checkout')
        .set('Authorization', `Bearer ${tokens.customerToken}`)
        .send({
          items: [{ variantId: limitedVariantId, quantity: 1 }],
          shippingAddress: address,
          idempotencyKey: `RACE-IDEMP-${index}-${Date.now()}`,
        });
    });

    const results = await Promise.all(concurrentRequests);

    const successfulCheckouts = results.filter((r) => r.status === 201);
    const rejectedCheckouts = results.filter((r) => r.status === 409 || r.status === 400);

    // EXACTLY 1 purchase MUST succeed because stock was 1
    expect(successfulCheckouts.length).toBe(1);

    // EXACTLY 9 purchases MUST be rejected
    expect(rejectedCheckouts.length).toBe(9);

    // Final inventory in PostgreSQL MUST be exactly 0, NEVER negative!
    const finalStockRes = await pool.query(
      `SELECT stock_quantity FROM product_variants WHERE id = $1`,
      [limitedVariantId]
    );
    const finalStock = Number(finalStockRes.rows[0].stock_quantity);
    expect(finalStock).toBe(0);
  });
});
