import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/server/app.js';
import { getTestTokens } from '../testHelpers.js';
import { pool } from '../../src/server/config/db.js';

describe('Integration: Authentication, RBAC, and Customer Data Isolation', () => {
  let tokens: any;
  let customer1OrderId: number;

  beforeAll(async () => {
    tokens = await getTestTokens();

    // Create a private order belonging specifically to customer 1
    const orderRes = await pool.query(`
      INSERT INTO orders (
        order_number, user_id, status, subtotal, discount_amount, tax_amount, shipping_fee, total_amount, shipping_address, payment_status, payment_method
      ) VALUES (
        $1, $2, 'paid', 34.00, 0.00, 2.72, 10.00, 46.72,
        '{"streetAddress":"123 Test St"}', 'completed', 'credit_card'
      ) RETURNING id
    `, [`UT-ISOLATION-${Date.now()}`, tokens.customerUser.id]);

    customer1OrderId = orderRes.rows[0].id;
  });

  // Criterion 5: Customers cannot access admin APIs
  it('blocks regular customers from accessing admin sales reports with HTTP 403', async () => {
    const res = await request(app)
      .get('/api/admin/reports/sales')
      .set('Authorization', `Bearer ${tokens.customerToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Forbidden');
  });

  it('blocks unauthenticated requests to admin endpoints with HTTP 401', async () => {
    const res = await request(app).get('/api/admin/reports/sales');
    expect(res.status).toBe(401);
  });

  it('allows authorized admins to access admin endpoints with HTTP 200', async () => {
    const res = await request(app)
      .get('/api/admin/reports/sales')
      .set('Authorization', `Bearer ${tokens.adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('summary');
  });

  // Criterion 4: Customers cannot access another customer's data
  it('prevents Customer 2 from accessing Customer 1 order details with HTTP 403', async () => {
    const res = await request(app)
      .get(`/api/orders/${customer1OrderId}`)
      .set('Authorization', `Bearer ${tokens.customer2Token}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toContain('not authorized to view orders belonging to another customer');
  });

  it('allows Customer 1 to access their own order details with HTTP 200', async () => {
    const res = await request(app)
      .get(`/api/orders/${customer1OrderId}`)
      .set('Authorization', `Bearer ${tokens.customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.order.id).toBe(customer1OrderId);
  });

  it('allows Admins to inspect any customer order with HTTP 200', async () => {
    const res = await request(app)
      .get(`/api/orders/${customer1OrderId}`)
      .set('Authorization', `Bearer ${tokens.adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.order.id).toBe(customer1OrderId);
  });
});
