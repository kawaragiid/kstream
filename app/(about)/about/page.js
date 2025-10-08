export const metadata = { title: 'Tentang Kstream' };

export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-10 space-y-4">
      <h1 className="text-3xl font-semibold">Tentang Kstream</h1>
      <p className="text-gray-600 max-w-2xl">
        Kstream adalah platform streaming yang menghadirkan film, series, dan konten premium terbaik.
        Bangun pengalaman seperti Netflix dengan integrasi Firebase untuk autentikasi dan Firestore untuk katalog konten.
      </p>
      <p className="text-gray-600 max-w-2xl">
        Dashboard admin dapat mengunggah konten melalui Mux, sedangkan pengguna dapat menonton, menyimpan favorit,
        dan melanjutkan tontonan di berbagai perangkat.
      </p>
    </div>
  );
}

