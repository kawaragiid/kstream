"use client";

export default function Error({ error, reset }) {
  return (
    <div className="container mx-auto px-4 py-24 text-center">
      <h2 className="text-3xl font-bold">Terjadi kesalahan</h2>
      <p className="text-gray-500 mt-2">{error?.message || 'Coba lagi nanti.'}</p>
      <button
        className="mt-6 inline-flex items-center rounded bg-brand px-4 py-2 text-white"
        onClick={() => reset()}
      >
        Coba lagi
      </button>
    </div>
  );
}

