import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { pool } from '../config/db.js';

export const addToCartSchema = z.object({
  variantId: z.number().int().positive('Valid variant ID is required'),
  quantity: z.number().int().positive('Quantity must be at least 1'),
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int().positive('Quantity must be at least 1'),
});

async function getOrCreateCartId(userId?: number, sessionId?: string): Promise<number> {
  if (userId) {
    const existing = await pool.query('SELECT id FROM carts WHERE user_id = $1', [userId]);
    if (existing.rows.length > 0) return existing.rows[0].id;

    const created = await pool.query(
      'INSERT INTO carts (user_id) VALUES ($1) ON CONFLICT (user_id) DO UPDATE SET updated_at = NOW() RETURNING id',
      [userId]
    );
    return created.rows[0].id;
  }

  if (sessionId) {
    const existing = await pool.query('SELECT id FROM carts WHERE session_id = $1', [sessionId]);
    if (existing.rows.length > 0) return existing.rows[0].id;

    const created = await pool.query(
      'INSERT INTO carts (session_id) VALUES ($1) RETURNING id',
      [sessionId]
    );
    return created.rows[0].id;
  }

  // Create an anonymous cart
  const created = await pool.query('INSERT INTO carts DEFAULT VALUES RETURNING id');
  return created.rows[0].id;
}

export async function getCart(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    const sessionId = (req.headers['x-session-id'] as string) || (req.query.sessionId as string);

    const cartId = await getOrCreateCartId(userId, sessionId);

    const itemsRes = await pool.query(
      `SELECT 
        ci.id AS cart_item_id,
        ci.quantity,
        v.id AS variant_id,
        v.size,
        v.color,
        v.sku,
        v.stock_quantity,
        v.price_adjustment,
        p.id AS product_id,
        p.name AS product_name,
        p.slug AS product_slug,
        p.price AS base_price,
        p.image_url
       FROM cart_items ci
       JOIN product_variants v ON ci.variant_id = v.id
       JOIN products p ON v.product_id = p.id
       WHERE ci.cart_id = $1
       ORDER BY ci.created_at ASC`,
      [cartId]
    );

    const items = itemsRes.rows.map(item => {
      const unitPrice = Number((Number(item.base_price) + Number(item.price_adjustment)).toFixed(2));
      const totalPrice = Number((unitPrice * item.quantity).toFixed(2));
      return {
        cartItemId: item.cart_item_id,
        variantId: item.variant_id,
        productId: item.product_id,
        productName: item.product_name,
        productSlug: item.product_slug,
        size: item.size,
        color: item.color,
        sku: item.sku,
        unitPrice,
        quantity: item.quantity,
        totalPrice,
        stockAvailable: item.stock_quantity,
        imageUrl: item.image_url,
      };
    });

    const subtotal = Number(items.reduce((acc, curr) => acc + curr.totalPrice, 0).toFixed(2));

    res.json({
      cartId,
      items,
      subtotal,
      itemCount: items.reduce((acc, curr) => acc + curr.quantity, 0),
    });
  } catch (error) {
    next(error);
  }
}

