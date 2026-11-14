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

const ALLOWED_PREFERENCE_KEYS = new Set([
  'autoplay',
  'dataSaver',
  'subtitleLang',
  'audioLang',
  'quality',
  'theme',
  'notifications',
  'matureContent',
]);

function stripNullBytes(value) {
  if (typeof value === 'string') {
    return value.replace(/\u0000/g, '');
  }
  if (Array.isArray(value)) {
    return value.map(stripNullBytes);
  }
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
      out[k.replace(/\u0000/g, '')] = stripNullBytes(v);
    }
    return out;
  }
  return value;
}

function isSafeHttpUrl(rawUrl, { allowRelative = false } = {}) {
  if (typeof rawUrl !== 'string') return false;
  const trimmed = rawUrl.trim();
  if (!trimmed) return true;
  if (allowRelative && trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return true;
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function sanitizeMediaListItem(item) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    return null;
  }
  const id = typeof item.id === 'string' ? item.id.trim().slice(0, 128) : '';
  if (!id) return null;

  const posterUrl =
    typeof item.posterUrl === 'string' && isSafeHttpUrl(item.posterUrl, { allowRelative: true })
      ? item.posterUrl.trim().slice(0, MAX_PHOTO_URL_LEN)
      : '';
  const href =
    typeof item.href === 'string' && isSafeHttpUrl(item.href, { allowRelative: true })
      ? item.href.trim().slice(0, 512)
      : '';
  const watchHref =
    typeof item.watchHref === 'string' && isSafeHttpUrl(item.watchHref, { allowRelative: true })
      ? item.watchHref.trim().slice(0, 512)
      : '';

  const sanitized = {
    id,
    title: typeof item.title === 'string' ? item.title.trim().slice(0, 200) : 'Untitled',
    type: item.type === 'series' ? 'series' : 'movie',
    slug: typeof item.slug === 'string' ? item.slug.trim().slice(0, 200) : id,
    posterUrl,
    overview: typeof item.overview === 'string' ? item.overview.slice(0, 300) : '',
    href,
    watchHref,
    addedAt: Number.isFinite(Number(item.addedAt)) ? Number(item.addedAt) : Date.now(),
    duration: Number.isFinite(Number(item.duration)) ? Math.max(0, Number(item.duration)) : 0,
    orientation: item.orientation === 'portrait' ? 'portrait' : 'landscape',
    category: typeof item.category === 'string' ? item.category.trim().slice(0, 80) : '',
  };

  if (item.updatedAt !== undefined) {
    sanitized.updatedAt = Number.isFinite(Number(item.updatedAt)) ? Number(item.updatedAt) : Date.now();
  }
  if (item.progress !== undefined) {
    const p = Number(item.progress);
    sanitized.progress = Number.isFinite(p) ? Math.max(0, Math.min(100, p)) : 0;
  }
  if (item.position !== undefined) {
    const pos = Number(item.position);
    sanitized.position = Number.isFinite(pos) ? Math.max(0, pos) : 0;
  }
  if (typeof item.seriesId === 'string' && item.seriesId.trim()) {
    sanitized.seriesId = item.seriesId.trim().slice(0, 128);
  }
  return sanitized;
}

