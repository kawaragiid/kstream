export const metadata = { title: 'Kebijakan Privasi' };

export default function PrivacyPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 pt-24 sm:pt-28 pb-16 space-y-8">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#E50914]">Privasi</p>
        <h1 className="text-3xl font-bold tracking-tight text-white">Kebijakan Privasi</h1>
        <p className="text-white/70">Transparansi mengenai pengelolaan data akun Anda di Kstream.</p>
      </header>

      <div className="space-y-6 rounded-md border border-white/10 bg-[#181818] p-6 md:p-8">
        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-white">1. Data yang Kami Simpan</h2>
          <ul className="list-disc pl-6 text-white/80 leading-relaxed space-y-1">
            <li>Identitas autentikasi dasar (UID, email, nama tampilan, foto profil) melalui Firebase Authentication.</li>
            <li>Daftar favorit, riwayat tontonan (termasuk posisi menit terakhir), dan preferensi bahasa subtitle di database Neon Postgres.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-white">2. Penggunaan &amp; Perlindungan Data</h2>
          <p className="text-white/80 leading-relaxed">
            Data hanya digunakan untuk menyinkronkan profil, fitur Lanjutkan Menonton, dan statistik tayangan agregat. Akses API profil pengguna dilindungi verifikasi Firebase ID Token. Kami tidak menjual atau membagikan data pribadi Anda kepada pihak ketiga untuk iklan.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-white">3. Penyimpanan Lokal (Browser)</h2>
          <p className="text-white/80 leading-relaxed">
            Kstream menyimpan pengaturan tampilan subtitle dan penghitung kuota preview tamu harian di <code>localStorage</code> browser Anda agar preferensi tetap aktif tanpa membebani server.
          </p>
        </section>
      </div>
    </div>
  );
}
