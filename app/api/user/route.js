import { NextResponse } from 'next/server';
import { ensureNeonSchema, getSql, isNeonConfigured } from '@/lib/neonDb';
import { getAdminAuth } from '@/lib/firebaseAdmin';

const ALLOWED_CLIENT_PATCH_KEYS = new Set([
  'displayName',
  'photoURL',
  'favorites',
  'history',
  'preferences',
  'preferredLanguage',
  'email',
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
      return { ok: true, decoded: null };
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
      if (ALLOWED_CLIENT_PATCH_KEYS.has(key)) {
        patch[key] = rawPatch[key];
      }
    }

    if (!isNeonConfigured()) {
      return NextResponse.json({ ok: true });
    }
    await ensureNeonSchema();
    const sql = getSql();
    const existing = await sql`SELECT data, email, display_name, role, plan, is_active, expires_at FROM users WHERE uid = ${uid} LIMIT 1`;
    const prev = existing[0] || {};
    const mergedData = { ...(prev.data || {}), ...patch, updatedAt: new Date().toISOString() };
    await sql`
      INSERT INTO users (uid, email, display_name, role, plan, is_active, expires_at, data, updated_at)
      VALUES (
        ${uid},
        ${patch.email ?? prev.email ?? authCheck.decoded?.email ?? ''},
        ${patch.displayName ?? prev.display_name ?? ''},
        ${prev.role ?? 'pelanggan'},
        ${prev.plan ?? 'free'},
        ${prev.is_active !== false},
        ${prev.expires_at ?? null},
        ${JSON.stringify(mergedData)}::jsonb,
        NOW()
      )
      ON CONFLICT (uid) DO UPDATE SET
        email = EXCLUDED.email,
        display_name = EXCLUDED.display_name,
        data = EXCLUDED.data,
        updated_at = NOW()
    `;
    return NextResponse.json({ ok: true, data: mergedData });
  } catch (error) {
    console.warn('[api/user] POST error:', error?.message || error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}
