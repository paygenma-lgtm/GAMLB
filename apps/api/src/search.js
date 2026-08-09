/**
 * GET /api/search
 *
 * Query params:
 *   q           – free-text (name, place, keyword)
 *   type        – all | vitals | census | trees | news | immigration | military
 *   firstName   – given name filter
 *   lastName    – surname filter
 *   birthYear   – exact birth year
 *   birthPlace  – birth place text
 *   deathYear   – exact death year
 *   deathPlace  – death place text
 *   immYear     – immigration year
 *   immPlace    – immigration place
 *   gender      – male | female | any
 *   yearFrom    – period start
 *   yearTo      – period end
 *   exact       – "true" → exact name match (no fuzzy)
 *   page        – page number (default 1)
 *   limit       – results per page (default 20, max 100)
 *   sort        – relevance | year_asc | year_desc | name_asc
 *
 * Response:
 *   { total, page, limit, pages, results: [...] }
 */

import { Router } from 'express';
import { z } from 'zod';
import { getDb } from './db.js';

const router = Router();

// ── Validation schema ─────────────────────────────────────────────────────────
const searchSchema = z.object({
  q:          z.string().max(200).optional(),
  type:       z.enum(['all','vitals','census','trees','news','immigration','military']).optional().default('all'),
  firstName:  z.string().max(100).optional(),
  lastName:   z.string().max(100).optional(),
  birthYear:  z.coerce.number().int().min(1400).max(2100).optional(),
  birthPlace: z.string().max(200).optional(),
  deathYear:  z.coerce.number().int().min(1400).max(2100).optional(),
  deathPlace: z.string().max(200).optional(),
  immYear:    z.coerce.number().int().min(1400).max(2100).optional(),
  immPlace:   z.string().max(200).optional(),
  gender:     z.enum(['male','female','any']).optional().default('any'),
  yearFrom:   z.coerce.number().int().min(1400).max(2100).optional(),
  yearTo:     z.coerce.number().int().min(1400).max(2100).optional(),
  exact:      z.enum(['true','false']).optional().default('false'),
  page:       z.coerce.number().int().min(1).max(1000).optional().default(1),
  limit:      z.coerce.number().int().min(1).max(100).optional().default(20),
  sort:       z.enum(['relevance','year_asc','year_desc','name_asc']).optional().default('relevance'),
});

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Build a tsquery from a free-text string.
 * Splits by whitespace, escapes special chars, joins with <-> (phrase) or & (all words).
 */
function toTsQuery(text) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return null;
  return words
    .map(w => w.replace(/[^a-zA-ZÀ-ÿа-яА-ЯёЁ0-9-]/g, '') + ':*')
    .filter(Boolean)
    .join(' & ');
}

/**
 * Escape a value for a LIKE/ILIKE pattern.
 */
function escapeLike(str) {
  return str.replace(/[%_\\]/g, c => `\\${c}`);
}

