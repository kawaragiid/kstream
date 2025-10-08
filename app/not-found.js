export default function NotFound() {
  return (
    <div className="container mx-auto px-4 py-24 text-center">
      <h2 className="text-3xl font-bold">Halaman tidak ditemukan</h2>
      <p className="text-gray-500 mt-2">Coba kembali ke beranda.</p>
      <a href="/" className="mt-6 inline-flex rounded bg-brand px-4 py-2 text-white">Kembali ke beranda</a>
    </div>
  );
}