function sanitizeClientPatch(rawPatch) {
  const cleanRaw = stripNullBytes(rawPatch);
  const patch = {};
  for (const key of Object.keys(cleanRaw)) {
    if (!ALLOWED_CLIENT_PATCH_KEYS.has(key)) continue;
    const value = cleanRaw[key];

    if (key === 'favorites' || key === 'history') {
      if (value !== undefined) {
        if (!Array.isArray(value)) {
          return { error: `${key} must be an array` };
        }
        const sanitizedList = [];
        for (const entry of value.slice(0, MAX_ARRAY_ITEMS)) {
          const cleanItem = sanitizeMediaListItem(entry);
          if (!cleanItem) {
            return { error: `${key} contains invalid item` };
          }
          sanitizedList.push(cleanItem);
        }
        patch[key] = sanitizedList;
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
      if (value === null || value === '') {
        patch.photoURL = value === null ? null : '';
      } else if (typeof value === 'string') {
        const trimmed = value.trim().slice(0, MAX_PHOTO_URL_LEN);
        if (!isSafeHttpUrl(trimmed, { allowRelative: false })) {
          return { error: 'photoURL must be a valid http(s) URL' };
        }
        patch.photoURL = trimmed;
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
        const cleanPrefs = {};
        for (const [prefKey, prefVal] of Object.entries(value)) {
          if (!ALLOWED_PREFERENCE_KEYS.has(prefKey)) continue;
          if (
            prefVal === null ||
            typeof prefVal === 'boolean' ||
            typeof prefVal === 'number' ||
            typeof prefVal === 'string'
          ) {
            cleanPrefs[prefKey] =
              typeof prefVal === 'string' ? prefVal.trim().slice(0, 64) : prefVal;
          } else {
            return { error: `preferences.${prefKey} must be a primitive value` };
          }
        }
        patch.preferences = cleanPrefs;
      } else {
        return { error: 'preferences must be an object or null' };
      }
    }
  }
  return { patch };
}

async function readBoundedJsonBody(request, maxBytes) {
  if (request.body && typeof request.body.getReader === 'function') {
    const reader = request.body.getReader();
    const chunks = [];
    let totalBytes = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          totalBytes += value.byteLength;
          if (totalBytes > maxBytes) {
            await reader.cancel().catch(() => {});
            return { tooLarge: true };
          }
          chunks.push(value);
        }
      }
    } finally {
      reader.releaseLock();
    }
    const rawBody = Buffer.concat(chunks.map((c) => Buffer.from(c))).toString('utf8');
    try {
      return { body: rawBody ? JSON.parse(rawBody) : {} };
    } catch {
      return { invalidJson: true };
    }
  }

  if (typeof request.text === 'function') {
    const rawBody = await request.text();
    if (Buffer.byteLength(rawBody, 'utf8') > maxBytes) {
      return { tooLarge: true };
    }
    try {
      return { body: rawBody ? JSON.parse(rawBody) : {} };
    } catch {
      return { invalidJson: true };
    }
  }

  try {
    const body = await request.json();
    if (Buffer.byteLength(JSON.stringify(body || {}), 'utf8') > maxBytes) {
      return { tooLarge: true };
    }
    return { body };
  } catch {
    return { invalidJson: true };
  }
}

async function verifyRequestUid(request, targetUid) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) {
    return { ok: false, status: 401, error: 'Unauthorized: missing token' };
  }
  try {
    const adminAuth = getAdminAuth();
    const decoded = await adminAuth.verifyIdToken(token, true);
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
    const expiresAtIso = row.expires_at
      ? new Date(row.expires_at).toISOString()
      : row.data?.expiresAt || null;
    const role = row.role || row.data?.role || 'pelanggan';
    const plan = row.plan || row.data?.plan || 'free';
    const isStaff = ['super-admin', 'admin', 'editor'].includes(String(role).toLowerCase());
    const expiresMs = expiresAtIso ? Date.parse(expiresAtIso) : NaN;
    const isExpired = Number.isFinite(expiresMs) && expiresMs <= Date.now();
    const isActive = row.is_active !== false && (isStaff || plan !== 'premium' || !isExpired);

    const data = {
      ...(row.data || {}),
      email: row.email || row.data?.email || '',
      displayName: row.display_name || row.data?.displayName || '',
      role,
      plan,
      isActive,
      expiresAt: expiresAtIso,
    };
    return NextResponse.json({ data });
  } catch (error) {
    console.warn('[api/user] GET error:', error?.message || error);
    return NextResponse.json({ error: 'Failed to load user profile' }, { status: 503 });
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

    const parsedBody = await readBoundedJsonBody(request, MAX_BODY_BYTES);
    if (parsedBody.tooLarge) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
    }
    if (parsedBody.invalidJson) {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }
    const body = parsedBody.body;

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid payload object' }, { status: 400 });
    }

    const uid = String(body?.uid || '').replace(/\u0000/g, '').trim();
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
    const derivedEmail = (authCheck.decoded?.email || '').replace(/\u0000/g, '');
    const patchWithTimestamp = { ...patch, updatedAt: new Date().toISOString() };
    const patchJson = JSON.stringify(patchWithTimestamp).replace(/\u0000/g, '');
    const hasDisplayName = patch.displayName !== undefined;
    const nextDisplayName = hasDisplayName ? (patch.displayName ?? '') : '';
    const rows = await sql`
      INSERT INTO users (uid, email, display_name, role, plan, is_active, expires_at, data, updated_at)
      VALUES (
        ${uid},
        ${derivedEmail},
        ${nextDisplayName},
        'pelanggan',
        'free',
        true,
        NULL,
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
