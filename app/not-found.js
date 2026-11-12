import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="container mx-auto px-4 py-24 text-center">
      <h2 className="text-3xl font-bold text-white">Halaman tidak ditemukan</h2>
      <p className="mt-2 text-sm text-text-secondary">Halaman yang kamu cari tidak tersedia atau telah dipindahkan.</p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-light"
      >
        Kembali ke beranda
      </Link>
    </div>
  );
}
