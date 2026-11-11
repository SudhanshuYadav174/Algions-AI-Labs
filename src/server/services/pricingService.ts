import { pool } from '../config/db.js';
import type { PoolClient } from 'pg';

export interface CartPricingItem {
  variantId: number;
  quantity: number;
}

export interface CalculatedPricingItem {
  variantId: number;
  productId: number;
  productName: string;
  variantInfo: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  stockAvailable: number;
}

export interface PricingResult {
  items: CalculatedPricingItem[];
  subtotal: number;
  discountAmount: number;
  couponCode: string | null;
  taxAmount: number;
  shippingFee: number;
  totalAmount: number;
}

export async function calculateOrderPricing(
  items: CartPricingItem[],
  couponCode?: string | null,
  client?: PoolClient
): Promise<PricingResult> {
  if (!items || items.length === 0) {
    throw new Error('Cannot calculate pricing for an empty item list');
  }

  const db = client || pool;
  const calculatedItems: CalculatedPricingItem[] = [];
  let subtotal = 0;

  for (const item of items) {
    if (item.quantity <= 0) {
      throw new Error(`Invalid item quantity: ${item.quantity}. Quantity must be at least 1.`);
    }

    const res = await db.query(
      `SELECT 
        v.id AS variant_id,
        v.product_id,
        v.size,
        v.color,
        v.price_adjustment,
        v.stock_quantity,
        p.name AS product_name,
        p.price AS base_price,
        p.is_active
       FROM product_variants v
       JOIN products p ON v.product_id = p.id
       WHERE v.id = $1`,
      [item.variantId]
    );

    if (res.rows.length === 0) {
      throw new Error(`Product variant with ID ${item.variantId} not found`);
    }

    const row = res.rows[0];
    if (!row.is_active) {
      throw new Error(`Product "${row.product_name}" is currently unavailable`);
    }

    const unitPrice = Number((Number(row.base_price) + Number(row.price_adjustment)).toFixed(2));
    const totalPrice = Number((unitPrice * item.quantity).toFixed(2));
    subtotal = Number((subtotal + totalPrice).toFixed(2));

    calculatedItems.push({
      variantId: row.variant_id,
      productId: row.product_id,
      productName: row.product_name,
      variantInfo: `Size: ${row.size} / Color: ${row.color}`,
      unitPrice,
      quantity: item.quantity,
      totalPrice,
      stockAvailable: row.stock_quantity,
    });
  }

  // 2. Validate Coupon and Recalculate Discount Server-Side
  let discountAmount = 0;
  let validatedCouponCode: string | null = null;

  if (couponCode && couponCode.trim()) {
    const cleanCode = couponCode.trim().toUpperCase();
    const couponRes = await db.query(
      `SELECT * FROM coupons 
       WHERE code = $1 AND is_active = true 
       AND (expires_at IS NULL OR expires_at > NOW())`,
      [cleanCode]
    );

    if (couponRes.rows.length > 0) {
      const coupon = couponRes.rows[0];
      const minAmount = Number(coupon.min_order_amount);

      if (subtotal >= minAmount) {
        validatedCouponCode = coupon.code;
        const discountVal = Number(coupon.discount_value);

        if (coupon.discount_type === 'percent') {
          discountAmount = Number(((subtotal * discountVal) / 100).toFixed(2));
        } else {
          discountAmount = Math.min(discountVal, subtotal);
        }
      }
    }
  }

  const taxableAmount = Math.max(0, Number((subtotal - discountAmount).toFixed(2)));
  const taxAmount = Number((taxableAmount * 0.08).toFixed(2)); // Standard 8% tax
  const shippingFee = taxableAmount >= 100.00 || taxableAmount === 0 ? 0.00 : 10.00; // Free shipping over $100
  const totalAmount = Number((taxableAmount + taxAmount + shippingFee).toFixed(2));

  return {
    items: calculatedItems,
    subtotal,
    discountAmount,
    couponCode: validatedCouponCode,
    taxAmount,
    shippingFee,
    totalAmount,
  };
}

