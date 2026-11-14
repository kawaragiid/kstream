"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { label: "Ketentuan", href: "/terms" },
  { label: "Privasi", href: "/privacy" },
  { label: "Tentang", href: "/about" },
  { label: "Bantuan", href: "/help" },
  { label: "Donasi", href: "/premium/upgrade" },
];

export default function Footer() {
  const pathname = usePathname();
  const hideFooter = pathname?.startsWith("/player");

  const currentYear = useMemo(() => new Date().getFullYear(), []);

  if (hideFooter) {
    return null;
  }

  return (
    <footer
      className="mt-16 border-t border-white/10 bg-[#141414]"
      style={{
        paddingBottom: "max(2rem, env(safe-area-inset-bottom, 0px))",
      }}
    >
      <div className="mx-auto w-full max-w-5xl px-6 py-10 text-xs text-white/50">
        <p className="mb-6 text-sm text-white/60">Ada pertanyaan? Hubungi tim Kstream melalui halaman Bantuan.</p>
        <nav className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {links.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="inline-flex min-h-[36px] items-center text-white/55 underline-offset-4 transition hover:text-white hover:underline"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-t border-white/10 pt-6">
          <span className="text-xs font-semibold tracking-wider text-[#E50914]">KSTREAM</span>
          <p className="text-xs text-white/45">&copy; {currentYear} Kstream by Keigo</p>
        </div>
      </div>
    </footer>
  );
}
