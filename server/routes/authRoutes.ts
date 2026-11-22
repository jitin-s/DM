import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db';
import { authRateLimiter, sanitizeString } from '../middleware/security';

export const authRouter = Router();
const AUTH_SECRET = process.env.AUTH_SECRET || 'devilmotion_super_secret_jwt_key_9988_2026';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Middleware to extract user from JWT
export const authenticateUser = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, AUTH_SECRET) as { userId: string; role: string };
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, name: true, email: true, role: true, avatar: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'User account not found' });
    }

    (req as any).user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired authentication token' });
  }
};

// Middleware for Admin role verification
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;
  if (!user || user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
  }
  next();
};

/**
 * Register User (Protected by authRateLimiter & input validation)
 */
authRouter.post('/register', authRateLimiter, async (req: Request, res: Response) => {
  try {
    const name = sanitizeString(req.body.name, 100);
    const email = sanitizeString(req.body.email, 255).toLowerCase();
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    if (!name || name.length < 2) {
      return res.status(400).json({ error: 'A valid name (at least 2 characters) is required' });
    }

    if (!email || !EMAIL_REGEX.test(email)) {
      return res.status(400).json({ error: 'A valid email address is required' });
    }

    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters in length' });
    }

    if (password.length > 128) {
      return res.status(400).json({ error: 'Password must not exceed 128 characters' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    // If first user, make ADMIN
    const userCount = await prisma.user.count();
    const role = userCount === 0 ? 'ADMIN' : 'USER';

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role,
      },
    });

    const token = jwt.sign({ userId: user.id, role: user.role }, AUTH_SECRET, {
      expiresIn: '7d',
    });

    return res.status(201).json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      token,
    });
  } catch (error: any) {
    console.error('[Auth API] Registration error:', error.message);
    return res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

/**
 * Login User (Protected by authRateLimiter against brute-forcing)
 */
authRouter.post('/login', authRateLimiter, async (req: Request, res: Response) => {
  try {
    const email = sanitizeString(req.body.email, 255).toLowerCase();
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ userId: user.id, role: user.role }, AUTH_SECRET, {
      expiresIn: '7d',
    });

    return res.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar },
      token,
    });
  } catch (error: any) {
    console.error('[Auth API] Login error:', error.message);
    return res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

/**
 * Get Current User Profile
 */
authRouter.get('/me', authenticateUser, async (req: Request, res: Response) => {
  const user = (req as any).user;
  return res.json({ user });
});
