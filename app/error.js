"use client";

import { useEffect } from "react";

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center bg-[#141414] px-4 pt-24 pb-16 text-center">
      <h2 className="text-3xl font-bold text-white">Terjadi kesalahan</h2>
      <p className="mt-2 text-sm text-text-secondary">{error?.message || 'Coba lagi nanti.'}</p>
      <button
        type="button"
        className="mt-6 inline-flex items-center rounded-full bg-[#E50914] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#f6121d]"
        onClick={() => reset()}
      >
        Coba lagi
      </button>
    </div>
  );
}
