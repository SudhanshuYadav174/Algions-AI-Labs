import type { PoolClient } from 'pg';

export class InsufficientStockError extends Error {
  public variantId: number;
  public available: number;
  public requested: number;

  constructor(variantId: number, available: number, requested: number) {
    super(`Insufficient inventory: only ${available} item(s) available for variant #${variantId}, requested ${requested}.`);
    this.name = 'InsufficientStockError';
    this.variantId = variantId;
    this.available = available;
    this.requested = requested;
  }
}

export async function checkAndDeductStock(
  client: PoolClient,
  variantId: number,
  quantityToDeduct: number,
  orderId?: number | null,
  reason = 'order_purchase'
): Promise<{ previousStock: number; newStock: number }> {
  // CRITICAL: Row-level lock ensures no concurrent race condition can oversell inventory
  const res = await client.query(
    `SELECT id, stock_quantity FROM product_variants WHERE id = $1 FOR UPDATE`,
    [variantId]
  );

  if (res.rows.length === 0) {
    throw new Error(`Variant #${variantId} not found`);
  }

  const currentStock = Number(res.rows[0].stock_quantity);

  if (currentStock < quantityToDeduct) {
    throw new InsufficientStockError(variantId, currentStock, quantityToDeduct);
  }

  const newStock = currentStock - quantityToDeduct;

  await client.query(
    `UPDATE product_variants 
     SET stock_quantity = $1, updated_at = NOW() 
     WHERE id = $2`,
    [newStock, variantId]
  );

  await client.query(
    `INSERT INTO inventory_logs (variant_id, order_id, change_amount, previous_stock, new_stock, reason)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [variantId, orderId || null, -quantityToDeduct, currentStock, newStock, reason]
  );

  return { previousStock: currentStock, newStock };
}

export async function restoreStock(
  client: PoolClient,
  variantId: number,
  quantityToRestore: number,
  orderId?: number | null,
  reason = 'order_cancellation'
): Promise<{ previousStock: number; newStock: number }> {
  const res = await client.query(
    `SELECT id, stock_quantity FROM product_variants WHERE id = $1 FOR UPDATE`,
    [variantId]
  );

  if (res.rows.length === 0) {
    throw new Error(`Variant #${variantId} not found`);
  }

  const currentStock = Number(res.rows[0].stock_quantity);
  const newStock = currentStock + quantityToRestore;

  await client.query(
    `UPDATE product_variants 
     SET stock_quantity = $1, updated_at = NOW() 
     WHERE id = $2`,
    [newStock, variantId]
  );

  await client.query(
    `INSERT INTO inventory_logs (variant_id, order_id, change_amount, previous_stock, new_stock, reason)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [variantId, orderId || null, quantityToRestore, currentStock, newStock, reason]
  );

  return { previousStock: currentStock, newStock };
}