export async function addToCart(req: Request, res: Response, next: NextFunction) {
  try {
    const { variantId, quantity } = req.body;
    const userId = req.user?.id;
    const sessionId = (req.headers['x-session-id'] as string) || (req.query.sessionId as string);

    // 1. Fetch variant and check inventory stock
    const variantRes = await pool.query(
      `SELECT v.id, v.stock_quantity, p.name 
       FROM product_variants v
       JOIN products p ON v.product_id = p.id
       WHERE v.id = $1`,
      [variantId]
    );

    if (variantRes.rows.length === 0) {
      return res.status(404).json({ error: 'Variant not found' });
    }

    const variant = variantRes.rows[0];
    const stockAvailable = Number(variant.stock_quantity);

    const cartId = await getOrCreateCartId(userId, sessionId);

    // Check existing item in cart
    const existingItemRes = await pool.query(
      `SELECT id, quantity FROM cart_items WHERE cart_id = $1 AND variant_id = $2`,
      [cartId, variantId]
    );

    const currentInCart = existingItemRes.rows.length > 0 ? existingItemRes.rows[0].quantity : 0;
    const proposedTotal = currentInCart + quantity;

    // Strict Enforcement of Criterion 6: Cart quantities cannot exceed available inventory
    if (proposedTotal > stockAvailable) {
      return res.status(400).json({
        error: 'Inventory limit exceeded',
        message: `Cannot add ${quantity} item(s). Only ${stockAvailable} item(s) available in stock (you already have ${currentInCart} in cart).`,
        available: stockAvailable,
        currentlyInCart: currentInCart,
      });
    }

    if (existingItemRes.rows.length > 0) {
      await pool.query(
        `UPDATE cart_items 
         SET quantity = $1, updated_at = NOW() 
         WHERE id = $2`,
        [proposedTotal, existingItemRes.rows[0].id]
      );
    } else {
      await pool.query(
        `INSERT INTO cart_items (cart_id, variant_id, quantity)
         VALUES ($1, $2, $3)`,
        [cartId, variantId, quantity]
      );
    }

    return getCart(req, res, next);
  } catch (error) {
    next(error);
  }
}

export async function updateCartItem(req: Request, res: Response, next: NextFunction) {
  try {
    const cartItemId = parseInt(req.params.id);
    const { quantity } = req.body;
    const userId = req.user?.id;
    const sessionId = (req.headers['x-session-id'] as string) || (req.query.sessionId as string);

    const itemRes = await pool.query(
      `SELECT ci.id, ci.cart_id, ci.variant_id, v.stock_quantity, c.user_id, c.session_id
       FROM cart_items ci
       JOIN product_variants v ON ci.variant_id = v.id
       JOIN carts c ON ci.cart_id = c.id
       WHERE ci.id = $1`,
      [cartItemId]
    );

    if (itemRes.rows.length === 0) {
      return res.status(404).json({ error: 'Cart item not found' });
    }

    const item = itemRes.rows[0];

    // Ownership check: user or session must own the cart
    if (userId && item.user_id !== userId) {
      return res.status(403).json({ error: 'Forbidden: Access to another customer\'s cart is prohibited.' });
    }

    const stockAvailable = Number(item.stock_quantity);

    // Strict Enforcement of Criterion 6
    if (quantity > stockAvailable) {
      return res.status(400).json({
        error: 'Inventory limit exceeded',
        message: `Cannot set quantity to ${quantity}. Only ${stockAvailable} item(s) available in stock.`,
        available: stockAvailable,
      });
    }

    await pool.query(
      `UPDATE cart_items SET quantity = $1, updated_at = NOW() WHERE id = $2`,
      [quantity, cartItemId]
    );

    return getCart(req, res, next);
  } catch (error) {
    next(error);
  }
}

export async function removeCartItem(req: Request, res: Response, next: NextFunction) {
  try {
    const cartItemId = parseInt(req.params.id);
    const userId = req.user?.id;

    if (userId) {
      const check = await pool.query(
        `SELECT ci.id FROM cart_items ci JOIN carts c ON ci.cart_id = c.id WHERE ci.id = $1 AND c.user_id = $2`,
        [cartItemId, userId]
      );
      if (check.rows.length === 0) {
        return res.status(404).json({ error: 'Cart item not found or unauthorized' });
      }
    }

    await pool.query('DELETE FROM cart_items WHERE id = $1', [cartItemId]);

    return getCart(req, res, next);
  } catch (error) {
    next(error);
  }
}

export async function clearCart(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    const sessionId = (req.headers['x-session-id'] as string) || (req.query.sessionId as string);
    const cartId = await getOrCreateCartId(userId, sessionId);

    await pool.query('DELETE FROM cart_items WHERE cart_id = $1', [cartId]);

    res.json({ message: 'Cart cleared successfully', items: [], subtotal: 0, itemCount: 0 });
  } catch (error) {
    next(error);
  }
}
