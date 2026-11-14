"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import CardPoster from '../../../../components/CardPoster';
import { clearUserHistory, getUserHistory, removeHistoryItem } from '../../../../lib/firestore';
import { useAuth } from '../../../../hooks/useAuth';

export default function HistoryPage() {
  const { user, loading } = useAuth();
  const [items, setItems] = useState([]);
  const [fetching, setFetching] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState('');

  const handleClearHistory = async () => {
    if (!user?.uid || clearing) return;
    if (typeof window !== "undefined" && !window.confirm("Hapus seluruh riwayat tontonan?")) return;
    setClearing(true);
    setError('');
    try {
      await clearUserHistory(user.uid);
      setItems([]);
      window.dispatchEvent(new Event("kstream:history-updated"));
    } catch (err) {
      setError(err?.message || 'Gagal membersihkan riwayat tontonan.');
    } finally {
      setClearing(false);
    }
  };

  const handleRemoveItem = async (itemId) => {
    if (!user?.uid || !itemId) return;
    setError('');
    try {
      await removeHistoryItem(user.uid, itemId);
      setItems((prev) => prev.filter((item) => item.id !== itemId));
      window.dispatchEvent(new Event("kstream:history-updated"));
    } catch (err) {
      setError(err?.message || 'Gagal menghapus item riwayat.');
    }
  };

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
      <div className="min-h-[70vh] bg-[#141414] px-4 sm:px-8 lg:px-12 pt-24 sm:pt-28 pb-12">
        <p className="text-sm text-white/60">Memuat riwayat tonton...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[75vh] bg-[#141414] px-4 pt-24 sm:pt-28 pb-16">
        <div className="mx-auto max-w-md rounded-md border border-white/10 bg-[#181818] p-8 text-center shadow-2xl">
          <h1 className="text-2xl font-bold text-white">Riwayat Tonton</h1>
          <p className="mt-2 text-sm text-white/65">Masuk untuk melanjutkan dan melihat riwayat tontonan kamu.</p>
          <Link
            href="/login?redirect=/profile/history"
            className="mt-6 inline-flex items-center rounded-[4px] bg-[#E50914] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#f6121d]"
          >
            Masuk Sekarang
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[75vh] bg-[#141414] px-4 sm:px-8 lg:px-12 pt-24 sm:pt-28 pb-14">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-white">Riwayat Tonton</h1>
            <p className="mt-1 text-sm text-white/60">Lanjutkan tontonan terakhirmu dari posisi terakhir.</p>
          </div>
          <div className="flex items-center gap-2.5">
            {items.length > 0 && (
              <button
                type="button"
                onClick={handleClearHistory}
                disabled={clearing}
                className="rounded-[4px] border border-rose-500/40 bg-rose-500/10 px-3.5 py-1.5 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/20 disabled:opacity-50"
              >
                {clearing ? 'Membersihkan...' : 'Bersihkan Riwayat'}
              </button>
            )}
            <Link
              href="/profile/settings"
              className="rounded-[4px] border border-white/25 px-3.5 py-1.5 text-xs font-semibold text-white/85 transition hover:border-white hover:text-white"
            >
              Kelola Profil
            </Link>
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            {error}
          </div>
        )}

        {fetching ? (
          <p className="text-sm text-white/60">Mengambil riwayat...</p>
        ) : items.length ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {items.map((item) => (
              <div key={item.id} className="group relative">
                <CardPoster item={item} />
                <button
                  type="button"
                  onClick={() => handleRemoveItem(item.id)}
                  aria-label={`Hapus ${item.title || 'tayangan'} dari riwayat`}
                  title="Hapus dari Riwayat"
                  className="absolute right-2 top-2 z-20 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-black/75 text-white/85 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 transition hover:bg-[#E50914] hover:border-[#E50914] hover:text-white"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                    <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
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
