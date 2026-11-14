import { NextResponse } from 'next/server';
import { ensureNeonSchema, getSql, isNeonConfigured } from '@/lib/neonDb';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const uid = String(searchParams.get('uid') || '').trim();
  if (!uid) {
    return NextResponse.json({ error: 'uid required' }, { status: 400 });
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
      role: row.role || row.data?.role || 'user',
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
    const patch = body?.patch && typeof body.patch === 'object' ? body.patch : {};
    if (!uid) {
      return NextResponse.json({ error: 'uid required' }, { status: 400 });
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
        ${patch.email ?? prev.email ?? ''},
        ${patch.displayName ?? prev.display_name ?? ''},
        ${patch.role ?? prev.role ?? 'user'},
        ${patch.plan ?? prev.plan ?? 'free'},
        ${patch.isActive !== undefined ? Boolean(patch.isActive) : (prev.is_active !== false)},
        ${patch.expiresAt ?? prev.expires_at ?? null},
        ${JSON.stringify(mergedData)}::jsonb,
        NOW()
      )
      ON CONFLICT (uid) DO UPDATE SET
        email = EXCLUDED.email,
        display_name = EXCLUDED.display_name,
        role = EXCLUDED.role,
        plan = EXCLUDED.plan,
        is_active = EXCLUDED.is_active,
        expires_at = EXCLUDED.expires_at,
        data = EXCLUDED.data,
        updated_at = NOW()
    `;
    return NextResponse.json({ ok: true, data: mergedData });
  } catch (error) {
    console.warn('[api/user] POST error:', error?.message || error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}
