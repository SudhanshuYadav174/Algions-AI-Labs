import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/server/app.js';
import { getTestTokens } from '../testHelpers.js';
import { pool } from '../../src/server/config/db.js';

describe('Integration: Executive Reporting & Administrative Audit Logs (Criteria 14, 15)', () => {
  let tokens: any;

  beforeAll(async () => {
    tokens = await getTestTokens();
  });

  // Criterion 14: Dashboard reports reconcile with actual database records
  it('reconciles reported sales metrics with raw database aggregate calculations', async () => {
    const apiRes = await request(app)
      .get('/api/admin/reports/sales')
      .set('Authorization', `Bearer ${tokens.adminToken}`);

    expect(apiRes.status).toBe(200);
    const summary = apiRes.body.summary;

    // Run independent SQL aggregates directly in PostgreSQL
    const dbRes = await pool.query(`
      SELECT 
        COALESCE(SUM(total_amount), 0) AS total_revenue,
        COUNT(*) AS total_orders_all,
        COUNT(*) FILTER (WHERE status IN ('paid', 'packed', 'shipped', 'delivered')) AS paid_orders,
        COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled_orders
      FROM orders
    `);

    const expectedRevenue = Number(Number(dbRes.rows[0].total_revenue).toFixed(2));
    const expectedOrders = Number(dbRes.rows[0].total_orders_all);
    const expectedPaid = Number(dbRes.rows[0].paid_orders);
    const expectedCancelled = Number(dbRes.rows[0].cancelled_orders);

    expect(summary.totalRevenue).toBe(expectedRevenue);
    expect(summary.totalOrdersAll).toBe(expectedOrders);
    expect(summary.paidOrders).toBe(expectedPaid);
    expect(summary.cancelledOrders).toBe(expectedCancelled);
  });

  // Criterion 15: Audit logs correctly capture material administrative changes
  it('records audit logs with previous and new states upon material inventory adjustments', async () => {
    const variantRes = await pool.query(`SELECT id, stock_quantity FROM product_variants LIMIT 1`);
    const variantId = variantRes.rows[0].id;
    const oldStock = Number(variantRes.rows[0].stock_quantity);
    const newStock = oldStock + 15;

    // Execute administrative adjustment
    const adjustRes = await request(app)
      .put(`/api/admin/inventory/${variantId}`)
      .set('Authorization', `Bearer ${tokens.adminToken}`)
      .send({
        stockQuantity: newStock,
        reason: 'Seasonal warehouse restock inspection',
      });

    expect(adjustRes.status).toBe(200);

    // Verify row was created in audit_logs
    const logRes = await pool.query(
      `SELECT * FROM audit_logs 
       WHERE action = 'INVENTORY_MANUAL_ADJUSTMENT' AND entity_id = $1
       ORDER BY created_at DESC LIMIT 1`,
      [variantId.toString()]
    );

    expect(logRes.rows.length).toBe(1);
    const log = logRes.rows[0];
    expect(log.user_id).toBe(tokens.adminUser.id);
    expect(log.previous_state.stockQuantity).toBe(oldStock);
    expect(log.new_state.stockQuantity).toBe(newStock);
    expect(log.new_state.reason).toContain('Seasonal warehouse restock inspection');
  });
});

