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
    await toggleFavorite(user.uid, video);
    loadFavorites(user.uid);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-10">
        <p className="text-text-muted">Memuat favorit...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-surface-100/60 p-8 text-center backdrop-blur">
          <h1 className="text-2xl font-semibold text-white">Favorit Saya</h1>
          <p className="mt-2 text-sm text-text-secondary">Masuk untuk menyimpan dan melihat daftar tontonan favoritmu.</p>
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
        <h1 className="text-3xl font-bold text-white">Favorit</h1>
        <p className="mt-1 text-sm text-text-secondary">Daftar film dan series yang kamu simpan.</p>
      </div>
      {fetching ? (
        <p className="text-sm text-text-muted">Mengambil data...</p>
      ) : items.length ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
          {items.map((item) => (
            <div key={item.id} className="space-y-2">
              <CardPoster item={item} />
              <button
                type="button"
                onClick={() => handleRemove(item)}
                className="w-full rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-300 transition hover:bg-rose-500/20"
              >
                Hapus dari favorit
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-text-muted">Belum ada konten favorit yang disimpan.</p>
      )}
    </div>
  );
}
