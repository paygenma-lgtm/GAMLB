import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import {
  hashPassword,
  verifyPassword,
  issueSession,
  verifySession,
  verifyGoogleCredential,
  exchangeGoogleCode
} from './auth.js';
import {
  findUserByEmail,
  findUserByGoogleId,
  findUserById,
  createUser,
  updateUser,
  publicUser,
  getUserPlan,
  assignPlanToUser,
  getPlanByName
} from './store.js';
import genealogyRouter from './genealogy.js';
import plansRouter from './plans.js';
import adminRouter, { requireAdmin } from './admin.js';
import searchRouter from './search.js';
import { migrate } from './db.js';

const app = express();
app.set('trust proxy', 1);
const port = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';
const cookieName = process.env.COOKIE_NAME || 'gamlb_session';
const allowedOrigin = process.env.FRONTEND_ORIGIN || `http://localhost:${port}`;

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be set and contain at least 32 characters');
}
if (!process.env.GOOGLE_CLIENT_ID) {
  throw new Error('GOOGLE_CLIENT_ID must be set');
}
if (isProduction && !String(process.env.ADMIN_EMAIL || '').trim()) {
  console.warn('ADMIN_EMAIL is not configured; admin access requires a user with role=admin');
}

app.use(helmet());
app.use(cors({ origin: allowedOrigin, credentials: true }));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 60 }));

const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(128),
  planId: z.string().uuid().optional(),
  planName: z.string().optional()
});

const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128)
});
const googleSchema = z.object({ credential: z.string().min(20) });
const googleCodeSchema = z.object({ code: z.string().min(20) });

function setSession(res, user) {
  res.cookie(cookieName, issueSession(user), {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/'
  });
}

function clearSession(res) {
  res.clearCookie(cookieName, { httpOnly: true, secure: isProduction, sameSite: 'lax', path: '/' });
}

async function requireUser(req, res, next) {
  try {
    const token = req.cookies[cookieName];
    if (!token) return res.status(401).json({ error: 'UNAUTHENTICATED' });
    const claims = verifySession(token);
    const user = await findUserById(claims.sub);
    if (!user) return res.status(401).json({ error: 'SESSION_USER_NOT_FOUND' });
    if ((user.status || 'active') === 'blocked') return res.status(403).json({ error: 'ACCOUNT_BLOCKED' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'INVALID_SESSION' });
  }
}

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.post('/api/auth/register', async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    const email = data.email.toLowerCase();
    if (await findUserByEmail(email)) {
      return res.status(409).json({ error: 'EMAIL_ALREADY_EXISTS' });
    }
    const user = await createUser({
      name: data.name,
      email,
      passwordHash: await hashPassword(data.password),
      provider: 'password',
      avatar: null
    });

    let assignedPlan = null;
    let planId = data.planId;

    if (!planId && data.planName) {
      const plan = await getPlanByName(data.planName);
      if (plan) planId = plan.id;
    }

    if (!planId) {
      const freePlan = await getPlanByName('Тариф 1');
      if (freePlan) planId = freePlan.id;
    }

    if (planId) {
      try {
        assignedPlan = await assignPlanToUser(user.id, planId);
      } catch (planError) {
        console.error('Failed to assign plan:', planError.message);
      }
    }

    setSession(res, user);
    return res.status(201).json({
      user: publicUser(user),
      plan: assignedPlan || null
    });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'INVALID_INPUT', details: error.flatten() });
    next(error);
  }
});

app.post('/api/auth/login', async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);
    const user = await findUserByEmail(data.email.toLowerCase());
    if (!user?.passwordHash || !(await verifyPassword(data.password, user.passwordHash))) {
      return res.status(401).json({ error: 'INVALID_CREDENTIALS' });
    }

    const userPlan = await getUserPlan(user.id);

    setSession(res, user);
    return res.json({
      user: publicUser(user),
      plan: userPlan || null
    });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'INVALID_INPUT' });
    next(error);
  }
});

app.post('/api/auth/google', async (req, res, next) => {
  try {
    const data = googleSchema.parse(req.body);
    const googleUser = await verifyGoogleCredential(data.credential);
    let user = await findUserByGoogleId(googleUser.providerId);
    if (!user) user = await findUserByEmail(googleUser.email);
    if (user) {
      user = await updateUser(user.id, googleUser);
    } else {
      user = await createUser(googleUser);
      try {
        const freePlan = await getPlanByName('Тариф 1');
        if (freePlan) await assignPlanToUser(user.id, freePlan.id);
      } catch (planError) {
        console.error('Failed to assign plan to Google user:', planError.message);
      }
    }

    const userPlan = await getUserPlan(user.id);

    setSession(res, user);
    return res.json({
      user: publicUser(user),
      plan: userPlan || null
    });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'INVALID_INPUT' });
    if (/Google|Token|Wrong number|Invalid/i.test(error.message)) return res.status(401).json({ error: 'INVALID_GOOGLE_TOKEN' });
    next(error);
  }
});

app.post('/api/auth/google/code', async (req, res, next) => {
  try {
    const data = googleCodeSchema.parse(req.body);
    const googleUser = await exchangeGoogleCode(data.code);
    let user = await findUserByGoogleId(googleUser.providerId);
    if (!user) user = await findUserByEmail(googleUser.email);
    if (user) {
      user = await updateUser(user.id, googleUser);
    } else {
      user = await createUser(googleUser);
      try {
        const freePlan = await getPlanByName('Тариф 1');
        if (freePlan) await assignPlanToUser(user.id, freePlan.id);
      } catch (planError) {
        console.error('Failed to assign plan to Google user:', planError.message);
      }
    }

    const userPlan = await getUserPlan(user.id);

    setSession(res, user);
    return res.json({
      user: publicUser(user),
      plan: userPlan || null
    });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'INVALID_INPUT' });
    if (/Google|Token|Wrong number|Invalid/i.test(error.message)) return res.status(401).json({ error: 'INVALID_GOOGLE_CODE' });
    next(error);
  }
});

app.get('/api/auth/me', requireUser, async (req, res, next) => {
  try {
    const userPlan = await getUserPlan(req.user.id);
    res.json({
      user: publicUser(req.user),
      plan: userPlan || null
    });
  } catch (error) {
    next(error);
  }
});

app.use('/api', plansRouter);
app.use('/api', searchRouter);   // public + optional-auth search

app.use('/api/admin', requireUser, requireAdmin, adminRouter);

app.post('/api/auth/logout', (req, res) => {
  clearSession(res);
  res.status(204).end();
});

app.use('/api', requireUser, genealogyRouter);

app.use(express.static(new URL('../public', import.meta.url).pathname));
app.use((error, _req, res, _next) => {
  console.error(error);
  const status = Number.isInteger(error.status) && error.status >= 400 && error.status < 600 ? error.status : 500;
  res.status(status).json({ error: status === 500 ? 'INTERNAL_SERVER_ERROR' : error.message || 'REQUEST_FAILED' });
});

const start = async () => {
  if (process.env.RUN_MIGRATIONS === 'true') await migrate();
  app.listen(port, () => console.log(`GAMLB API listening on http://localhost:${port}`));
};
start().catch(error => { console.error(error); process.exit(1); });
