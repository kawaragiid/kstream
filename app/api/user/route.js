import { NextResponse } from 'next/server';
import { ensureNeonSchema, getSql, isNeonConfigured } from '@/lib/neonDb';
import { getAdminAuth } from '@/lib/firebaseAdmin';
import { checkRateLimit } from '@/lib/rateLimit';

const MAX_BODY_BYTES = 100 * 1024;
const MAX_ARRAY_ITEMS = 100;
const MAX_DISPLAY_NAME_LEN = 80;
const MAX_TAGLINE_LEN = 200;
const MAX_PHOTO_URL_LEN = 2048;
const MAX_LANGUAGE_LEN = 32;

const ALLOWED_CLIENT_PATCH_KEYS = new Set([
  'displayName',
  'photoURL',
  'photoUrl',
  'tagline',
  'favorites',
  'history',
  'preferences',
  'preferredLanguage',
]);

function sanitizeClientPatch(rawPatch) {
  const patch = {};
  for (const key of Object.keys(rawPatch)) {
    if (!ALLOWED_CLIENT_PATCH_KEYS.has(key)) continue;
    const value = rawPatch[key];

    if (key === 'favorites' || key === 'history') {
      if (value !== undefined) {
        if (!Array.isArray(value)) {
          return { error: `${key} must be an array` };
        }
        patch[key] = value.slice(0, MAX_ARRAY_ITEMS);
      }
      continue;
    }

    if (key === 'displayName') {
      if (value === null) {
        patch.displayName = null;
      } else if (typeof value === 'string') {
        patch.displayName = value.trim().slice(0, MAX_DISPLAY_NAME_LEN);
      } else {
        return { error: 'displayName must be a string or null' };
      }
      continue;
    }

    if (key === 'tagline') {
      if (value === null) {
        patch.tagline = '';
      } else if (typeof value === 'string') {
        patch.tagline = value.trim().slice(0, MAX_TAGLINE_LEN);
      } else {
        return { error: 'tagline must be a string or null' };
      }
      continue;
    }

    if (key === 'photoURL' || key === 'photoUrl') {
      if (patch.photoURL !== undefined) continue;
      if (value === null) {
        patch.photoURL = null;
      } else if (typeof value === 'string') {
        patch.photoURL = value.trim().slice(0, MAX_PHOTO_URL_LEN);
      } else {
        return { error: 'photoURL must be a string or null' };
      }
      continue;
    }

    if (key === 'preferredLanguage') {
      if (value === null) {
        patch.preferredLanguage = null;
      } else if (typeof value === 'string') {
        patch.preferredLanguage = value.trim().slice(0, MAX_LANGUAGE_LEN);
      } else {
        return { error: 'preferredLanguage must be a string or null' };
      }
      continue;
    }

    if (key === 'preferences') {
      if (value === null) {
        patch.preferences = null;
      } else if (typeof value === 'object' && !Array.isArray(value)) {
        patch.preferences = value;
      } else {
        return { error: 'preferences must be an object or null' };
      }
    }
  }
  return { patch };
}

async function verifyRequestUid(request, targetUid) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) {
    return { ok: false, status: 401, error: 'Unauthorized: missing token' };
  }
  try {
    const adminAuth = getAdminAuth();
    const decoded = await adminAuth.verifyIdToken(token);
    if (!decoded?.uid || decoded.uid !== targetUid) {
      return { ok: false, status: 403, error: 'Forbidden: uid mismatch' };
    }
    return { ok: true, decoded };
  } catch (err) {
    if (String(err?.message || '').includes('Firebase admin belum dikonfigurasi')) {
      return { ok: false, status: 503, error: 'Layanan autentikasi server belum siap.' };
    }
    return { ok: false, status: 401, error: 'Unauthorized: invalid token' };
  }
}

