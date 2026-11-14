"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import CardPoster from '../../../../components/CardPoster';
import { getUserFavorites, toggleFavorite } from '../../../../lib/firestore';
import { useAuth } from '../../../../hooks/useAuth';

export default function FavoritesPage() {
  const { user, loading } = useAuth();
  const [items, setItems] = useState([]);
  const [fetching, setFetching] = useState(false);

  const loadFavorites = async (uid) => {
    setFetching(true);
    const data = await getUserFavorites(uid).catch(() => []);
    setItems(data);
    setFetching(false);
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
    try {
      await toggleFavorite(user.uid, video);
    } catch (err) {
      console.warn('Gagal menghapus favorit:', err);
    }
    loadFavorites(user.uid);
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] bg-[#141414] px-4 sm:px-8 lg:px-12 pt-24 sm:pt-28 pb-12">
        <p className="text-sm text-white/60">Memuat daftar saya...</p>
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
    <div className="min-h-[75vh] bg-[#141414] px-4 sm:px-8 lg:px-12 pt-24 sm:pt-28 pb-14">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-white">Daftar Saya</h1>
            <p className="mt-1 text-sm text-white/60">Film dan serial yang kamu simpan untuk ditonton nanti.</p>
          </div>
          <Link
            href="/profile/settings"
            className="rounded-[4px] border border-white/25 px-3.5 py-1.5 text-xs font-semibold text-white/85 transition hover:border-white hover:text-white"
          >
            Kelola Profil
          </Link>
        </div>

        {fetching ? (
          <p className="text-sm text-white/60">Mengambil data...</p>
        ) : items.length ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {items.map((item) => (
              <div key={item.id} className="space-y-2">
                <CardPoster item={item} />
                <button
                  type="button"
                  onClick={() => handleRemove(item)}
                  className="w-full rounded-[4px] border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/75 transition hover:border-white/40 hover:bg-white/10 hover:text-white"
                >
                  Hapus dari Daftar
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-white/10 bg-[#181818] p-10 text-center">
            <p className="text-sm text-white/65">Belum ada konten yang disimpan di Daftar Saya.</p>
            <Link
              href="/"
              className="mt-4 inline-flex items-center rounded-[4px] bg-white px-5 py-2 text-xs font-bold text-black transition hover:bg-white/85"
            >
              Jelajahi Katalog
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
