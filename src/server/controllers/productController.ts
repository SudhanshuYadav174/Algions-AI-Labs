import type { Request, Response, NextFunction } from 'express';
import { pool } from '../config/db.js';

export async function getProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 12));
    const offset = (page - 1) * limit;

    const searchQuery = (req.query.q as string)?.trim();
    const categorySlug = (req.query.category as string)?.trim();
    const minPrice = parseFloat(req.query.minPrice as string);
    const maxPrice = parseFloat(req.query.maxPrice as string);
    const inStockOnly = req.query.inStock === 'true';
    const sortBy = (req.query.sortBy as string) || 'featured';

    const conditions: string[] = ['p.is_active = true'];
    const params: any[] = [];

    if (searchQuery) {
      params.push(`%${searchQuery}%`);
      conditions.push(`(p.name ILIKE $${params.length} OR p.description ILIKE $${params.length})`);
    }

    if (categorySlug && categorySlug !== 'all') {
      params.push(categorySlug);
      conditions.push(`c.slug = $${params.length}`);
    }

    if (!isNaN(minPrice)) {
      params.push(minPrice);
      conditions.push(`p.price >= $${params.length}`);
    }

    if (!isNaN(maxPrice)) {
      params.push(maxPrice);
      conditions.push(`p.price <= $${params.length}`);
    }

    if (inStockOnly) {
      conditions.push(`EXISTS (SELECT 1 FROM product_variants v WHERE v.product_id = p.id AND v.stock_quantity > 0)`);
    }

    let orderByClause = 'p.is_featured DESC, p.created_at DESC';
    if (sortBy === 'price_asc') {
      orderByClause = 'p.price ASC';
    } else if (sortBy === 'price_desc') {
      orderByClause = 'p.price DESC';
    } else if (sortBy === 'newest') {
      orderByClause = 'p.created_at DESC';
    } else if (sortBy === 'name_asc') {
      orderByClause = 'p.name ASC';
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Total Count
    const countSql = `
      SELECT COUNT(DISTINCT p.id) 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id
      ${whereClause}
    `;
    const countRes = await pool.query(countSql, params);
    const totalCount = parseInt(countRes.rows[0].count);

    // Items Query
    const itemsSql = `
      SELECT 
        p.id,
        p.name,
        p.slug,
        p.description,
        p.price,
        p.compare_at_price,
        p.image_url,
        p.is_featured,
        c.name AS category_name,
        c.slug AS category_slug,
        COALESCE(SUM(v.stock_quantity), 0) AS total_stock,
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'id', v.id,
            'size', v.size,
            'color', v.color,
            'sku', v.sku,
            'priceAdjustment', v.price_adjustment,
            'stockQuantity', v.stock_quantity
          )
        ) FILTER (WHERE v.id IS NOT NULL) AS variants
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN product_variants v ON p.id = v.product_id
      ${whereClause}
      GROUP BY p.id, c.name, c.slug
      ORDER BY ${orderByClause}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const itemsRes = await pool.query(itemsSql, [...params, limit, offset]);

    res.json({
      products: itemsRes.rows.map(row => ({
        ...row,
        price: Number(row.price),
        compare_at_price: row.compare_at_price ? Number(row.compare_at_price) : null,
        total_stock: Number(row.total_stock),
        variants: row.variants || [],
      })),
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getProductBySlugOrId(req: Request, res: Response, next: NextFunction) {
  try {
    const identifier = req.params.slugOrId;
    const isId = /^\d+$/.test(identifier);

    const productSql = `
      SELECT 
        p.id,
        p.name,
        p.slug,
        p.description,
        p.price,
        p.compare_at_price,
        p.image_url,
        p.additional_images,
        p.is_featured,
        p.is_active,
        p.created_at,
        c.id AS category_id,
        c.name AS category_name,
        c.slug AS category_slug
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE ${isId ? 'p.id = $1' : 'p.slug = $1'}
    `;

    const prodRes = await pool.query(productSql, [isId ? parseInt(identifier) : identifier]);

    if (prodRes.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = prodRes.rows[0];

    const variantsRes = await pool.query(
      `SELECT id, size, color, sku, price_adjustment, stock_quantity
       FROM product_variants
       WHERE product_id = $1
       ORDER BY size, color`,
      [product.id]
    );

    res.json({
      product: {
        ...product,
        price: Number(product.price),
        compare_at_price: product.compare_at_price ? Number(product.compare_at_price) : null,
        variants: variantsRes.rows.map(v => ({
          ...v,
          price_adjustment: Number(v.price_adjustment),
          stock_quantity: Number(v.stock_quantity),
        })),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getCategories(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await pool.query(`
      SELECT 
        c.id, 
        c.name, 
        c.slug, 
        c.description, 
        c.image_url,
        COUNT(p.id) AS product_count
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id AND p.is_active = true
      GROUP BY c.id
      ORDER BY c.id ASC
    `);

    res.json({ categories: result.rows });
  } catch (error) {
    next(error);
  }
}

export async function getFeaturedProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await pool.query(`
      SELECT 
        p.id,
        p.name,
        p.slug,
        p.description,
        p.price,
        p.compare_at_price,
        p.image_url,
        c.name AS category_name,
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'id', v.id,
            'size', v.size,
            'color', v.color,
            'stockQuantity', v.stock_quantity
          )
        ) FILTER (WHERE v.id IS NOT NULL) AS variants
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN product_variants v ON p.id = v.product_id
      WHERE p.is_active = true AND p.is_featured = true
      GROUP BY p.id, c.name
      ORDER BY p.id ASC
      LIMIT 8
    `);

    res.json({
      featured: result.rows.map(row => ({
        ...row,
        price: Number(row.price),
        compare_at_price: row.compare_at_price ? Number(row.compare_at_price) : null,
        variants: row.variants || [],
      })),
    });
  } catch (error) {
    next(error);
  }
}
