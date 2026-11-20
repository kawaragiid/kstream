"use client";

import { useEffect, useRef, useState } from 'react';

export default function SearchBar({ onSearch, initialValue = '', loading = false }) {
  const [q, setQ] = useState(initialValue);
  const inputRef = useRef(null);

  useEffect(() => {
    setQ(initialValue);
  }, [initialValue]);

  const handleClear = () => {
    setQ('');
    onSearch?.('');
    inputRef.current?.focus();
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSearch?.(q);
      }}
      className="flex gap-2.5 sm:gap-3"
    >
      <div className="relative flex-1">
        <input
          ref={inputRef}
          id="kstream-search-input"
          type="search"
          aria-label="Cari film, anime, atau series"
          className="min-h-[44px] w-full rounded-md border border-white/15 bg-[#181818] px-4 py-2 pr-12 text-sm sm:text-base text-white placeholder:text-white/60 focus:border-white/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 [&::-webkit-search-cancel-button]:hidden"
          placeholder="Cari film, series..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {q && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Hapus kata kunci"
            className="absolute right-0.5 top-1/2 -translate-y-1/2 inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-white/65 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      <button
        type="submit"
        disabled={loading}
        className="min-h-[44px] rounded-md bg-[#E50914] px-6 py-2 text-sm font-semibold text-white transition hover:bg-[#f6121d] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? 'Mencari...' : 'Cari'}
      </button>
    </form>
  );
}
