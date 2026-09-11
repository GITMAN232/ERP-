import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_mini_erp_crm_jwt_key_2026';

// Simple in-memory rate limiting to protect against brute-force login attempts
const loginAttempts = new Map<string, { count: number; resetTime: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();

  const attemptData = loginAttempts.get(clientIp);
  if (attemptData && now < attemptData.resetTime) {
    if (attemptData.count >= MAX_ATTEMPTS) {
      res.status(429).json({ message: 'Too many failed login attempts. Please try again later.' });
      return;
    }
  } else if (attemptData && now >= attemptData.resetTime) {
    loginAttempts.delete(clientIp);
  }

  if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
    res.status(400).json({ message: 'Email and password are required' });
    return;
  }

  const userRes = await pool.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email.trim()]);

  if (userRes.rows.length === 0) {
    recordFailedAttempt(clientIp, now);
    res.status(401).json({ message: 'Invalid credentials' });
    return;
  }

  const user = userRes.rows[0];
  const isValidPassword = await bcrypt.compare(password, user.password_hash);

  if (!isValidPassword) {
    recordFailedAttempt(clientIp, now);
    res.status(401).json({ message: 'Invalid credentials' });
    return;
  }

  // Clear attempts upon successful authentication
  loginAttempts.delete(clientIp);

  const payload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

  res.status(200).json({
    token,
    user: payload
  });
}

function recordFailedAttempt(ip: string, now: number): void {
  const existing = loginAttempts.get(ip);
  if (existing) {
    existing.count += 1;
  } else {
    loginAttempts.set(ip, { count: 1, resetTime: now + WINDOW_MS });
  }
}
