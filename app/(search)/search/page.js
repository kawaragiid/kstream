"use client";

import { useState } from 'react';
import CardPoster from '../../../components/CardPoster';
import SearchBar from '../../../components/SearchBar';

export default function SearchPage() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (query) => {
    if (!query) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setError('');
    setHasSearched(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error('Gagal mengambil hasil');
      const data = await res.json();
      setResults(data.items || []);
    } catch (err) {
      setError(err.message || 'Gagal melakukan pencarian');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-10 space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold text-white">Cari</h1>
        <p className="text-sm text-text-secondary">Temukan film, anime, atau series favoritmu.</p>
      </div>
      <SearchBar onSearch={handleSearch} />
      {loading && <p className="text-sm text-text-muted">Mencari...</p>}
      {error && <p className="text-sm text-rose-400">{error}</p>}
      {results.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
          {results.map((item) => (
            <CardPoster key={`${item.type || "item"}-${item.id}`} item={item} />
          ))}
        </div>
      )}
      {!loading && results.length === 0 && !error && (
        <p className="text-sm text-text-muted">
          {hasSearched ? 'Tidak ada konten yang cocok dengan kata kunci tersebut.' : 'Masukkan kata kunci untuk mulai mencari.'}
        </p>
      )}
    </div>
  );
}
