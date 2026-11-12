"use client";

export default function Error({ error, reset }) {
  return (
    <div className="container mx-auto px-4 py-24 text-center">
      <h2 className="text-3xl font-bold text-white">Terjadi kesalahan</h2>
      <p className="mt-2 text-sm text-text-secondary">{error?.message || 'Coba lagi nanti.'}</p>
      <button
        type="button"
        className="mt-6 inline-flex items-center rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-light"
        onClick={() => reset()}
      >
        Coba lagi
      </button>
    </div>
  );
}
