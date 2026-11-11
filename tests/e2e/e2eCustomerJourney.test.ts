import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/server/app.js';
import { getTestTokens } from '../testHelpers.js';
import { pool } from '../../src/server/config/db.js';

describe('E2E: Complete Customer & Operational Staff Journey', () => {
  let tokens: any;
  let testVariantId: number;
  let testProductSlug: string;

  beforeAll(async () => {
    tokens = await getTestTokens();

    const res = await pool.query(`
      SELECT p.slug, v.id, v.stock_quantity 
      FROM products p 
      JOIN product_variants v ON p.id = v.product_id 
      WHERE v.stock_quantity > 5 
      LIMIT 1
    `);
    testProductSlug = res.rows[0].slug;
    testVariantId = res.rows[0].id;
  });

  it('completes the full journey: register -> browse -> cart -> quote -> checkout -> track -> admin verify', async () => {
    // Step 1: Register a new customer
    const newEmail = `shopper_${Date.now()}@example.com`;
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: newEmail,
        password: 'Password@123',
        fullName: 'Alex Street',
        phone: '+1 555-900-1234',
      });

    expect(regRes.status).toBe(201);
    const userToken = regRes.body.token;
    expect(userToken).toBeDefined();

    // Step 2: Browse catalog with search query
    const searchRes = await request(app)
      .get(`/api/products?q=TEE`)
      .expect(200);

    expect(searchRes.body.products.length).toBeGreaterThan(0);

    // Step 3: Fetch detailed product page
    const detailRes = await request(app)
      .get(`/api/products/${testProductSlug}`)
      .expect(200);

    expect(detailRes.body.product).toBeDefined();
    expect(detailRes.body.product.variants.length).toBeGreaterThan(0);

    // Step 4: Add to persistent user cart
    const addCartRes = await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        variantId: testVariantId,
        quantity: 2,
      })
      .expect(200);

    expect(addCartRes.body.itemCount).toBe(2);

    // Step 5: Request server-side pricing quote with promo coupon
    const quoteRes = await request(app)
      .post('/api/checkout/quote')
      .send({
        items: [{ variantId: testVariantId, quantity: 2 }],
        couponCode: 'WELCOME10',
      })
      .expect(200);

    expect(quoteRes.body.discountAmount).toBeGreaterThan(0);
    expect(quoteRes.body.couponCode).toBe('WELCOME10');

    // Step 6: Execute Checkout with Idempotency Key
    const idempotencyKey = `E2E-IDEMP-${Date.now()}`;
    const checkoutRes = await request(app)
      .post('/api/checkout')
      .set('Authorization', `Bearer ${userToken}`)
      .set('Idempotency-Key', idempotencyKey)
      .send({
        items: [{ variantId: testVariantId, quantity: 2 }],
        shippingAddress: {
          fullName: 'Alex Street',
          phone: '+1 555-900-1234',
          streetAddress: '100 Broadway',
          city: 'New York',
          state: 'NY',
          postalCode: '10001',
          country: 'United States',
        },
        couponCode: 'WELCOME10',
      })
      .expect(201);

    const orderId = checkoutRes.body.orderId;
    const orderNumber = checkoutRes.body.orderNumber;
    expect(orderId).toBeDefined();
    expect(orderNumber).toBeDefined();

    // Step 7: Customer checks their cart (Cart must be emptied upon checkout)
    const emptyCartRes = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    expect(emptyCartRes.body.itemCount).toBe(0);

    // Step 8: Customer tracks their order in order history
    const myOrdersRes = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    const placedOrder = myOrdersRes.body.orders.find((o: any) => o.id === orderId);
    expect(placedOrder).toBeDefined();
    expect(placedOrder.status).toBe('paid');

    // Step 9: Staff/Admin view verifies the order and advances state: paid -> packed -> shipped
    const adminOrdersRes = await request(app)
      .get('/api/admin/orders')
      .set('Authorization', `Bearer ${tokens.adminToken}`)
      .expect(200);

    const foundInAdmin = adminOrdersRes.body.orders.find((o: any) => o.id === orderId);
    expect(foundInAdmin).toBeDefined();

    // Advance state to packed
    const packRes = await request(app)
      .put(`/api/admin/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${tokens.adminToken}`)
      .send({ status: 'packed' })
      .expect(200);

    expect(packRes.body.order.status).toBe('packed');

    // Advance state to shipped
    const shipRes = await request(app)
      .put(`/api/admin/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${tokens.adminToken}`)
      .send({ status: 'shipped' })
      .expect(200);

    expect(shipRes.body.order.status).toBe('shipped');
  });
});

