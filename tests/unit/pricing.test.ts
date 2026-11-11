import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { calculateOrderPricing } from '../../src/server/services/pricingService.js';
import { pool } from '../../src/server/config/db.js';

describe('Unit: Pricing Service & Server-Side Recalculations', () => {
  let sampleVariantId: number;

  beforeAll(async () => {
    const res = await pool.query(`SELECT id FROM product_variants WHERE stock_quantity > 5 LIMIT 1`);
    sampleVariantId = res.rows[0].id;
  });

  afterAll(async () => {
    // Keep pool open or cleanup
  });

  it('correctly calculates subtotal, 8% tax, and shipping fee', async () => {
    const result = await calculateOrderPricing([
      { variantId: sampleVariantId, quantity: 1 }
    ]);

    expect(result.subtotal).toBeGreaterThan(0);
    expect(result.items.length).toBe(1);
    expect(result.discountAmount).toBe(0);

    const expectedTax = Number((result.subtotal * 0.08).toFixed(2));
    expect(result.taxAmount).toBe(expectedTax);

    if (result.subtotal >= 100) {
      expect(result.shippingFee).toBe(0);
    } else {
      expect(result.shippingFee).toBe(10);
    }

    const expectedTotal = Number((result.subtotal + expectedTax + result.shippingFee).toFixed(2));
    expect(result.totalAmount).toBe(expectedTotal);
  });

  it('correctly applies percentage coupon (WELCOME10)', async () => {
    const result = await calculateOrderPricing(
      [{ variantId: sampleVariantId, quantity: 2 }],
      'WELCOME10'
    );

    expect(result.couponCode).toBe('WELCOME10');
    expect(result.discountAmount).toBe(Number(((result.subtotal * 10) / 100).toFixed(2)));
    expect(result.totalAmount).toBeLessThan(result.subtotal * 1.08 + result.shippingFee);
  });

  it('rejects invalid or non-existent promo codes without crashing', async () => {
    const result = await calculateOrderPricing(
      [{ variantId: sampleVariantId, quantity: 1 }],
      'FAKEDISCOUNT999'
    );

    expect(result.couponCode).toBeNull();
    expect(result.discountAmount).toBe(0);
  });

  it('throws error when quantity is zero or negative', async () => {
    await expect(
      calculateOrderPricing([{ variantId: sampleVariantId, quantity: -2 }])
    ).rejects.toThrow('Invalid item quantity');
  });

  it('throws error when items list is empty', async () => {
    await expect(calculateOrderPricing([])).rejects.toThrow(
      'Cannot calculate pricing for an empty item list'
    );
  });
});
