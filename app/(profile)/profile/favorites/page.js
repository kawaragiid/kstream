"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import CardPoster from '../../../../components/CardPoster';
import ProfileSubNav from '../../../../components/ProfileSubNav';
import { getUserFavorites, toggleFavorite } from '../../../../lib/firestore';
import { useAuth } from '../../../../hooks/useAuth';

function PosterGridSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Memuat daftar favorit"
      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4"
    >
      {Array.from({ length: 10 }).map((_, index) => (
        <div
          key={`fav-skeleton-${index}`}
          className="aspect-[2/3] w-full animate-pulse rounded-lg border border-white/10 bg-white/10 motion-reduce:animate-none"
        />
      ))}
    </div>
  );
}

export default function FavoritesPage() {
  const { user, loading } = useAuth();
  const [items, setItems] = useState([]);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState('');

  const loadFavorites = async (uid) => {
    setFetching(true);
    setError('');
    try {
      const data = await getUserFavorites(uid);
      setItems(data || []);
    } catch (err) {
      setError(err?.message || 'Gagal memuat daftar favorit.');
      setItems([]);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (!user) {
      setItems([]);
      return;
    }
    loadFavorites(user.uid);
  }, [user]);

  const handleRemove = async (video) => {
    if (!user) return;
    setError('');
    try {
      await toggleFavorite(user.uid, video);
      setItems((prev) => prev.filter((item) => item.id !== video.id));
    } catch (err) {
      setError(err?.message || 'Gagal menghapus dari Daftar Saya. Silakan coba lagi.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[75vh] bg-[#141414] px-4 sm:px-8 lg:px-12 pt-24 sm:pt-28 pb-14">
        <div className="mx-auto max-w-[1600px] space-y-6">
          <ProfileSubNav active="favorites" />
          <PosterGridSkeleton />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[75vh] bg-[#141414] px-4 pt-24 sm:pt-28 pb-16">
        <div className="mx-auto max-w-md rounded-md border border-white/10 bg-[#181818] p-8 text-center shadow-2xl">
          <h1 className="text-2xl font-bold text-white">Daftar Saya</h1>
          <p className="mt-2 text-sm text-white/65">Masuk untuk menyimpan dan melihat daftar tontonan favoritmu.</p>
          <Link
            href="/login?redirect=/profile/favorites"
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
        <ProfileSubNav active="favorites" />
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-white">Daftar Saya</h1>
            <p className="mt-1 text-sm text-white/65">Film dan serial yang kamu simpan untuk ditonton nanti.</p>
          </div>
          <Link
            href="/profile/settings"
            className="inline-flex min-h-[44px] items-center justify-center rounded-[4px] border border-white/25 px-4 py-2 text-xs font-semibold text-white/85 transition hover:border-white hover:text-white motion-reduce:transition-none"
          >
            Kelola Profil
          </Link>
        </div>

        {error && (
          <div role="alert" className="rounded-md border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            {error}
          </div>
        )}

        {fetching ? (
          <PosterGridSkeleton />
        ) : items.length ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {items.map((item) => (
              <div key={item.id} className="group relative">
                <CardPoster item={item} />
                <button
                  type="button"
                  onClick={() => handleRemove(item)}
                  aria-label={`Hapus ${item.title || 'tayangan'} dari Daftar Saya`}
                  title="Hapus dari Daftar"
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
            <p className="text-sm text-white/65">Belum ada konten yang disimpan di Daftar Saya.</p>
            <Link
              href="/"
              className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-[4px] bg-white px-5 py-2.5 text-xs font-bold text-black transition hover:bg-white/85 motion-reduce:transition-none"
            >
              Jelajahi Katalog
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
