"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import CardPoster from '../../../../components/CardPoster';
import ConfirmDialog from '../../../../components/ConfirmDialog';
import ProfileSubNav from '../../../../components/ProfileSubNav';
import { clearUserHistory, getUserHistory, removeHistoryItem } from '../../../../lib/firestore';
import { useAuth } from '../../../../hooks/useAuth';

function HistoryGridSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Memuat riwayat tonton"
      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4"
    >
      {Array.from({ length: 10 }).map((_, index) => (
        <div
          key={`history-skeleton-${index}`}
          className="aspect-[2/3] w-full animate-pulse rounded-lg border border-white/10 bg-white/10 motion-reduce:animate-none"
        />
      ))}
    </div>
  );
}

export default function HistoryPage() {
  const { user, loading } = useAuth();
  const [items, setItems] = useState([]);
  const [fetching, setFetching] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState('');

  const handleClearHistory = async () => {
    if (!user?.uid || clearing) return;
    setClearing(true);
    setError('');
    try {
      await clearUserHistory(user.uid);
      setItems([]);
      setConfirmOpen(false);
      window.dispatchEvent(new Event("kstream:history-updated"));
    } catch (err) {
      setError(err?.message || 'Gagal membersihkan riwayat tontonan.');
      setConfirmOpen(false);
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
      <div className="min-h-[75vh] bg-[#141414] px-4 sm:px-8 lg:px-12 pt-24 sm:pt-28 pb-14">
        <div className="mx-auto max-w-[1600px] space-y-6">
          <ProfileSubNav active="history" />
          <HistoryGridSkeleton />
        </div>
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
            className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-[4px] bg-[#E50914] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#f6121d] motion-reduce:transition-none"
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
        <ProfileSubNav active="history" />
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-white">Riwayat Tonton</h1>
            <p className="mt-1 text-sm text-white/65">Lanjutkan tontonan terakhirmu dari posisi terakhir.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            {items.length > 0 && (
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                disabled={clearing}
                className="inline-flex min-h-[44px] items-center justify-center rounded-[4px] border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/20 motion-reduce:transition-none disabled:opacity-50"
              >
                {clearing ? 'Membersihkan...' : 'Bersihkan Riwayat'}
              </button>
            )}
            <Link
              href="/profile/settings"
              className="inline-flex min-h-[44px] items-center justify-center rounded-[4px] border border-white/25 px-4 py-2 text-xs font-semibold text-white/85 transition hover:border-white hover:text-white motion-reduce:transition-none"
            >
              Kelola Profil
            </Link>
          </div>
        </div>

        {error && (
          <div role="alert" className="rounded-md border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            {error}
          </div>
        )}

        {fetching ? (
          <HistoryGridSkeleton />
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
                  className="absolute right-1.5 top-1.5 z-20 inline-flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-white/20 bg-black/75 text-white/85 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 transition hover:bg-[#E50914] hover:border-[#E50914] hover:text-white motion-reduce:transition-none"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
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
              className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-[4px] bg-white px-5 py-2.5 text-xs font-bold text-black transition hover:bg-white/85 motion-reduce:transition-none"
            >
              Mulai Menonton
            </Link>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Hapus seluruh riwayat tontonan?"
        description="Semua catatan tontonan dan posisi terakhir pemutaran akan dihapus permanen dari akun ini."
        confirmLabel="Hapus Riwayat"
        cancelLabel="Batal"
        loading={clearing}
        onConfirm={handleClearHistory}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
