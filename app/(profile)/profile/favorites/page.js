"use client";

import { useEffect, useState } from 'react';
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
        <p className="text-gray-500">Memuat favorit...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-10">
        <p className="text-gray-600">Masuk untuk menyimpan konten favoritmu.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Favorit</h1>
        <p className="text-gray-600">Daftar film dan series yang kamu simpan.</p>
      </div>
      {fetching ? (
        <p className="text-sm text-gray-500">Mengambil data...</p>
      ) : items.length ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {items.map((item) => (
            <div key={item.id} className="space-y-2">
              <CardPoster item={item} />
              <button
                onClick={() => handleRemove(item)}
                className="text-xs text-red-500 hover:underline"
              >
                Hapus dari favorit
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500">Belum ada konten favorit.</p>
      )}
    </div>
  );
}

