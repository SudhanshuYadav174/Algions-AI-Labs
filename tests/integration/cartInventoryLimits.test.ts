import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/server/app.js';
import { getTestTokens } from '../testHelpers.js';
import { pool } from '../../src/server/config/db.js';

describe('Integration: Cart Quantities vs Available Inventory (Criterion 6)', () => {
  let tokens: any;
  let testVariantId: number;
  let availableStock: number;

  beforeAll(async () => {
    tokens = await getTestTokens();

    // Query a variant with known stock
    const res = await pool.query(`SELECT id, stock_quantity FROM product_variants WHERE stock_quantity > 0 LIMIT 1`);
    testVariantId = res.rows[0].id;
    availableStock = Number(res.rows[0].stock_quantity);

    // Clean user cart
    await request(app)
      .delete('/api/cart')
      .set('Authorization', `Bearer ${tokens.customerToken}`);
  });

  it('rejects adding quantity that exceeds available inventory with HTTP 400', async () => {
    const excessiveQty = availableStock + 10;

    const res = await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${tokens.customerToken}`)
      .send({
        variantId: testVariantId,
        quantity: excessiveQty,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Inventory limit exceeded');
    expect(res.body.message).toContain(`Only ${availableStock} item(s) available in stock`);
  });

  it('allows adding an in-stock quantity (e.g. 1 unit) successfully', async () => {
    const res = await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${tokens.customerToken}`)
      .send({
        variantId: testVariantId,
        quantity: 1,
      });

    expect(res.status).toBe(200);
    expect(res.body.itemCount).toBe(1);
    expect(res.body.items[0].variantId).toBe(testVariantId);
  });

  it('rejects updating cart item to a quantity that exceeds stock with HTTP 400', async () => {
    // Get existing item id
    const cartRes = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${tokens.customerToken}`);

    const cartItemId = cartRes.body.items[0].cartItemId;

    const res = await request(app)
      .put(`/api/cart/items/${cartItemId}`)
      .set('Authorization', `Bearer ${tokens.customerToken}`)
      .send({
        quantity: availableStock + 50,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Inventory limit exceeded');
  });
});
