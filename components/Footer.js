"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";

const links = [
  { label: "Ketentuan", href: "/terms" },
  { label: "Privasi", href: "/privacy" },
  { label: "Tentang", href: "/about" },
  { label: "Bantuan", href: "/help" },
];

export default function Footer() {
  const pathname = usePathname();
  const hideFooter = pathname?.startsWith("/player");

  const currentYear = useMemo(() => new Date().getFullYear(), []);

  if (hideFooter) {
    return null;
  }

  return (
    <footer className="mt-16 border-t border-white/10 bg-black/80">
      <div className="container mx-auto px-4 py-10 text-sm text-text-muted">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-text-secondary">&copy; {currentYear} Kstream by Keigo</p>
          <nav className="flex flex-wrap gap-4">
            {links.map((link) => (
              <a key={link.label} href={link.href} className="transition hover:text-text-primary">
                {link.label}
              </a>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}

