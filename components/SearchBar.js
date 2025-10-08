"use client";

import { useState } from 'react';

export default function SearchBar({ onSearch }) {
  const [q, setQ] = useState('');
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSearch?.(q);
      }}
      className="flex gap-3"
    >
      <input
        className="flex-1 rounded-full border border-white/10 bg-surface-100 px-4 py-2 text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none"
        placeholder="Cari film, series..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <button className="rounded-full bg-brand px-6 py-2 text-sm font-semibold text-white shadow-poster hover:bg-brand-dark transition">
        Cari
      </button>
    </form>
  );
}
