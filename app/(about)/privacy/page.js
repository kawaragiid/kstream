export const metadata = { title: 'Kebijakan Privasi - Kstream' };

export default function PrivacyPage() {
  return (
    <div className="container mx-auto px-4 py-10">
      <div className="max-w-4xl space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Kebijakan Privasi</h1>
          <p className="text-white/70">Transparansi mengenai data Anda di Kstream.</p>
        </header>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">1. Informasi yang Kami Kumpulkan</h2>
          <ul className="list-disc pl-6 text-white/80 leading-relaxed space-y-1">
            <li>Data akun (nama, email) dan preferensi tontonan.</li>
            <li>Riwayat akses dan interaksi dasar untuk meningkatkan layanan.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">2. Cara Kami Menggunakan Data</h2>
          <p className="text-white/80 leading-relaxed">
            Data digunakan untuk personalisasi rekomendasi, perbaikan performa, dan keamanan. Kami tidak menjual data pribadi Anda.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">3. Penyimpanan dan Keamanan</h2>
          <p className="text-white/80 leading-relaxed">
            Kami menerapkan praktik keamanan yang wajar untuk melindungi data. Meski demikian, tidak ada sistem yang sepenuhnya aman.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">4. Hak Anda</h2>
          <ul className="list-disc pl-6 text-white/80 leading-relaxed space-y-1">
            <li>Mengakses, memperbarui, atau menghapus informasi tertentu.</li>
            <li>Mengatur preferensi komunikasi dan privasi.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">5. Perubahan Kebijakan</h2>
          <p className="text-white/80 leading-relaxed">
            Kebijakan ini dapat berubah. Pembaruan akan ditampilkan pada halaman ini.
          </p>
        </section>
      </div>
    </div>
  );
}
