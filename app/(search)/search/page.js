"use client";

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import CardPoster from '../../../components/CardPoster';
import SearchBar from '../../../components/SearchBar';

function SearchContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = useCallback(async (query) => {
    const trimmed = (query || '').trim();
    if (!trimmed) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setError('');
    setHasSearched(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`);
      if (!res.ok) throw new Error('Gagal mengambil hasil');
      const data = await res.json();
      setResults(data.items || []);
    } catch (err) {
      setError(err.message || 'Gagal melakukan pencarian');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialQuery) {
      handleSearch(initialQuery);
    } else {
      setResults([]);
      setHasSearched(false);
    }
  }, [initialQuery, handleSearch]);

  return (
    <div className="min-h-[75vh] bg-[#141414] px-4 sm:px-8 lg:px-12 pt-24 sm:pt-28 pb-14">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-semibold text-white">Cari</h1>
          <p className="text-sm text-white/60">Temukan film, anime, atau series favoritmu.</p>
        </div>
        <SearchBar onSearch={handleSearch} initialValue={initialQuery} />
        {loading && <p className="text-sm text-white/60">Mencari...</p>}
        {error && <p className="text-sm text-rose-400">{error}</p>}
        {results.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {results.map((item) => (
              <CardPoster key={`${item.type || "item"}-${item.id}`} item={item} />
            ))}
          </div>
        )}
        {!loading && results.length === 0 && !error && (
          <div className="rounded-md border border-white/10 bg-[#181818] p-10 text-center">
            <p className="text-sm text-white/65">
              {hasSearched ? 'Tidak ada konten yang cocok dengan kata kunci tersebut.' : 'Masukkan kata kunci untuk mulai mencari.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-[75vh] bg-[#141414] px-4 sm:px-8 lg:px-12 pt-24 sm:pt-28 pb-14 text-sm text-white/60">Memuat pencarian...</div>}>
      <SearchContent />
    </Suspense>
  );
}
