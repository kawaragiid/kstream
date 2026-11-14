"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center bg-[#141414] px-4 pt-24 pb-16 text-center">
      <h2 className="text-3xl font-bold text-white">Terjadi kesalahan</h2>
      <p className="mt-2 max-w-md text-sm text-white/65">
        Maaf, terjadi gangguan saat memuat halaman ini. Silakan coba lagi atau kembali ke beranda.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          className="inline-flex min-h-[44px] items-center rounded-md bg-[#E50914] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#f6121d]"
          onClick={() => reset()}
        >
          Coba lagi
        </button>
        <Link
          href="/"
          className="inline-flex min-h-[44px] items-center rounded-md border border-white/20 bg-white/5 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15"
        >
          Kembali ke Beranda
        </Link>
      </div>
    </div>
  );
}
