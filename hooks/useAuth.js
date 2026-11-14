"use client";

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { logout, onAuthChange } from '../lib/auth';

const AuthContext = createContext(null);

function parseExpiryMs(expiresAt) {
  if (!expiresAt) return null;
  if (typeof expiresAt === 'number') return Number.isFinite(expiresAt) ? expiresAt : null;
  if (typeof expiresAt === 'string') {
    const ms = Date.parse(expiresAt);
    return Number.isNaN(ms) ? null : ms;
  }
  if (typeof expiresAt === 'object') {
    if (typeof expiresAt._seconds === 'number') return expiresAt._seconds * 1000;
    if (typeof expiresAt.seconds === 'number') return expiresAt.seconds * 1000;
  }
  return null;
}

function isAccountBlocked(userData) {
  if (!userData || typeof userData !== 'object') return false;
  if (userData.isActive === false || userData.status === 'suspend') return true;
  const expiryMs = parseExpiryMs(userData.expiresAt);
  if (expiryMs !== null && expiryMs <= Date.now()) return true;
  return false;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    let checkSeq = 0;

    const unsubscribe = onAuthChange(
      async (firebaseUser) => {
        const seq = ++checkSeq;
        if (!firebaseUser) {
          if (!active || seq !== checkSeq) return;
          setUser(null);
          setError(null);
          setLoading(false);
          return;
        }

        try {
          const token = await firebaseUser.getIdToken?.();
          if (token) {
            const res = await fetch(`/api/user?uid=${encodeURIComponent(firebaseUser.uid)}`, {
              cache: 'no-store',
              headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
              const json = await res.json().catch(() => null);
              const userData = json?.data;
              if (isAccountBlocked(userData)) {
                try {
                  await logout();
                } catch {}
                if (!active || seq !== checkSeq) return;
                setUser(null);
                setError('Akun Anda dinonaktifkan atau masa aktif telah berakhir.');
                setLoading(false);
                return;
              }
            }
          }
        } catch (err) {
          console.warn('[useAuth] Neon status check failed:', err?.message || err);
        }

        if (!active || seq !== checkSeq) return;
        setUser(firebaseUser);
        setError(null);
        setLoading(false);
      },
      (err) => {
        if (!active) return;
        console.warn('[useAuth] Auth listener error:', err?.message || err);
        setError(err?.message || 'Gagal memuat status autentikasi.');
        setUser(null);
        setLoading(false);
      }
    );

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  const value = useMemo(() => ({ user, loading, error }), [user, loading, error]);

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}

