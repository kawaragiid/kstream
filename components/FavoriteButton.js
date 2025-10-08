"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../hooks/useAuth';
import { isFavorite, toggleFavorite } from '../lib/firestore';

export default function FavoriteButton({ video }) {
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
    isFavorite(user.uid, video.id).then((state) => {
      if (active) setFavorite(state);
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
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      className="inline-flex items-center rounded border border-white/30 px-4 py-2 text-sm text-white hover:bg-white/10"
      disabled={loading}
    >
      {loading ? 'Menyimpan...' : favorite ? 'Hapus dari Favorit' : 'Tambah ke Favorit'}
    </button>
  );
}

