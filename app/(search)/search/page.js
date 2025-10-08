"use client";

import { useState } from 'react';
import CardPoster from '../../../components/CardPoster';
import SearchBar from '../../../components/SearchBar';

export default function SearchPage() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (query) => {
    if (!query) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError('');
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
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">Cari</h1>
        <p className="text-gray-600">Temukan film atau series favoritmu.</p>
      </div>
      <SearchBar onSearch={handleSearch} />
      {loading && <p className="text-sm text-gray-500">Mencari...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        {results.map((item) => (
          <CardPoster key={item.id} item={item} />
        ))}
      </div>
      {!loading && results.length === 0 && !error && (
        <p className="text-sm text-gray-500">Masukkan kata kunci untuk mulai mencari.</p>
      )}
    </div>
  );
}

