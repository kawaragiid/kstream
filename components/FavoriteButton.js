"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../hooks/useAuth';
import { isFavorite, toggleFavorite } from '../lib/firestore';

export default function FavoriteButton({ video, className = "" }) {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [favorite, setFavorite] = useState(false);

  useEffect(() => {
    let active = true;
    if (!user || !video?.id) {
      setFavorite(false);
      return;
    }
    isFavorite(user.uid, video.id)
      .then((state) => {
        if (active) setFavorite(state);
      })
      .catch(() => {
        if (active) setFavorite(false);
      });
    return () => {
      active = false;
    };
  }, [user, video?.id]);

  const handleToggle = async () => {
    if (!user) {
      router.push('/login');
      return;
    }
    setLoading(true);
    try {
      const result = await toggleFavorite(user.uid, video);
      if (typeof result?.isFavorite === 'boolean') {
        setFavorite(result.isFavorite);
      }
    } catch (err) {
      console.warn('Gagal mengubah status favorit:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={`inline-flex items-center justify-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 min-h-[44px] ${
        favorite
          ? 'border-brand/60 bg-brand/10 text-white hover:bg-brand/20'
          : 'border-white/30 bg-white/5 text-white hover:bg-white/10'
      } ${className}`}
      disabled={loading}
      aria-label={favorite ? 'Hapus dari Favorit' : 'Tambah ke Favorit'}
    >
      {loading ? 'Menyimpan...' : favorite ? 'Hapus dari Favorit' : 'Tambah ke Favorit'}
    </button>
  );
}

