import { pool } from '../config/db.js';
import type { PoolClient } from 'pg';

export interface AuditLogParams {
  userId?: number | null;
  action: string;
  entityType: string;
  entityId: string;
  previousState?: any;
  newState?: any;
  ipAddress?: string;
}

export async function logAudit(
  params: AuditLogParams,
  client?: PoolClient
): Promise<void> {
  const db = client || pool;
  try {
    await db.query(
      `INSERT INTO audit_logs (
        user_id, action, entity_type, entity_id, previous_state, new_state, ip_address
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        params.userId || null,
        params.action,
        params.entityType,
        params.entityId,
        params.previousState ? JSON.stringify(params.previousState) : null,
        params.newState ? JSON.stringify(params.newState) : null,
        params.ipAddress || null,
      ]
    );
  } catch (err) {
    console.error('Failed to write audit log:', err);
    // In production audit logging failure can either throw or log depending on compliance policy
  }
}

