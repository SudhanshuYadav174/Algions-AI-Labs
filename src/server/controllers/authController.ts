import type { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { pool } from '../config/db.js';
import { generateToken } from '../middleware/auth.js';
import { logAudit } from '../services/auditService.js';

export const registerSchema = z.object({
  email: z.string().email('Invalid email address format'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  phone: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address format'),
  password: z.string().min(1, 'Password is required'),
});

export const addressSchema = z.object({
  fullName: z.string().min(2, 'Recipient name is required'),
  phone: z.string().min(7, 'Valid contact phone number is required'),
  streetAddress: z.string().min(3, 'Street address is required'),
  apartment: z.string().optional(),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State / Province is required'),
  postalCode: z.string().min(3, 'Postal code is required'),
  country: z.string().default('United States'),
  isDefault: z.boolean().optional(),
});

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password, fullName, phone } = req.body;

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({
        error: 'Email already registered',
        message: 'An account with this email address already exists.',
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Explicitly enforce role as 'customer' to prevent privilege escalation
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, phone, role)
       VALUES ($1, $2, $3, $4, 'customer')
       RETURNING id, email, full_name, phone, role, created_at`,
      [email.toLowerCase().trim(), passwordHash, fullName.trim(), phone?.trim() || null]
    );

    const newUser = result.rows[0];
    const token = generateToken({
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
      fullName: newUser.full_name,
    });

    await logAudit({
      userId: newUser.id,
      action: 'USER_REGISTERED',
      entityType: 'user',
      entityId: newUser.id.toString(),
      ipAddress: req.ip,
    });

    res.status(201).json({
      message: 'Account registered successfully',
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        fullName: newUser.full_name,
        phone: newUser.phone,
        role: newUser.role,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;

    const result = await pool.query(
      `SELECT id, email, password_hash, full_name, phone, role 
       FROM users 
       WHERE email = $1`,
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Incorrect email or password.',
      });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Incorrect email or password.',
      });
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.full_name,
    });

    await logAudit({
      userId: user.id,
      action: 'USER_LOGGED_IN',
      entityType: 'user',
      entityId: user.id.toString(),
      ipAddress: req.ip,
    });

    res.json({
      message: 'Logged in successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const userRes = await pool.query(
      `SELECT id, email, full_name, phone, role, created_at FROM users WHERE id = $1`,
      [userId]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const addressesRes = await pool.query(
      `SELECT * FROM addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC`,
      [userId]
    );

    res.json({
      user: userRes.rows[0],
      addresses: addressesRes.rows,
    });
  } catch (error) {
    next(error);
  }
}

export async function addAddress(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const { fullName, phone, streetAddress, apartment, city, state, postalCode, country, isDefault } = req.body;

    if (isDefault) {
      await pool.query('UPDATE addresses SET is_default = false WHERE user_id = $1', [userId]);
    }

    const resAddress = await pool.query(
      `INSERT INTO addresses (user_id, full_name, phone, street_address, apartment, city, state, postal_code, country, is_default)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [userId, fullName, phone, streetAddress, apartment || null, city, state, postalCode, country || 'United States', !!isDefault]
    );

    res.status(201).json({
      message: 'Address added successfully',
      address: resAddress.rows[0],
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteAddress(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const addressId = parseInt(req.params.id);

    // Enforce authorization: only delete user's own address
    const result = await pool.query(
      `DELETE FROM addresses WHERE id = $1 AND user_id = $2 RETURNING id`,
      [addressId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Address not found or unauthorized' });
    }

    res.json({ message: 'Address deleted successfully' });
  } catch (error) {
    next(error);
  }
}
