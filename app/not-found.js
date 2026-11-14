import Link from 'next/link';

export const metadata = { title: "Halaman Tidak Ditemukan" };

export default function NotFound() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center bg-[#141414] px-4 pt-24 pb-16 text-center text-white">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#E50914]">Error 404</p>
      <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
        Halaman Tidak Ditemukan
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-white/65">
        Halaman atau tayangan yang kamu cari tidak tersedia, telah dihapus, atau URL salah.
      </p>
      <Link
        href="/"
        className="mt-7 inline-flex items-center rounded-md bg-[#E50914] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#f40612] active:scale-95"
      >
        Kembali ke Beranda
      </Link>
    </div>
  );
}
