export const metadata = { title: 'Ketentuan Layanan - Kstream' };

export default function TermsPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-14 space-y-8">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#E50914]">Legal</p>
        <h1 className="text-3xl font-bold tracking-tight text-white">Ketentuan Layanan</h1>
        <p className="text-white/70">Aturan penggunaan platform Kstream by Kawaragi.</p>
      </header>

      <div className="space-y-6 rounded-3xl border border-white/10 bg-surface-100/60 p-6 md:p-8 backdrop-blur">
        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-white">1. Penggunaan Wajar</h2>
          <ul className="list-disc pl-6 text-white/80 leading-relaxed space-y-1">
            <li>Kstream ditujukan untuk penggunaan pribadi dan non-komersial.</li>
            <li>Dilarang melakukan scraping otomatis, spam API, atau upaya melewati batas akses sistem.</li>
            <li>Admin berhak menonaktifkan akun yang terbukti melanggar ketentuan atau menyalahgunakan layanan.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-white">2. Ketersediaan Layanan</h2>
          <p className="text-white/80 leading-relaxed">
            Kstream dijalankan secara independen tanpa biaya langganan. Ketersediaan katalog, subtitle, dan kapasitas streaming dapat berubah sewaktu-waktu sesuai pemeliharaan sistem.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-white">3. Donasi</h2>
          <p className="text-white/80 leading-relaxed">
            Dukungan donasi melalui <code>lynk.id/kawaragi</code> bersifat sukarela untuk membantu operasional server dan tidak mengikat secara kontrak.
          </p>
        </section>
      </div>
    </div>
  );
}
