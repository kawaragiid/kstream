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

  // Auto-close both menus on route navigation
  useEffect(() => {
    setMenuOpen(false);
    setMobileNavOpen(false);
  }, [pathname]);

  // Click-away listener for profile dropdown (with passive touchstart)
  useEffect(() => {
    const handleClickAway = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickAway);
    document.addEventListener("touchstart", handleClickAway, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handleClickAway);
      document.removeEventListener("touchstart", handleClickAway);
    };
  }, []);

  // Body scroll lock when mobile drawer is open
  useEffect(() => {
    if (mobileNavOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [mobileNavOpen]);

  // Escape key handler for accessible modal dismissal
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setMobileNavOpen(false);
        setMenuOpen(false);
      }
    };
    if (mobileNavOpen || menuOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [mobileNavOpen, menuOpen]);

  // Auto-close drawer on viewport resize to desktop (>= 1024px)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileNavOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleToggleMobileNav = () => {
    setMobileNavOpen((prev) => {
      const next = !prev;
      if (next) {
        setMenuOpen(false);
      }
      return next;
    });
  };

  const handleToggleProfileMenu = () => {
    setMenuOpen((prev) => {
      const next = !prev;
      if (next) {
        setMobileNavOpen(false);
      }
      return next;
    });
  };

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
      setMobileNavOpen(false);
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
    <header className="sticky top-0 z-40">
      {/* Inner top bar with backdrop-blur */}
      <nav aria-label="Navigasi Utama" className="border-b border-white/5 bg-gradient-to-b from-black/95 to-black/75 backdrop-blur-md">
        <div className="container mx-auto flex items-center gap-2.5 sm:gap-4 md:gap-6 lg:gap-4 xl:gap-8 px-3 sm:px-4 md:px-6 lg:px-5 xl:px-8 py-2.5 sm:py-3.5 md:py-4 text-text-secondary">
          {/* Hamburger button: >= 44x44px touch target */}
          <button
            type="button"
            onClick={handleToggleMobileNav}
            className="inline-flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition hover:bg-white/10 active:scale-95 focus:outline-none focus:ring-2 focus:ring-brand/50 lg:hidden"
            aria-label="Menu navigasi"
            aria-expanded={mobileNavOpen}
            aria-controls="mobile-nav-drawer"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {mobileNavOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>

          {/* Brand Logo */}
          <Link href="/" className="text-brand text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">
            Kstream
          </Link>

          {/* Desktop Navigation Links (Untouched, hidden lg:flex) */}
          <div className="hidden lg:flex items-center gap-4 xl:gap-6 text-sm font-medium whitespace-nowrap">
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

          {/* Right Header Actions */}
          <div className="ml-auto flex items-center gap-2 sm:gap-3 md:gap-4 text-sm">
            {/* Search Link: Circular >= 44x44px hit target on mobile */}
            <Link
              href="/search"
              className="inline-flex h-11 w-11 min-h-[44px] min-w-[44px] sm:h-auto sm:w-auto sm:min-h-0 sm:min-w-0 sm:px-3.5 sm:py-2 items-center justify-center sm:justify-start gap-2 rounded-full border border-white/10 bg-white/10 text-xs md:text-sm font-medium text-text-primary transition hover:bg-white/20 active:scale-95 focus:outline-none focus:ring-2 focus:ring-brand/50"
              aria-label="Cari film atau series"
            >
              <svg className="h-5 w-5 sm:h-4 sm:w-4 text-white/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                  onClick={handleToggleProfileMenu}
                  className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/10 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/20 active:scale-95 focus:outline-none focus:ring-2 focus:ring-brand/50"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  aria-label="Menu profil pengguna"
                >
                  {avatarSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarSrc} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    avatarInitial
                  )}
                </button>
                <div
                  className={`absolute right-0 top-[calc(100%+8px)] w-56 rounded-2xl border border-white/10 bg-surface-100/95 p-3 shadow-2xl backdrop-blur-xl transition-all duration-150 ${
                    menuOpen ? "pointer-events-auto opacity-100 translate-y-0" : "pointer-events-none opacity-0 -translate-y-2"
                  }`}
                  role="menu"
                >
                  <div className="truncate border-b border-white/10 px-2 pb-2.5 text-xs font-semibold text-white/70">
                    {user.displayName || user.email}
                  </div>
                  <nav className="mt-2 flex flex-col gap-1 text-sm text-white/80">
                    <Link href="/profile/history" className="flex min-h-[44px] items-center rounded-lg px-3 py-2.5 transition hover:bg-white/10" role="menuitem">
                      Riwayat Tonton
                    </Link>
                    <Link href="/profile/favorites" className="flex min-h-[44px] items-center rounded-lg px-3 py-2.5 transition hover:bg-white/10" role="menuitem">
                      Favorit Saya
                    </Link>
                    <Link href="/profile/settings" className="flex min-h-[44px] items-center rounded-lg px-3 py-2.5 transition hover:bg-white/10" role="menuitem">
                      Pengaturan Profil
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex min-h-[44px] w-full items-center rounded-lg px-3 py-2.5 text-left text-rose-300 transition hover:bg-rose-500/10"
                      role="menuitem"
                      disabled={signingOut}
                    >
                      {signingOut ? "Keluar..." : "Keluar"}
                    </button>
                  </nav>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-3 text-xs sm:text-sm font-medium">
                <Link
                  href="/login"
                  className="inline-flex min-h-[44px] items-center rounded-full px-2.5 sm:px-3.5 py-2 text-white transition hover:bg-white/10 active:scale-95 focus:outline-none focus:ring-2 focus:ring-white/30"
                >
                  Masuk
                </Link>
                <Link
                  href="/register"
                  className="inline-flex min-h-[44px] items-center rounded-full bg-brand px-3 sm:px-4 py-2 font-semibold text-white shadow-poster transition hover:bg-brand-dark active:scale-95 focus:outline-none focus:ring-2 focus:ring-brand/50"
                >
                  Daftar
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Fixed Slide-Over Drawer Modal (lg:hidden) */}
      {mobileNavOpen && (
        <div
          id="mobile-nav-drawer"
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Menu navigasi"
        >
          {/* Backdrop with blur & click-outside dismiss */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileNavOpen(false)}
            aria-hidden="true"
          />

          {/* Slide-over Drawer Sheet */}
          <aside
            className="relative z-10 flex h-full w-[85vw] max-w-xs flex-col justify-between overflow-y-auto border-r border-white/10 bg-surface-100/98 p-5 text-text-secondary shadow-2xl backdrop-blur-xl sm:p-6"
            style={{
              paddingTop: "max(1.25rem, env(safe-area-inset-top, 0px))",
              paddingBottom: "max(1.25rem, env(safe-area-inset-bottom, 0px))",
            }}
          >
            <div className="space-y-6">
              {/* Drawer Header: Brand & Close Button */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <Link
                  href="/"
                  onClick={() => setMobileNavOpen(false)}
                  className="text-2xl font-bold tracking-tight text-brand"
                >
                  Kstream
                </Link>
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(false)}
                  className="inline-flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition hover:bg-white/10 active:scale-95 focus:outline-none focus:ring-2 focus:ring-brand/50"
                  aria-label="Tutup menu navigasi"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Primary Navigation Links with Active Highlighting */}
              <nav className="flex flex-col gap-1.5 text-base font-medium">
                <Link
                  href="/"
                  onClick={() => setMobileNavOpen(false)}
                  className={`flex min-h-[44px] items-center rounded-xl px-4 py-2.5 transition ${
                    pathname === "/"
                      ? "border-l-2 border-brand bg-brand/15 font-semibold text-brand pl-3.5"
                      : "text-white/80 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  Beranda
                </Link>
                <Link
                  href="/movies/trending"
                  onClick={() => setMobileNavOpen(false)}
                  className={`flex min-h-[44px] items-center rounded-xl px-4 py-2.5 transition ${
                    pathname === "/movies/trending"
                      ? "border-l-2 border-brand bg-brand/15 font-semibold text-brand pl-3.5"
                      : "text-white/80 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  Trending
                </Link>
                <Link
                  href="/movies/new"
                  onClick={() => setMobileNavOpen(false)}
                  className={`flex min-h-[44px] items-center rounded-xl px-4 py-2.5 transition ${
                    pathname === "/movies/new"
                      ? "border-l-2 border-brand bg-brand/15 font-semibold text-brand pl-3.5"
                      : "text-white/80 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  Baru Rilis
                </Link>
              </nav>

              {/* Categories Section with Touch-Friendly Chips & Active State */}
              {categories.length > 0 && (
                <div className="border-t border-white/10 pt-4">
                  <p className="px-1 pb-3 text-xs font-semibold uppercase tracking-widest text-text-muted">
                    Kategori
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((genre) => {
                      const href = `/category/${encodeURIComponent(genre.toLowerCase())}`;
                      const isActive = pathname === href;
                      return (
                        <Link
                          key={genre}
                          href={href}
                          onClick={() => setMobileNavOpen(false)}
                          className={`flex min-h-[38px] items-center rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
                            isActive
                              ? "border-brand bg-brand text-white shadow-sm"
                              : "border-white/10 bg-white/5 text-white/80 hover:border-brand hover:text-white"
                          }`}
                        >
                          {genre}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Drawer Footer: User Profile / Auth Shortcuts */}
            <div className="mt-6 border-t border-white/10 pt-4">
              {user ? (
                <div className="space-y-1.5">
                  <div className="truncate px-2 pb-2 text-xs font-semibold text-white/60">
                    {user.displayName || user.email}
                  </div>
                  <Link
                    href="/profile/history"
                    onClick={() => setMobileNavOpen(false)}
                    className="flex min-h-[44px] items-center rounded-xl px-3.5 py-2.5 text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
                  >
                    Riwayat Tonton
                  </Link>
                  <Link
                    href="/profile/favorites"
                    onClick={() => setMobileNavOpen(false)}
                    className="flex min-h-[44px] items-center rounded-xl px-3.5 py-2.5 text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
                  >
                    Favorit Saya
                  </Link>
                  <Link
                    href="/profile/settings"
                    onClick={() => setMobileNavOpen(false)}
                    className="flex min-h-[44px] items-center rounded-xl px-3.5 py-2.5 text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
                  >
                    Pengaturan Profil
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileNavOpen(false);
                      handleLogout();
                    }}
                    className="flex min-h-[44px] w-full items-center rounded-xl px-3.5 py-2.5 text-left text-sm text-rose-300 transition hover:bg-rose-500/10"
                    disabled={signingOut}
                  >
                    {signingOut ? "Keluar..." : "Keluar"}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5 pt-2">
                  <Link
                    href="/login"
                    onClick={() => setMobileNavOpen(false)}
                    className="flex min-h-[44px] items-center justify-center rounded-xl border border-white/10 bg-white/10 text-sm font-semibold text-white transition hover:bg-white/20 active:scale-95"
                  >
                    Masuk
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileNavOpen(false)}
                    className="flex min-h-[44px] items-center justify-center rounded-xl bg-brand text-sm font-semibold text-white shadow-poster transition hover:bg-brand-dark active:scale-95"
                  >
                    Daftar Sekarang
                  </Link>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
    </header>
  );
}
