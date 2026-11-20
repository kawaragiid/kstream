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
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let active = true;
    setErrorMsg('');
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
      const redirectTarget =
        typeof window !== 'undefined'
          ? window.location.pathname + window.location.search
          : '/';
      router.push(`/login?redirect=${encodeURIComponent(redirectTarget)}`);
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      const result = await toggleFavorite(user.uid, video);
      if (typeof result?.isFavorite === 'boolean') {
        setFavorite(result.isFavorite);
      }
    } catch (err) {
      console.warn('Gagal mengubah status favorit:', err);
      setErrorMsg('Gagal memperbarui favorit. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="inline-flex flex-col items-start gap-1.5">
      <button
        type="button"
        onClick={handleToggle}
        aria-pressed={favorite}
        className={`inline-flex items-center justify-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold transition-all duration-200 active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100 disabled:cursor-not-allowed disabled:opacity-60 min-h-[44px] ${
          favorite
            ? 'border-brand/60 bg-brand/10 text-white hover:bg-brand/20'
            : 'border-white/30 bg-white/5 text-white hover:bg-white/10'
        } ${className}`}
        disabled={loading}
        aria-label={favorite ? 'Hapus dari Favorit' : 'Tambah ke Favorit'}
      >
        {loading ? 'Menyimpan...' : favorite ? 'Hapus dari Favorit' : 'Tambah ke Favorit'}
      </button>
      {errorMsg && (
        <p role="alert" className="text-xs text-rose-300">
          {errorMsg}
        </p>
      )}
    </div>
  );
}

