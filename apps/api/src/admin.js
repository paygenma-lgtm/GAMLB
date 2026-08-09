import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { z } from 'zod';
import { getDb } from './db.js';
import { listUsers, publicUser, updateUser } from './store.js';

const router = express.Router();
const auditFile = path.resolve(process.env.ADMIN_AUDIT_FILE || './data/admin-audit.json');
const reportsFile = path.resolve(process.env.ADMIN_REPORTS_FILE || './data/moderation-reports.json');

async function readAudit() {
  try { return JSON.parse(await fs.readFile(auditFile, 'utf8')); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return [];
  }
}

async function writeAudit(entry) {
  const entries = await readAudit();
  entries.unshift({ id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...entry });
  await fs.mkdir(path.dirname(auditFile), { recursive: true });
  await fs.writeFile(auditFile, JSON.stringify(entries.slice(0, 500), null, 2));
}

function adminEmail() {
  return String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
}

export function requireAdmin(req, res, next) {
  const configuredEmail = adminEmail();
  const allowed = req.user?.role === 'admin' || (configuredEmail && req.user?.email === configuredEmail);
  if (!allowed) return res.status(403).json({ error: 'ADMIN_ACCESS_REQUIRED' });
  next();
}

async function counts() {
  const result = { users: 0, trees: 0, persons: 0, events: 0, database: 'unavailable' };
  try {
    const db = getDb();
    const query = await db.query(`
      select
        (select count(*)::int from users) as users,
        (select count(*)::int from trees) as trees,
        (select count(*)::int from persons) as persons,
        (select count(*)::int from events) as events
    `);
    Object.assign(result, query.rows[0], { database: 'connected' });
  } catch (error) {
    console.error('Admin counts query failed:', error.message);
  }
  return result;
}

router.get('/overview', async (_req, res, next) => {
  try {
    const users = await listUsers();
    res.json({
      stats: { ...(await counts()), fileUsers: users.length },
      recentUsers: users.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 8).map(publicUser),
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) { next(error); }
});

router.get('/users', async (req, res, next) => {
  try {
    const query = String(req.query.q || '').trim().toLowerCase();
    const status = String(req.query.status || '').trim();
    const users = (await listUsers()).filter(user => {
      const matchesQuery = !query || `${user.name} ${user.email}`.toLowerCase().includes(query);
      const matchesStatus = !status || (user.status || 'active') === status;
      return matchesQuery && matchesStatus;
    });
    res.json({ users: users.map(publicUser), total: users.length });
  } catch (error) { next(error); }
});

const userPatch = z.object({
  status: z.enum(['active', 'blocked']).optional(),
  role: z.enum(['user', 'moderator', 'support', 'content', 'admin']).optional()
}).refine(value => Object.keys(value).length > 0, 'At least one field is required');

router.patch('/users/:id', async (req, res, next) => {
  try {
    const patch = userPatch.parse(req.body);
    const current = (await listUsers()).find(user => user.id === req.params.id);
    if (!current) return res.status(404).json({ error: 'USER_NOT_FOUND' });
    if (current.id === req.user.id && (patch.status === 'blocked' || (patch.role && patch.role !== 'admin'))) {
      return res.status(400).json({ error: 'CANNOT_REMOVE_OWN_ADMIN_ACCESS' });
    }
    const updated = await updateUser(current.id, patch);
    await writeAudit({ actorId: req.user.id, action: 'USER_UPDATED', targetId: current.id, details: patch });
    res.json({ user: publicUser(updated) });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'INVALID_INPUT', details: error.flatten() });
    next(error);
  }
});

async function readReports() {
  try { return JSON.parse(await fs.readFile(reportsFile, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
}

async function writeReports(reports) {
  await fs.mkdir(path.dirname(reportsFile), { recursive: true });
  await fs.writeFile(reportsFile, JSON.stringify(reports, null, 2));
}

router.get('/trees', async (_req, res, next) => {
  try {
    const db = getDb();
    const { rows } = await db.query(`
      select t.id, t.owner_id as "ownerId", t.name, t.description, t.visibility,
             t.created_at as "createdAt", count(p.id)::int as "personsCount"
      from trees t left join persons p on p.tree_id = t.id
      group by t.id order by t.created_at desc
    `);
    const owners = new Map((await listUsers()).map(user => [user.id, publicUser(user)]));
    res.json({ trees: rows.map(tree => ({ ...tree, owner: owners.get(tree.ownerId) || null })) });
  } catch (error) { next(error); }
});

const treePatch = z.object({ visibility: z.enum(['private', 'tree_members', 'public']) });
router.patch('/trees/:id', async (req, res, next) => {
  try {
    const patch = treePatch.parse(req.body);
    const db = getDb();
    const { rows } = await db.query('update trees set visibility=$1 where id=$2 returning id, owner_id as "ownerId", name, description, visibility, created_at as "createdAt"', [patch.visibility, req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'TREE_NOT_FOUND' });
    await writeAudit({ actorId: req.user.id, action: 'TREE_VISIBILITY_UPDATED', targetId: req.params.id, details: patch });
    res.json({ tree: rows[0] });
  } catch (error) { if (error instanceof z.ZodError) return res.status(400).json({ error: 'INVALID_INPUT' }); next(error); }
});

const reportPatch = z.object({ status: z.enum(['new', 'reviewing', 'resolved', 'rejected']) });
router.get('/moderation/reports', async (_req, res, next) => {
  try { res.json({ reports: await readReports() }); } catch (error) { next(error); }
});
router.patch('/moderation/reports/:id', async (req, res, next) => {
  try {
    const patch = reportPatch.parse(req.body); const reports = await readReports();
    const index = reports.findIndex(report => report.id === req.params.id);
    if (index < 0) return res.status(404).json({ error: 'REPORT_NOT_FOUND' });
    reports[index] = { ...reports[index], status: patch.status, updatedAt: new Date().toISOString() };
    await writeReports(reports);
    await writeAudit({ actorId: req.user.id, action: 'MODERATION_REPORT_UPDATED', targetId: req.params.id, details: patch });
    res.json({ report: reports[index] });
  } catch (error) { if (error instanceof z.ZodError) return res.status(400).json({ error: 'INVALID_INPUT' }); next(error); }
});

router.get('/audit', async (_req, res, next) => {
  try { res.json({ entries: (await readAudit()).slice(0, 100) }); }
  catch (error) { next(error); }
});

router.get('/settings', (_req, res) => {
  res.json({ settings: {
    environment: process.env.NODE_ENV || 'development',
    database: process.env.DATABASE_URL ? 'configured' : 'missing',
    uploads: process.env.UPLOAD_DIR || './data/uploads',
    adminEmail: adminEmail() ? 'configured' : 'missing'
  }});
});

export default router;
