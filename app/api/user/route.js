import { NextResponse } from 'next/server';
import { ensureNeonSchema, getSql, isNeonConfigured } from '@/lib/neonDb';
import { getAdminAuth } from '@/lib/firebaseAdmin';

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
    const body = await request.json();
    const uid = String(body?.uid || '').trim();
    const rawPatch = body?.patch && typeof body.patch === 'object' ? body.patch : {};
    if (!uid) {
      return NextResponse.json({ error: 'uid required' }, { status: 400 });
    }
    const authCheck = await verifyRequestUid(request, uid);
    if (!authCheck.ok) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const patch = {};
    for (const key of Object.keys(rawPatch)) {
      if (!ALLOWED_CLIENT_PATCH_KEYS.has(key)) continue;
      if (key === 'photoUrl') {
        if (patch.photoURL === undefined) {
          patch.photoURL = rawPatch[key];
        }
      } else {
        patch[key] = rawPatch[key];
      }
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
    const rows = await sql`
      INSERT INTO users (uid, email, display_name, role, plan, is_active, expires_at, data, updated_at)
      VALUES (
        ${uid},
        ${derivedEmail},
        ${patch.displayName ?? prev.display_name ?? ''},
        ${prev.role ?? 'pelanggan'},
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
