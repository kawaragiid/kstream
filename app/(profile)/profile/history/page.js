"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import HistoryRow from '../../../../components/HistoryRow';
import { getUserHistory } from '../../../../lib/firestore';
import { useAuth } from '../../../../hooks/useAuth';

export default function HistoryPage() {
  const { user, loading } = useAuth();
  const [items, setItems] = useState([]);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    let active = true;
    if (!user) {
      setItems([]);
      return;
    }

    setFetching(true);
    getUserHistory(user.uid)
      .then((data) => {
        if (active) setItems(data);
      })
      .catch(() => {
        if (active) setItems([]);
      })
      .finally(() => {
        if (active) setFetching(false);
      });

    return () => {
      active = false;
    };
  }, [user]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-10">
        <p className="text-text-muted">Memuat riwayat...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-surface-100/60 p-8 text-center backdrop-blur">
          <h1 className="text-2xl font-semibold text-white">Riwayat Tonton</h1>
          <p className="mt-2 text-sm text-text-secondary">Masuk untuk melanjutkan dan melihat riwayat tontonan kamu.</p>
          <Link
            href="/login"
            className="mt-6 inline-flex items-center rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-light"
          >
            Masuk Sekarang
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Riwayat Tonton</h1>
        <p className="mt-1 text-sm text-text-secondary">Lanjutkan tontonan terakhirmu.</p>
      </div>
      {fetching ? (
        <p className="text-sm text-text-muted">Mengambil riwayat...</p>
      ) : items.length ? (
        <HistoryRow items={items} loading={fetching} />
      ) : (
        <p className="text-sm text-text-muted">Belum ada riwayat tontonan.</p>
      )}
    </div>
  );
}
