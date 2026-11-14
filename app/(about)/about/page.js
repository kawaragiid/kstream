import Link from 'next/link';

export const metadata = { title: 'Tentang Kstream' };

export default function AboutPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 pt-24 sm:pt-28 pb-16 space-y-6">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#E50914]">Kstream by Kawaragi</p>
        <h1 className="text-3xl font-bold text-white">Tentang Kstream</h1>
      </div>
      <div className="space-y-4 rounded-3xl border border-white/10 bg-surface-100/60 p-6 md:p-8 backdrop-blur">
        <p className="text-white/80 leading-relaxed">
          Kstream adalah platform streaming independen yang menghadirkan film, serial, dan anime pilihan dengan pemutar video modern bergaya Liquid Glass, dukungan kualitas adaptif hingga 1080p, serta subtitle multi-bahasa (Indonesia, English, dan 日本語) yang dapat dikustomisasi sepenuhnya.
        </p>
        <p className="text-white/80 leading-relaxed">
          Seluruh tayangan dapat diakses gratis dengan membuat akun Kstream agar Anda bisa menyimpan daftar favorit, melanjutkan tontonan dari menit &amp; episode terakhir, serta menikmati pemutaran penuh tanpa batas. Untuk pengunjung tanpa login, akses dibatasi 1 judul/hari (maksimal 3 menit preview) guna menjaga efisiensi server dan database.
        </p>
        <p className="text-white/80 leading-relaxed">
          Kstream dikelola secara independen tanpa biaya langganan wajib. Jika Anda menyukai layanan ini, Anda dapat mendukung biaya server dan bandwidth melalui{' '}
          <Link href="/premium/upgrade" className="font-semibold text-[#E50914] hover:underline">
            halaman Donasi (lynk.id/kawaragi)
          </Link>.
        </p>
      </div>
    </div>
  );
}
