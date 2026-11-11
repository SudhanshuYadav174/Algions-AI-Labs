import { pool } from '../src/server/config/db.js';
import { generateToken } from '../src/server/middleware/auth.js';

export async function getTestTokens() {
  const adminRes = await pool.query(`SELECT id, email, full_name, role FROM users WHERE email = 'admin@urbanthreads.com'`);
  const customerRes = await pool.query(`SELECT id, email, full_name, role FROM users WHERE email = 'customer@urbanthreads.com'`);
  const customer2Res = await pool.query(`SELECT id, email, full_name, role FROM users WHERE email = 'jane@example.com'`);

  const admin = adminRes.rows[0];
  const customer = customerRes.rows[0];
  const customer2 = customer2Res.rows[0];

  return {
    adminToken: generateToken({ id: admin.id, email: admin.email, role: 'admin', fullName: admin.full_name }),
    adminUser: admin,
    customerToken: generateToken({ id: customer.id, email: customer.email, role: 'customer', fullName: customer.full_name }),
    customerUser: customer,
    customer2Token: generateToken({ id: customer2.id, email: customer2.email, role: 'customer', fullName: customer2.full_name }),
    customer2User: customer2,
  };
}
