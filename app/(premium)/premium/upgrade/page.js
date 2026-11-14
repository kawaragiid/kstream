import Link from 'next/link';

export const metadata = {
  title: 'Dukung Kstream',
  description: 'Dukung pengembangan dan biaya server Kstream melalui donasi.',
};

export default function UpgradePage() {
  return (
    <div className="relative flex min-h-[85vh] items-center justify-center overflow-hidden bg-[#141414] px-4 pt-24 sm:pt-28 pb-16 text-white">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_rgba(229,9,20,0.18),_transparent_60%)]" />
      <div className="w-full max-w-lg rounded-md border border-white/10 bg-[#181818] p-8 sm:p-10 text-center shadow-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#E50914]">
          Dukung Kreator
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white">
          Donasi untuk Kstream
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-white/70">
          Kstream dapat dinikmati gratis setelah masuk akun. Jika kamu merasa terbantu, dukungan donasi sangat berarti untuk biaya server, database, dan bandwidth streaming.
        </p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <a
            href="https://lynk.id/kawaragi"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-xl bg-[#E50914] px-7 py-3.5 text-sm font-bold text-white transition hover:bg-[#f40612] active:scale-95"
          >
            Donasi via lynk.id/kawaragi
          </a>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/10 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white/20"
          >
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}
