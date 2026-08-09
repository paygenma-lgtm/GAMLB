import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { getDb } from './db.js';

const file = path.resolve(process.env.DB_FILE || './data/users.json');

async function readUsers() {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, '[]');
    return [];
  }
}

async function writeUsers(users) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.tmp`;
  await fs.writeFile(temp, JSON.stringify(users, null, 2));
  await fs.rename(temp, file);
}

export async function findUserByEmail(email) {
  const users = await readUsers();
  return users.find(user => user.email === email.toLowerCase()) || null;
}

export async function findUserByGoogleId(providerId) {
  const users = await readUsers();
  return users.find(user => user.provider === 'google' && user.providerId === providerId) || null;
}

export async function findUserById(id) {
  const users = await readUsers();
  return users.find(user => user.id === id) || null;
}

export async function listUsers() {
  return readUsers();
}

export async function createUser(data) {
  const users = await readUsers();
  const user = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    role: 'user',
    status: 'active',
    ...data
  };
  users.push(user);
  await writeUsers(users);
  return user;
}

export async function updateUser(id, patch) {
  const users = await readUsers();
  const index = users.findIndex(user => user.id === id);
  if (index < 0) return null;
  users[index] = { ...users[index], ...patch, updatedAt: new Date().toISOString() };
  await writeUsers(users);
  return users[index];
}

export function publicUser(user) {
  if (!user) return null;
  const { passwordHash, providerId, ...safe } = user;
  return safe;
}

// ============ PLANS API ============

export async function getAllPlans() {
  const db = getDb();
  try {
    const { rows } = await db.query('select id, name, price, currency, max_people, max_trees, max_sources, features, is_active from plans where is_active = true order by price asc');
    return rows;
  } catch (error) {
    console.error('Error fetching plans:', error.message);
    return [];
  }
}

export async function getPlanById(planId) {
  const db = getDb();
  try {
    const { rows } = await db.query('select id, name, price, currency, max_people, max_trees, max_sources, features, is_active from plans where id = $1', [planId]);
    return rows[0] || null;
  } catch (error) {
    console.error('Error fetching plan:', error.message);
    return null;
  }
}

export async function getPlanByName(name) {
  const db = getDb();
  try {
    const { rows } = await db.query('select id, name, price, currency, max_people, max_trees, max_sources, features, is_active from plans where name = $1 and is_active = true', [name]);
    return rows[0] || null;
  } catch (error) {
    console.error('Error fetching plan by name:', error.message);
    return null;
  }
}

export async function getUserPlan(userId) {
  const db = getDb();
  try {
    const { rows } = await db.query(`
      select up.id, up.user_id as "userId", up.plan_id as "planId", up.status,
             up.started_at as "startedAt", up.expires_at as "expiresAt",
             p.name as plan_name, p.price, p.currency, p.features, p.max_people, p.max_trees, p.max_sources
      from user_plans up
      join plans p on p.id = up.plan_id
      where up.user_id = $1 and up.status = 'active'
      order by up.started_at desc
      limit 1
    `, [userId]);
    return rows[0] || null;
  } catch (error) {
    console.error('Error fetching user plan:', error.message);
    return null;
  }
}

export async function assignPlanToUser(userId, planId) {
  const db = getDb();
  try {
    const { rows } = await db.query(`
      insert into user_plans (user_id, plan_id, status, expires_at)
      values ($1, $2, 'active', null)
      on conflict (user_id, plan_id) do update
      set status = 'active', started_at = now()
      returning id, user_id as "userId", plan_id as "planId", status, started_at as "startedAt", expires_at as "expiresAt"
    `, [userId, planId]);
    return rows[0];
  } catch (error) {
    console.error('Error assigning plan:', error.message);
    throw error;
  }
}

export async function cancelUserPlan(userId, planId) {
  const db = getDb();
  try {
    const { rows } = await db.query(`
      update user_plans
      set status = 'cancelled'
      where user_id = $1 and plan_id = $2
      returning id, status
    `, [userId, planId]);
    return rows[0] || null;
  } catch (error) {
    console.error('Error cancelling plan:', error.message);
    throw error;
  }
}
