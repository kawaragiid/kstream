"use client";

import { useMemo } from "react";
import Link from "next/link";
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
    <footer
      className="mt-16 border-t border-white/10 bg-black/80"
      style={{
        paddingBottom: "max(1.5rem, env(safe-area-inset-bottom, 0px))",
      }}
    >
      <div className="container mx-auto px-4 py-8 sm:py-10 text-sm text-text-muted">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <p className="text-text-secondary">&copy; {currentYear} Kstream by Keigo</p>
          <nav className="flex flex-wrap items-center justify-center sm:justify-end gap-2 sm:gap-4">
            {links.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="inline-flex min-h-[44px] items-center px-3 py-2.5 rounded-lg text-text-muted transition hover:text-text-primary hover:bg-white/5"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