export async function GET(request) {
  const rl = await checkRateLimit(request, { namespace: 'api-user', limit: 60, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Terlalu banyak permintaan. Coba lagi sebentar.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
    );
  }
  const { searchParams } = new URL(request.url);
  const uid = String(searchParams.get('uid') || '').trim();
  if (!uid) {
    return NextResponse.json({ error: 'uid required' }, { status: 400 });
  }
  const authCheck = await verifyRequestUid(request, uid);
  if (!authCheck.ok) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }
  if (!isNeonConfigured()) {
    return NextResponse.json({ data: {} });
  }
  try {
    await ensureNeonSchema();
    const sql = getSql();
    const rows = await sql`
      SELECT uid, email, display_name, role, plan, is_active, expires_at, data
      FROM users
      WHERE uid = ${uid}
      LIMIT 1
    `;
    if (!rows.length) {
      return NextResponse.json({ data: {} });
    }
    const row = rows[0];
    const data = {
      ...(row.data || {}),
      email: row.email || row.data?.email || '',
      displayName: row.display_name || row.data?.displayName || '',
      role: row.role || row.data?.role || 'pelanggan',
      plan: row.plan || row.data?.plan || 'free',
      isActive: row.is_active !== false,
      expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : row.data?.expiresAt || null,
    };
    return NextResponse.json({ data });
  } catch (error) {
    console.warn('[api/user] GET error:', error?.message || error);
    return NextResponse.json({ data: {} });
  }
}

export async function POST(request) {
  try {
    const rl = await checkRateLimit(request, { namespace: 'api-user', limit: 60, windowMs: 60_000 });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Terlalu banyak permintaan. Coba lagi sebentar.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
      );
    }

    const contentLength = Number(request.headers?.get?.('content-length') || 0);
    if (contentLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
    }

    let rawBody = '';
    if (typeof request.text === 'function') {
      rawBody = await request.text();
      if (Buffer.byteLength(rawBody, 'utf8') > MAX_BODY_BYTES) {
        return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
      }
    }

    let body;
    try {
      body = typeof request.text === 'function'
        ? (rawBody ? JSON.parse(rawBody) : {})
        : await request.json();
      if (typeof request.text !== 'function' && Buffer.byteLength(JSON.stringify(body || {}), 'utf8') > MAX_BODY_BYTES) {
        return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
      }
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid payload object' }, { status: 400 });
    }

    const uid = String(body?.uid || '').trim();
    if (!uid || uid.length > 128) {
      return NextResponse.json({ error: uid ? 'Invalid uid' : 'uid required' }, { status: 400 });
    }

    const authCheck = await verifyRequestUid(request, uid);
    if (!authCheck.ok) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    if (body.patch !== undefined && (!body.patch || typeof body.patch !== 'object' || Array.isArray(body.patch))) {
      return NextResponse.json({ error: 'Invalid patch object' }, { status: 400 });
    }
    const rawPatch = body?.patch && typeof body.patch === 'object' ? body.patch : {};
    const { patch, error: patchError } = sanitizeClientPatch(rawPatch);
    if (patchError) {
      return NextResponse.json({ error: patchError }, { status: 400 });
    }

    if (!isNeonConfigured()) {
      return NextResponse.json({ ok: true });
    }
    await ensureNeonSchema();
    const sql = getSql();
    const existing = await sql`SELECT email, display_name, role, plan, is_active, expires_at FROM users WHERE uid = ${uid} LIMIT 1`;
    const prev = existing[0] || {};
    const derivedEmail = prev.email || authCheck.decoded?.email || '';
    const patchWithTimestamp = { ...patch, updatedAt: new Date().toISOString() };
    const patchJson = JSON.stringify(patchWithTimestamp);
    const hasDisplayName = patch.displayName !== undefined;
    const nextDisplayName = hasDisplayName ? (patch.displayName ?? '') : (prev.display_name ?? '');
    const rows = await sql`
      INSERT INTO users (uid, email, display_name, role, plan, is_active, expires_at, data, updated_at)
      VALUES (
        ${uid},
        ${derivedEmail},
        ${nextDisplayName},
        ${prev.role || 'pelanggan'},
        ${prev.plan ?? 'free'},
        ${prev.is_active !== false},
        ${prev.expires_at ?? null},
        ${patchJson}::jsonb,
        NOW()
      )
      ON CONFLICT (uid) DO UPDATE SET
        email = COALESCE(NULLIF(users.email, ''), EXCLUDED.email),
        display_name = CASE WHEN ${hasDisplayName} THEN EXCLUDED.display_name ELSE users.display_name END,
        data = COALESCE(users.data, '{}'::jsonb) || ${patchJson}::jsonb,
        updated_at = NOW()
      RETURNING data
    `;
    return NextResponse.json({ ok: true, data: rows[0]?.data || patchWithTimestamp });
  } catch (error) {
    console.warn('[api/user] POST error:', error?.message || error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}
