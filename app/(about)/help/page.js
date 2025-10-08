export const metadata = { title: 'Bantuan - Kstream' };

export default function HelpPage() {
  return (
    <div className="container mx-auto px-4 py-10">
      <div className="max-w-4xl space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Pusat Bantuan</h1>
          <p className="text-white/70">Pertanyaan umum, pemecahan masalah, dan kontak dukungan.</p>
        </header>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">FAQ</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold">Bagaimana cara memulai menonton?</h3>
              <p className="text-white/80 leading-relaxed">Cari judul di pencarian atau jelajahi kategori, lalu buka halaman detail dan tekan tombol putar.</p>
            </div>
            <div>
              <h3 className="font-semibold">Subtitle tidak muncul atau terlambat?</h3>
              <p className="text-white/80 leading-relaxed">Aktifkan subtitle dari kontrol pemutar. Jika tetap bermasalah, muat ulang halaman atau pilih bahasa lain.</p>
            </div>
            <div>
              <h3 className="font-semibold">Video buffering atau tersendat?</h3>
              <p className="text-white/80 leading-relaxed">Pastikan koneksi stabil. Coba tutup aplikasi lain yang menggunakan bandwidth, lalu muat ulang video.</p>
            </div>
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Dukungan</h2>
          <p className="text-white/80 leading-relaxed">
            Butuh bantuan lebih lanjut? Hubungi Admin Kstream. Sertakan tangkapan layar/URL jika memungkinkan untuk mempercepat proses.
          </p>
        </section>
      </div>
    </div>
  );
}