// ── Route handler ─────────────────────────────────────────────────────────────
router.get('/search', async (req, res, next) => {
  try {
    const params = searchSchema.parse(req.query);
    const db     = getDb();
    const args   = [];   // positional query parameters
    const where  = [];   // WHERE clauses

    // ── Visibility: public trees only (unauthenticated / other users)
    // If the user is logged in they also see their own private trees.
    const isAuthed = !!req.user;
    if (isAuthed) {
      args.push(req.user.id);
      where.push(`(si.visibility = 'public' OR si.owner_id = $${args.length})`);
    } else {
      where.push(`si.visibility = 'public'`);
    }

    // ── Full-text search ──────────────────────────────────────────────────────
    let rankExpr = '1';
    if (params.q) {
      const tsq = toTsQuery(params.q);
      if (tsq) {
        args.push(tsq);
        const n = args.length;
        where.push(`si.search_vector @@ to_tsquery('simple', $${n})`);
        rankExpr = `ts_rank_cd(si.search_vector, to_tsquery('simple', $${n}))`;
      }
    }

    // ── Exact / partial name filters ─────────────────────────────────────────
    if (params.firstName) {
      args.push(params.exact === 'true'
        ? params.firstName.trim()
        : `%${escapeLike(params.firstName.trim())}%`
      );
      where.push(params.exact === 'true'
        ? `lower(si.given_name) = lower($${args.length})`
        : `si.given_name ilike $${args.length}`
      );
    }

    if (params.lastName) {
      args.push(params.exact === 'true'
        ? params.lastName.trim()
        : `%${escapeLike(params.lastName.trim())}%`
      );
      where.push(params.exact === 'true'
        ? `lower(si.surname) = lower($${args.length})`
        : `(si.surname ilike $${args.length} OR si.maiden_name ilike $${args.length})`
      );
    }

    // ── Year / place filters ──────────────────────────────────────────────────
    if (params.birthYear) {
      args.push(params.birthYear);
      where.push(`extract(year from si.birth_year)::int = $${args.length}`);
    }
    if (params.birthPlace) {
      args.push(`%${escapeLike(params.birthPlace.trim())}%`);
      where.push(`si.birth_place ilike $${args.length}`);
    }
    if (params.deathYear) {
      args.push(params.deathYear);
      where.push(`extract(year from si.death_year)::int = $${args.length}`);
    }
    if (params.deathPlace) {
      args.push(`%${escapeLike(params.deathPlace.trim())}%`);
      where.push(`si.death_place ilike $${args.length}`);
    }
    if (params.immYear) {
      args.push(params.immYear);
      where.push(`extract(year from si.imm_date::date)::int = $${args.length}`);
    }
    if (params.immPlace) {
      args.push(`%${escapeLike(params.immPlace.trim())}%`);
      where.push(`si.imm_place ilike $${args.length}`);
    }

    // ── Period range ──────────────────────────────────────────────────────────
    if (params.yearFrom) {
      args.push(`${params.yearFrom}-01-01`);
      where.push(`(si.birth_year >= $${args.length} OR si.death_year >= $${args.length})`);
    }
    if (params.yearTo) {
      args.push(`${params.yearTo}-12-31`);
      where.push(`(si.birth_year <= $${args.length} OR si.death_year <= $${args.length})`);
    }

    // ── Record type filter ────────────────────────────────────────────────────
    // For the MVP the "type" maps to which fields are populated.
    // In production this would join a separate record_type column.
    if (params.type !== 'all') {
      switch (params.type) {
        case 'vitals':
          where.push(`(si.birth_date is not null OR si.death_date is not null)`);
          break;
        case 'immigration':
          where.push(`si.imm_date is not null`);
          break;
        case 'census':
          // census records: persons from events of type 'census'
          where.push(`exists(
            select 1 from events ev
            where ev.person_id = si.person_id and ev.event_type = 'census'
          )`);
          break;
      }
    }

    // ── Sorting ───────────────────────────────────────────────────────────────
    const ORDER = {
      relevance:  `${rankExpr} desc, si.surname asc`,
      year_asc:   `si.birth_year asc nulls last`,
      year_desc:  `si.birth_year desc nulls last`,
      name_asc:   `si.surname asc, si.given_name asc`,
    };
    const orderSql = ORDER[params.sort] ?? ORDER.relevance;

    // ── Pagination ────────────────────────────────────────────────────────────
    const offset = (params.page - 1) * params.limit;
    args.push(params.limit);
    const limitArg = args.length;
    args.push(offset);
    const offsetArg = args.length;

    const whereClause = where.length ? `where ${where.join(' and ')}` : '';

    // ── Count query ───────────────────────────────────────────────────────────
    const countSql = `
      select count(*)::int as total
      from search_index si
      ${whereClause}
    `;

    // ── Results query ─────────────────────────────────────────────────────────
    const resultSql = `
      select
        si.person_id        as id,
        si.tree_id,
        si.given_name,
        si.surname,
        si.maiden_name,
        si.birth_date,
        to_char(si.birth_year, 'YYYY') as birth_year,
        si.birth_place,
        si.death_date,
        to_char(si.death_year, 'YYYY') as death_year,
        si.death_place,
        si.imm_date,
        si.imm_place,
        ${rankExpr}         as rank
      from search_index si
      ${whereClause}
      order by ${orderSql}
      limit $${limitArg}
      offset $${offsetArg}
    `;

    const [countResult, rowsResult] = await Promise.all([
      db.query(countSql,   args.slice(0, args.length - 2)),
      db.query(resultSql,  args),
    ]);

    const total = countResult.rows[0]?.total ?? 0;

    return res.json({
      total,
      page:    params.page,
      limit:   params.limit,
      pages:   Math.ceil(total / params.limit),
      results: rowsResult.rows,
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'INVALID_PARAMS', details: error.flatten() });
    }
    next(error);
  }
});

// ── Refresh search index (admin only, or called after mutations) ──────────────
router.post('/search/refresh', async (req, res, next) => {
  try {
    await getDb().query('select refresh_search_index()');
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

export default router;
