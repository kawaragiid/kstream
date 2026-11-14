import Link from 'next/link';

export const metadata = { title: 'Bantuan - Kstream' };

export default function HelpPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 pt-24 sm:pt-28 pb-16 space-y-8">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#E50914]">Pusat Bantuan</p>
        <h1 className="text-3xl font-bold tracking-tight text-white">Bantuan &amp; FAQ</h1>
        <p className="text-white/70">Panduan penggunaan, pemecahan masalah pemutar video, dan dukungan Kstream.</p>
      </header>

      <section className="space-y-4 rounded-3xl border border-white/10 bg-surface-100/60 p-6 md:p-8 backdrop-blur">
        <h2 className="text-xl font-semibold text-white">Pertanyaan Umum</h2>
        <div className="space-y-5">
          <div>
            <h3 className="font-semibold text-white">Kenapa video berhenti setelah 3 menit atau dibatasi 1 judul/hari?</h3>
            <p className="mt-1 text-white/80 leading-relaxed">
              Pengunjung tanpa login memiliki batas preview tamu (1 judul/hari, maks. 3 menit) untuk menghemat server dan database. Silakan{' '}
              <Link href="/login" className="text-[#E50914] hover:underline">Masuk</Link> atau{' '}
              <Link href="/register" className="text-[#E50914] hover:underline">Daftar Gratis</Link> untuk menonton penuh tanpa batas.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-white">Bagaimana cara mengatur ukuran, warna, dan latar subtitle?</h3>
            <p className="mt-1 text-white/80 leading-relaxed">
              Klik ikon Subtitle (CC) pada bilah kontrol pemutar video, lalu buka tab <strong>Tampilan</strong> untuk mengatur ukuran huruf, warna teks, latar belakang (transparan/lembut/gelap), dan bayangan tepi. Pengaturan tersimpan otomatis di perangkat Anda.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-white">Kenapa beberapa episode bertanda &quot;Belum Tersedia&quot;?</h3>
            <p className="mt-1 text-white/80 leading-relaxed">
              Episode tersebut masih dalam antrean unggah atau pemrosesan subtitle oleh admin dan akan segera tersedia untuk diputar.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-2 rounded-3xl border border-white/10 bg-surface-100/60 p-6 md:p-8 backdrop-blur">
        <h2 className="text-xl font-semibold text-white">Dukungan &amp; Donasi</h2>
        <p className="text-white/80 leading-relaxed">
          Ingin mendukung keberlangsungan Kstream? Kunjungi{' '}
          <a href="https://lynk.id/kawaragi" target="_blank" rel="noopener noreferrer" className="font-semibold text-[#E50914] hover:underline">
            lynk.id/kawaragi
          </a>.
        </p>
      </section>
    </div>
  );
}
