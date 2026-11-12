"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logout } from "../lib/auth";
import { useAuth } from "../hooks/useAuth";

export default function Navbar({ categories = [] }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const menuRef = useRef(null);

  const hideChrome = pathname?.startsWith("/profile/settings") || pathname?.startsWith("/player");

  useEffect(() => {
    setMenuOpen(false);
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleClickAway = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickAway);
    return () => document.removeEventListener("mousedown", handleClickAway);
  }, []);

  const handleLogout = async () => {
    try {
      setSigningOut(true);
      await logout();
      router.push("/");
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setSigningOut(false);
      setMenuOpen(false);
    }
  };

  const avatarInitial = useMemo(() => {
    if (!user) return "K";
    const source = user.displayName || user.email || "K";
    return source.charAt(0)?.toUpperCase?.() || "K";
  }, [user]);

  const avatarSrc = user?.photoURL || user?.photoUrl;

  if (hideChrome) {
    return null;
  }

  return (
    <nav className="sticky top-0 z-40 border-b border-white/5 bg-gradient-to-b from-black/95 to-black/75 backdrop-blur-md">
      <div className="container mx-auto flex items-center gap-4 md:gap-8 px-4 md:px-6 lg:px-8 py-3.5 md:py-4 text-text-secondary">
        <button
          type="button"
          onClick={() => setMobileNavOpen((prev) => !prev)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition hover:bg-white/10 lg:hidden"
          aria-label="Menu navigasi"
          aria-expanded={mobileNavOpen}
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {mobileNavOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>

        <Link href="/" className="text-brand text-2xl md:text-3xl font-bold tracking-tight">
          Kstream
        </Link>

        <div className="hidden lg:flex items-center gap-6 text-sm font-medium">
          <Link href="/" className={`transition hover:text-text-primary ${pathname === "/" ? "text-white font-semibold" : ""}`}>
            Beranda
          </Link>
          <Link
            href="/movies/trending"
            className={`transition hover:text-text-primary ${pathname === "/movies/trending" ? "text-white font-semibold" : ""}`}
          >
            Trending
          </Link>
          <Link
            href="/movies/new"
            className={`transition hover:text-text-primary ${pathname === "/movies/new" ? "text-white font-semibold" : ""}`}
          >
            Baru Rilis
          </Link>
          {categories.slice(0, 5).map((genre) => {
            const href = `/category/${encodeURIComponent(genre.toLowerCase())}`;
            return (
              <Link
                key={genre}
                href={href}
                className={`transition hover:text-text-primary ${pathname === href ? "text-white font-semibold" : ""}`}
              >
                {genre}
              </Link>
            );
          })}
        </div>

        <div className="ml-auto flex items-center gap-3 md:gap-4 text-sm">
          <Link
            href="/search"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3.5 py-1.5 text-xs md:text-sm font-medium text-text-primary transition hover:bg-white/20"
            aria-label="Cari film atau series"
          >
            <svg className="h-4 w-4 text-white/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path strokeLinecap="round" d="M20 20l-3.5-3.5" />
            </svg>
            <span className="hidden sm:inline">Cari</span>
          </Link>

          {loading ? (
            <span className="text-xs text-text-muted">Memuat...</span>
          ) : user ? (
            <div className="relative flex items-center" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/10 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/20"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                {avatarSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarSrc} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  avatarInitial
                )}
              </button>
              <div
                className={`absolute right-0 top-12 w-56 rounded-2xl border border-white/10 bg-surface-100/95 p-3 shadow-2xl backdrop-blur-xl transition-all duration-150 ${
                  menuOpen ? "pointer-events-auto opacity-100 translate-y-0" : "pointer-events-none opacity-0 -translate-y-2"
                }`}
                role="menu"
              >
                <div className="truncate border-b border-white/10 px-2 pb-2.5 text-xs font-semibold text-white/70">
                  {user.displayName || user.email}
                </div>
                <nav className="mt-2 flex flex-col gap-1 text-sm text-white/80">
                  <Link href="/profile/history" className="rounded-lg px-2.5 py-2 transition hover:bg-white/10" role="menuitem">
                    Riwayat Tonton
                  </Link>
                  <Link href="/profile/favorites" className="rounded-lg px-2.5 py-2 transition hover:bg-white/10" role="menuitem">
                    Favorit Saya
                  </Link>
                  <Link href="/profile/settings" className="rounded-lg px-2.5 py-2 transition hover:bg-white/10" role="menuitem">
                    Pengaturan Profil
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="rounded-lg px-2.5 py-2 text-left text-rose-300 transition hover:bg-rose-500/10"
                    role="menuitem"
                    disabled={signingOut}
                  >
                    {signingOut ? "Keluar..." : "Keluar"}
                  </button>
                </nav>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm font-medium">
              <Link href="/login" className="rounded-full px-3 py-1.5 text-white transition hover:bg-white/10">
                Masuk
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-brand px-3.5 py-1.5 font-semibold text-white shadow-poster transition hover:bg-brand-dark"
              >
                Daftar
              </Link>
            </div>
          )}
        </div>
      </div>

      {mobileNavOpen && (
        <div className="border-t border-white/10 bg-black/95 px-4 py-4 lg:hidden">
          <div className="flex flex-col gap-2 text-sm font-medium text-text-secondary">
            <Link href="/" className="rounded-xl px-3 py-2 transition hover:bg-white/10 hover:text-white">
              Beranda
            </Link>
            <Link href="/movies/trending" className="rounded-xl px-3 py-2 transition hover:bg-white/10 hover:text-white">
              Trending
            </Link>
            <Link href="/movies/new" className="rounded-xl px-3 py-2 transition hover:bg-white/10 hover:text-white">
              Baru Rilis
            </Link>
            {categories.length > 0 && (
              <div className="mt-2 border-t border-white/10 pt-3">
                <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-widest text-text-muted">Kategori</p>
                <div className="flex flex-wrap gap-2 px-2">
                  {categories.map((genre) => (
                    <Link
                      key={genre}
                      href={`/category/${encodeURIComponent(genre.toLowerCase())}`}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80 transition hover:border-brand hover:text-white"
                    >
                      {genre}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
