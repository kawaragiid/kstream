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
      <div className="min-h-[70vh] bg-[#141414] px-4 sm:px-8 lg:px-12 py-12">
        <p className="text-sm text-white/60">Memuat riwayat tonton...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[75vh] bg-[#141414] px-4 py-16">
        <div className="mx-auto max-w-md rounded-md border border-white/10 bg-[#181818] p-8 text-center shadow-2xl">
          <h1 className="text-2xl font-bold text-white">Riwayat Tonton</h1>
          <p className="mt-2 text-sm text-white/65">Masuk untuk melanjutkan dan melihat riwayat tontonan kamu.</p>
          <Link
            href="/login"
            className="mt-6 inline-flex items-center rounded-[4px] bg-[#E50914] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#f6121d]"
          >
            Masuk Sekarang
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[75vh] bg-[#141414] px-4 sm:px-8 lg:px-12 py-10">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-white">Riwayat Tonton</h1>
            <p className="mt-1 text-sm text-white/60">Lanjutkan tontonan terakhirmu dari posisi terakhir.</p>
          </div>
          <Link
            href="/profile/settings"
            className="rounded-[4px] border border-white/25 px-3.5 py-1.5 text-xs font-semibold text-white/85 transition hover:border-white hover:text-white"
          >
            Kelola Profil
          </Link>
        </div>

        {fetching ? (
          <p className="text-sm text-white/60">Mengambil riwayat...</p>
        ) : items.length ? (
          <HistoryRow items={items} loading={fetching} />
        ) : (
          <div className="rounded-md border border-white/10 bg-[#181818] p-10 text-center">
            <p className="text-sm text-white/65">Belum ada riwayat tontonan.</p>
            <Link
              href="/"
              className="mt-4 inline-flex items-center rounded-[4px] bg-white px-5 py-2 text-xs font-bold text-black transition hover:bg-white/85"
            >
              Mulai Menonton
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
