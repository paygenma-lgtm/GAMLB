import pg from 'pg';
import fs from 'node:fs/promises';
const { Pool } = pg;
let pool;

export function getDb() {
  if (!pool) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL must be set for genealogy API');
    pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined });
  }
  return pool;
}

export async function migrate() {
  // Run migrations in order; each file is idempotent (uses IF NOT EXISTS / ON CONFLICT DO NOTHING)
  const migrations = [
    '../data/schema.sql',
    '../data/migrations/002_search.sql',
  ];
  for (const file of migrations) {
    const sql = await fs.readFile(new URL(file, import.meta.url), 'utf8');
    await getDb().query(sql);
  }
}

export async function withTransaction(callback) {
  const client = await getDb().connect();
  try { await client.query('begin'); const result = await callback(client); await client.query('commit'); return result; }
  catch (error) { await client.query('rollback'); throw error; }
  finally { client.release(); }
}
