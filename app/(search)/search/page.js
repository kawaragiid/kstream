"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import CardPoster from '../../../components/CardPoster';
import SearchBar from '../../../components/SearchBar';

function SearchContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const abortRef = useRef(null);

  const executeSearch = useCallback(async (query) => {
    const trimmed = (query || '').trim();
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }

    if (!trimmed) {
      setResults([]);
      setError('');
      setHasSearched(false);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError('');
    setHasSearched(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, {
        signal: controller.signal,
      });
      if (!res.ok) {
        let serverMsg = 'Gagal mengambil hasil pencarian';
        try {
          const errData = await res.json();
          if (errData?.error || errData?.message) {
            serverMsg = errData.error || errData.message;
          }
        } catch {
          // ignore JSON parse errors
        }
        throw new Error(serverMsg);
      }
      const data = await res.json();
      setResults(data.items || []);
    } catch (err) {
      if (err?.name === 'AbortError') return;
      setError(err.message || 'Gagal melakukan pencarian');
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setLoading(false);
      }
    }
  }, []);

  const handleSearch = useCallback(
    (query) => {
      const trimmed = (query || '').trim();
      const targetUrl = trimmed ? `${pathname}?q=${encodeURIComponent(trimmed)}` : pathname;
      if (trimmed === initialQuery.trim()) {
        executeSearch(trimmed);
      } else {
        router.replace(targetUrl, { scroll: false });
      }
    },
    [executeSearch, initialQuery, pathname, router]
  );

  useEffect(() => {
    executeSearch(initialQuery);
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
    };
  }, [initialQuery, executeSearch]);

  return (
    <div className="min-h-[75vh] bg-[#141414] px-4 sm:px-8 lg:px-12 pt-24 sm:pt-28 pb-14">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-semibold text-white">Cari</h1>
          <p className="text-sm text-white/60">Temukan film, anime, atau series favoritmu.</p>
        </div>
        <SearchBar onSearch={handleSearch} initialValue={initialQuery} loading={loading} />
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
