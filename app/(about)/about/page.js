export const metadata = { title: 'Tentang Kstream' };

export default function AboutPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-12 space-y-6">
      <h1 className="text-3xl font-bold text-white">Tentang Kstream</h1>
      <div className="space-y-4 rounded-3xl border border-white/10 bg-surface-100/60 p-6 md:p-8 backdrop-blur">
        <p className="text-white/80 leading-relaxed">
          Kstream adalah platform streaming gratis yang menghadirkan film, serial, dan anime terbaik untuk Anda. Kami berkomitmen membangun pengalaman menonton yang nyaman, cepat, dan menyenangkan layaknya layanan streaming terkemuka.
        </p>
        <p className="text-white/80 leading-relaxed">
          Melalui Kstream, Anda dapat menikmati berbagai film dan serial favorit dengan mudah dan tanpa batasan region. Kami menyediakan layanan streaming tanpa biaya langganan, sehingga Anda bebas menonton kapan saja dan di mana saja.
        </p>
        <p className="text-white/80 leading-relaxed">
          Dukungan Anda sangat berarti bagi kami. Jika Anda tertarik untuk bergabung sebagai fansubber atau ingin berkontribusi dalam komunitas Kstream, silakan hubungi Admin. Bersama Kstream, mari ciptakan pengalaman menonton yang lebih seru dan berkualitas.
        </p>
      </div>
    </div>
  );
}
