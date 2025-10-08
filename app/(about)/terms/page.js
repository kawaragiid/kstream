export const metadata = { title: 'Ketentuan Layanan - Kstream' };

export default function TermsPage() {
  return (
    <div className="container mx-auto px-4 py-10">
      <div className="max-w-4xl space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Ketentuan Layanan</h1>
          <p className="text-white/70">Terakhir diperbarui: {new Date().toLocaleDateString()}</p>
        </header>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">1. Penerimaan Ketentuan</h2>
          <p className="text-white/80 leading-relaxed">
            Dengan mengakses dan menggunakan Kstream, Anda menyetujui untuk terikat dengan Ketentuan Layanan ini.
            Bila Anda tidak menyetujui salah satu bagian dari ketentuan ini, mohon hentikan penggunaan layanan.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">2. Penggunaan Layanan</h2>
          <ul className="list-disc pl-6 text-white/80 leading-relaxed space-y-1">
            <li>Layanan ditujukan untuk penggunaan pribadi dan non-komersial.</li>
            <li>Dilarang menyalahgunakan, menyalin, mendistribusikan, atau mengkomersialkan konten tanpa izin.</li>
            <li>Kami dapat menghentikan akses jika terdeteksi pelanggaran.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">3. Konten dan Hak Cipta</h2>
          <p className="text-white/80 leading-relaxed">
            Semua materi, termasuk teks, gambar, video, dan elemen visual lain yang ditampilkan pada Kstream tunduk pada ketentuan hak cipta
            masing-masing pemilik. Penggunaan di luar izin yang diberikan dapat melanggar hukum hak cipta yang berlaku.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">4. Perubahan Ketentuan</h2>
          <p className="text-white/80 leading-relaxed">
            Kami dapat memperbarui Ketentuan Layanan ini dari waktu ke waktu. Perubahan akan berlaku sejak tanggal pembaruan ditampilkan.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">5. Kontak</h2>
          <p className="text-white/80 leading-relaxed">
            Pertanyaan terkait Ketentuan Layanan dapat dikirimkan ke Admin Kstream.
          </p>
        </section>
      </div>
    </div>
  );
}
