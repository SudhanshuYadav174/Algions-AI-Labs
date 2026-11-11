import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import { pool } from '../config/db.js';

export async function seedDatabase() {
  console.log('Seeding Urban Threads database...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Seed Users
    const salt = await bcrypt.genSalt(10);
    const adminPass = await bcrypt.hash('Admin@123456', salt);
    const customerPass = await bcrypt.hash('Customer@123456', salt);

    const userRes = await client.query(`
      INSERT INTO users (email, password_hash, full_name, phone, role)
      VALUES 
        ('admin@urbanthreads.com', $1, 'Urban Admin', '+1 (555) 100-2000', 'admin'),
        ('customer@urbanthreads.com', $2, 'Marcus Vance', '+1 (555) 234-5678', 'customer'),
        ('jane@example.com', $2, 'Jane Doe', '+1 (555) 987-6543', 'customer')
      ON CONFLICT (email) DO NOTHING
      RETURNING id, email, role;
    `, [adminPass, customerPass]);

    const adminId = (await client.query(`SELECT id FROM users WHERE email = 'admin@urbanthreads.com'`)).rows[0]?.id;
    const customerId = (await client.query(`SELECT id FROM users WHERE email = 'customer@urbanthreads.com'`)).rows[0]?.id;
    const customer2Id = (await client.query(`SELECT id FROM users WHERE email = 'jane@example.com'`)).rows[0]?.id;

    // 2. Seed Addresses
    if (customerId) {
      await client.query(`
        INSERT INTO addresses (user_id, full_name, phone, street_address, apartment, city, state, postal_code, is_default)
        VALUES 
          ($1, 'Marcus Vance', '+1 (555) 234-5678', '452 Broadway Ave', 'Apt 4B', 'New York', 'NY', '10013', true)
        ON CONFLICT DO NOTHING;
      `, [customerId]);
    }

    if (customer2Id) {
      await client.query(`
        INSERT INTO addresses (user_id, full_name, phone, street_address, apartment, city, state, postal_code, is_default)
        VALUES 
          ($1, 'Jane Doe', '+1 (555) 987-6543', '789 Market St', 'Suite 12', 'San Francisco', 'CA', '94103', true)
        ON CONFLICT DO NOTHING;
      `, [customer2Id]);
    }

    // 3. Seed Categories
    await client.query(`
      INSERT INTO categories (name, slug, description, image_url)
      VALUES 
        ('New Arrivals', 'new-arrivals', 'Fresh cuts, premium drops, and latest streetwear silhouettes.', 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=800&q=80'),
        ('Men', 'men', 'Heavyweight tees, relaxed denim, and cargo tactical gear for men.', 'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?auto=format&fit=crop&w=800&q=80'),
        ('Women', 'women', 'Boxy cropped tees, structured outwear, and oversized streetwear fits for women.', 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80'),
        ('Accessories', 'accessories', 'Branded caps, tactical crossbody bags, socks, and statement jewelry.', 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=800&q=80'),
        ('Sale', 'sale', 'Exclusive discounts on limited season archival streetwear pieces.', 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=800&q=80')
      ON CONFLICT (slug) DO NOTHING;
    `);

    const catRows = (await client.query(`SELECT id, slug FROM categories`)).rows;
    const catMap = Object.fromEntries(catRows.map(r => [r.slug, r.id]));

    // 4. Seed Products
    const productsData = [
      {
        name: 'GRAPHIC TEE',
        slug: 'graphic-tee-washed-black',
        description: '280 GSM heavyweight washed cotton with distressed punk-inspired skull chaos screenprint. Pre-shrunk boxy streetwear cut with drop shoulder seams.',
        price: 34.00,
        compare_at_price: 45.00,
        category_id: catMap['men'] || catMap['new-arrivals'],
        image_url: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=800&q=80',
        is_featured: true,
        variants: [
          { size: 'S', color: 'Washed Black', sku: 'UT-TEE-BLK-S', price_adj: 0, stock: 25 },
          { size: 'M', color: 'Washed Black', sku: 'UT-TEE-BLK-M', price_adj: 0, stock: 35 },
          { size: 'L', color: 'Washed Black', sku: 'UT-TEE-BLK-L', price_adj: 0, stock: 20 },
          { size: 'XL', color: 'Washed Black', sku: 'UT-TEE-BLK-XL', price_adj: 0, stock: 15 },
        ]
      },
      {
        name: 'CARGO JOGGERS',
        slug: 'cargo-joggers-olive-drab',
        description: 'Multi-pocket tactical ripstop cargo pants featuring adjustable ankle bungee toggles, reinforced knee panels, and utility webbing straps.',
        price: 64.00,
        compare_at_price: 80.00,
        category_id: catMap['men'] || catMap['new-arrivals'],
        image_url: 'https://images.unsplash.com/photo-1517445312882-bc9910d016b7?auto=format&fit=crop&w=800&q=80',
        is_featured: true,
        variants: [
          { size: 'S', color: 'Olive Drab', sku: 'UT-CRG-OLV-S', price_adj: 0, stock: 15 },
          { size: 'M', color: 'Olive Drab', sku: 'UT-CRG-OLV-M', price_adj: 0, stock: 25 },
          { size: 'L', color: 'Olive Drab', sku: 'UT-CRG-OLV-L', price_adj: 0, stock: 18 },
          { size: 'XL', color: 'Olive Drab', sku: 'UT-CRG-OLV-XL', price_adj: 0, stock: 10 },
        ]
      },
      {
        name: 'CHUNKY SNEAKERS',
        slug: 'chunky-sneakers-black-grey',
        description: 'Architectural platform runner with mixed leather, mesh, and reflective panels. Sculpted EVA lightweight midsole for supreme comfort and NYC pavement grip.',
        price: 89.00,
        compare_at_price: 110.00,
        category_id: catMap['men'] || catMap['new-arrivals'],
        image_url: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=800&q=80',
        is_featured: true,
        variants: [
          { size: 'US 8', color: 'Black / Grey', sku: 'UT-SNK-BGR-08', price_adj: 0, stock: 12 },
          { size: 'US 9', color: 'Black / Grey', sku: 'UT-SNK-BGR-09', price_adj: 0, stock: 15 },
          { size: 'US 10', color: 'Black / Grey', sku: 'UT-SNK-BGR-10', price_adj: 0, stock: 18 },
          { size: 'US 11', color: 'Black / Grey', sku: 'UT-SNK-BGR-11', price_adj: 0, stock: 8 },
        ]
      },
      {
        name: 'UTILITY BASEBALL CAP',
        slug: 'utility-baseball-cap-black',
        description: 'Structured 6-panel low-profile dad cap in heavyweight brushed cotton twill with high-density embroidered UT block monogram on front.',
        price: 28.00,
        compare_at_price: 35.00,
        category_id: catMap['accessories'],
        image_url: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=800&q=80',
        is_featured: true,
        variants: [
          { size: 'One Size', color: 'Black', sku: 'UT-CAP-BLK-OS', price_adj: 0, stock: 50 },
          { size: 'One Size', color: 'Olive Drab', sku: 'UT-CAP-OLV-OS', price_adj: 0, stock: 25 },
        ]
      },
      {
        name: 'OVERSIZED CITY HOODIE',
        slug: 'oversized-city-hoodie',
        description: '450 GSM custom French terry fleece with signature BUILT IN THE CITY puff print on back and UT chest embroidery. Double-layered hood without drawstrings.',
        price: 78.00,
        compare_at_price: 95.00,
        category_id: catMap['new-arrivals'],
        image_url: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=800&q=80',
        is_featured: true,
        variants: [
          { size: 'S', color: 'Carbon Black', sku: 'UT-HOD-BLK-S', price_adj: 0, stock: 14 },
          { size: 'M', color: 'Carbon Black', sku: 'UT-HOD-BLK-M', price_adj: 0, stock: 22 },
          { size: 'L', color: 'Carbon Black', sku: 'UT-HOD-BLK-L', price_adj: 0, stock: 19 },
          { size: 'XL', color: 'Carbon Black', sku: 'UT-HOD-BLK-XL', price_adj: 0, stock: 12 },
        ]
      },
      {
        name: 'ACID WASH CROPPED JACKET',
        slug: 'acid-wash-cropped-jacket',
        description: 'Vintage-inspired 14oz rigid denim trucker jacket tailored in a boxy cropped silhouette with custom branded matte hardware.',
        price: 98.00,
        compare_at_price: 120.00,
        category_id: catMap['women'],
        image_url: 'https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=800&q=80',
        is_featured: false,
        variants: [
          { size: 'XS', color: 'Washed Indigo', sku: 'UT-JKT-IND-XS', price_adj: 0, stock: 10 },
          { size: 'S', color: 'Washed Indigo', sku: 'UT-JKT-IND-S', price_adj: 0, stock: 15 },
          { size: 'M', color: 'Washed Indigo', sku: 'UT-JKT-IND-M', price_adj: 0, stock: 12 },
        ]
      },
      {
        name: 'TACTICAL CROSSBODY BAG',
        slug: 'tactical-crossbody-bag',
        description: 'Weather-resistant Cordura nylon sling with water-sealed YKK zips, MOLLE attachment loops, and quick-release FIDLOCK-style magnetic buckle.',
        price: 42.00,
        compare_at_price: 50.00,
        category_id: catMap['accessories'],
        image_url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80',
        is_featured: false,
        variants: [
          { size: 'One Size', color: 'Matte Black', sku: 'UT-BAG-BLK-OS', price_adj: 0, stock: 40 },
        ]
      },
      {
        name: 'ARCHIVAL WIDE-LEG JEANS',
        slug: 'archival-wide-leg-jeans',
        description: 'Raw hem relaxed wide-cut streetwear denim with subtle whisker fading, reinforced belt loops, and authentic metal rivets.',
        price: 85.00,
        compare_at_price: 105.00,
        category_id: catMap['sale'],
        image_url: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=800&q=80',
        is_featured: false,
        variants: [
          { size: '30', color: 'Vintage Wash', sku: 'UT-JNS-VNT-30', price_adj: 0, stock: 10 },
          { size: '32', color: 'Vintage Wash', sku: 'UT-JNS-VNT-32', price_adj: 0, stock: 18 },
          { size: '34', color: 'Vintage Wash', sku: 'UT-JNS-VNT-34', price_adj: 0, stock: 14 },
        ]
      }
    ];

    for (const prod of productsData) {
      const prodRes = await client.query(`
        INSERT INTO products (category_id, name, slug, description, price, compare_at_price, image_url, is_featured, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
        ON CONFLICT (slug) DO UPDATE SET 
          price = EXCLUDED.price,
          compare_at_price = EXCLUDED.compare_at_price,
          description = EXCLUDED.description,
          image_url = EXCLUDED.image_url
        RETURNING id;
      `, [prod.category_id, prod.name, prod.slug, prod.description, prod.price, prod.compare_at_price, prod.image_url, prod.is_featured]);

      const productId = prodRes.rows[0].id;

      for (const variant of prod.variants) {
        await client.query(`
          INSERT INTO product_variants (product_id, size, color, sku, price_adjustment, stock_quantity)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (sku) DO UPDATE SET 
            stock_quantity = EXCLUDED.stock_quantity,
            price_adjustment = EXCLUDED.price_adjustment;
        `, [productId, variant.size, variant.color, variant.sku, variant.price_adj, variant.stock]);
      }
    }

    // 5. Seed Coupons
    await client.query(`
      INSERT INTO coupons (code, discount_type, discount_value, min_order_amount, is_active, expires_at)
      VALUES 
        ('WELCOME10', 'percent', 10.00, 0.00, true, NOW() + INTERVAL '1 year'),
        ('URBAN20', 'percent', 20.00, 50.00, true, NOW() + INTERVAL '1 year'),
        ('FREESHIP', 'fixed', 10.00, 30.00, true, NOW() + INTERVAL '1 year')
      ON CONFLICT (code) DO NOTHING;
    `);

    // 6. Seed Sample Initial Order for Dashboard Metrics
    if (customerId) {
      const sampleVariant = (await client.query(`SELECT id, product_id, stock_quantity FROM product_variants LIMIT 1`)).rows[0];
      const prod = (await client.query(`SELECT name, price FROM products WHERE id = $1`, [sampleVariant.product_id])).rows[0];

      const existingOrder = await client.query(`SELECT id FROM orders WHERE order_number = 'UT-DEMO-1001'`);
      if (existingOrder.rows.length === 0) {
        const orderRes = await client.query(`
          INSERT INTO orders (
            order_number, user_id, status, subtotal, discount_amount, coupon_code, tax_amount, shipping_fee, total_amount, shipping_address, payment_status, payment_method
          ) VALUES (
            'UT-DEMO-1001', $1, 'delivered', $2, 0.00, NULL, ROUND($2 * 0.08, 2), 10.00, ROUND($2 + ($2 * 0.08) + 10.00, 2),
            $3, 'completed', 'credit_card'
          ) RETURNING id;
        `, [customerId, prod.price, JSON.stringify({
          fullName: 'Marcus Vance',
          phone: '+1 (555) 234-5678',
          streetAddress: '452 Broadway Ave',
          city: 'New York',
          state: 'NY',
          postalCode: '10013',
          country: 'United States'
        })]);

        const orderId = orderRes.rows[0].id;
        await client.query(`
          INSERT INTO order_items (order_id, product_id, variant_id, product_name, variant_info, unit_price, quantity, total_price)
          VALUES ($1, $2, $3, $4, 'Size M / Washed Black', $5, 1, $5)
        `, [orderId, sampleVariant.product_id, sampleVariant.id, prod.name, prod.price]);

        // Audit log
        await client.query(`
          INSERT INTO audit_logs (user_id, action, entity_type, entity_id, previous_state, new_state)
          VALUES ($1, 'CREATE_ORDER', 'order', $2, NULL, $3)
        `, [customerId, orderId.toString(), JSON.stringify({ order_number: 'UT-DEMO-1001', status: 'delivered', total: prod.price })]);
      }
    }

    await client.query('COMMIT');
    console.log('Database seeded successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Seeding failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
