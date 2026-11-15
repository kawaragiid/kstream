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
  const [genreMenuOpen, setGenreMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const menuRef = useRef(null);
  const genreRef = useRef(null);
  const genreButtonRef = useRef(null);
  const searchRef = useRef(null);
  const searchInputRef = useRef(null);
  const hamburgerButtonRef = useRef(null);
  const drawerRef = useRef(null);
  const prevMobileNavOpenRef = useRef(false);

  const isHome = pathname === "/";
  const hideChrome = pathname?.startsWith("/player");

  // Track window scroll for Netflix transparent-to-solid header transition
  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 18);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Auto-close menus on route navigation
  useEffect(() => {
    setMenuOpen(false);
    setMobileNavOpen(false);
    setGenreMenuOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  // Focus search input when opened
  useEffect(() => {
    if (searchOpen) {
      const timer = setTimeout(() => searchInputRef.current?.focus(), 40);
      return () => clearTimeout(timer);
    }
  }, [searchOpen]);

  // Click-away listener for dropdowns & search
  useEffect(() => {
    const handleClickAway = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
      if (genreRef.current && !genreRef.current.contains(event.target)) {
        setGenreMenuOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickAway);
    document.addEventListener("touchstart", handleClickAway, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handleClickAway);
      document.removeEventListener("touchstart", handleClickAway, { passive: true });
    };
  }, []);

  // Body scroll lock, focus trap & focus restore for mobile drawer
  useEffect(() => {
    if (mobileNavOpen) {
      prevMobileNavOpenRef.current = true;
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";

      const drawerEl = drawerRef.current;
      const focusableSelector =
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';
      const focusTimer = setTimeout(() => {
        const firstFocusable = drawerEl?.querySelector(focusableSelector);
        firstFocusable?.focus();
      }, 20);

      const handleTrap = (event) => {
        if (event.key !== "Tab" || !drawerEl) return;
        const focusables = Array.from(drawerEl.querySelectorAll(focusableSelector));
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      };

      document.addEventListener("keydown", handleTrap);
      return () => {
        clearTimeout(focusTimer);
        document.removeEventListener("keydown", handleTrap);
        document.body.style.overflow = originalOverflow;
      };
    } else if (prevMobileNavOpenRef.current) {
      prevMobileNavOpenRef.current = false;
      hamburgerButtonRef.current?.focus();
    }
  }, [mobileNavOpen]);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        const wasGenreOpen = genreMenuOpen;
        setMobileNavOpen(false);
        setMenuOpen(false);
        setGenreMenuOpen(false);
        setSearchOpen(false);
        if (wasGenreOpen) {
          genreButtonRef.current?.focus();
        }
      }
    };
    if (mobileNavOpen || menuOpen || genreMenuOpen || searchOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [mobileNavOpen, menuOpen, genreMenuOpen, searchOpen]);

  // Auto-close drawer on viewport resize to desktop
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
        setGenreMenuOpen(false);
      }
      return next;
    });
  };

  const handleToggleProfileMenu = () => {
    setMenuOpen((prev) => {
      const next = !prev;
      if (next) {
        setMobileNavOpen(false);
        setGenreMenuOpen(false);
      }
      return next;
    });
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      router.push("/search");
      setSearchOpen(false);
      return;
    }
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    setSearchOpen(false);
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

  useEffect(() => {
    setAvatarError(false);
  }, [avatarSrc]);

  const handleGenreKeyDown = (event) => {
    if (!genreMenuOpen) {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        setGenreMenuOpen(true);
        setTimeout(() => {
          const items = genreRef.current?.querySelectorAll('[role="menuitem"]');
          if (!items?.length) return;
          if (event.key === "ArrowUp") items[items.length - 1].focus();
          else items[0].focus();
        }, 20);
      }
      return;
    }

    const items = Array.from(genreRef.current?.querySelectorAll('[role="menuitem"]') || []);
    if (!items.length) return;
    const currentIndex = items.indexOf(document.activeElement);

    if (event.key === "ArrowDown") {
      event.preventDefault();
      items[(currentIndex + 1) % items.length].focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      items[(currentIndex - 1 + items.length) % items.length].focus();
    } else if (event.key === "Home") {
      event.preventDefault();
      items[0].focus();
    } else if (event.key === "End") {
      event.preventDefault();
      items[items.length - 1].focus();
    }
  };

  if (hideChrome) {
    return null;
  }

  const headerPositionClass = isHome ? "fixed inset-x-0 top-0 z-40" : "sticky top-0 z-40";
  const headerSurfaceClass =
    scrolled || !isHome
      ? "bg-[#141414]/95 backdrop-blur-md shadow-[0_8px_24px_rgba(0,0,0,0.65)]"
      : "bg-gradient-to-b from-black/85 via-black/45 to-transparent";

  return (
    <header className={`${headerPositionClass} transition-colors duration-300 ${headerSurfaceClass}`}>
      <nav aria-label="Navigasi Utama" className="w-full">
        <div className="mx-auto flex h-14 sm:h-16 max-w-[1600px] items-center gap-3 sm:gap-5 px-3.5 sm:px-6 lg:px-10 text-white/85">
          {/* Tablet Hamburger (HP < md tetap clean tanpa hamburger) */}
          <button
            ref={hamburgerButtonRef}
            type="button"
            onClick={handleToggleMobileNav}
            className="hidden md:inline-flex h-10 w-10 min-h-[44px] min-w-[44px] -ml-1.5 items-center justify-center rounded-md text-white/90 transition hover:bg-white/10 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E50914]/70 lg:hidden"
            aria-label="Menu navigasi"
            aria-expanded={mobileNavOpen}
            aria-controls="mobile-nav-drawer"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              {mobileNavOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>

          {/* Netflix-style Brand Wordmark + Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 select-none shrink-0"
          >
            <img
              src="/logo.png"
              alt="Kstream logo"
              width={32}
              height={32}
              className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.75)]"
            />
            <span className="text-[#E50914] text-xl sm:text-2xl lg:text-[26px] font-black uppercase tracking-[-0.04em] leading-none drop-shadow-[0_2px_8px_rgba(0,0,0,0.75)]">
              KSTREAM
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center gap-5 ml-4 text-[14px] font-normal whitespace-nowrap">
            <Link
              href="/"
              className={`transition-colors duration-150 hover:text-white/75 ${
                pathname === "/" ? "text-white font-semibold" : "text-[#e5e5e5]"
              }`}
            >
              Beranda
            </Link>
            <Link
              href="/movies/trending"
              className={`transition-colors duration-150 hover:text-white/75 ${
                pathname === "/movies/trending" ? "text-white font-semibold" : "text-[#e5e5e5]"
              }`}
            >
              Trending
            </Link>
            <Link
              href="/movies/new"
              className={`transition-colors duration-150 hover:text-white/75 ${
                pathname === "/movies/new" ? "text-white font-semibold" : "text-[#e5e5e5]"
              }`}
            >
              Baru & Populer
            </Link>
            {user && (
              <Link
                href="/profile/favorites"
                className={`transition-colors duration-150 hover:text-white/75 ${
                  pathname === "/profile/favorites" ? "text-white font-semibold" : "text-[#e5e5e5]"
                }`}
              >
                Daftar Saya
              </Link>
            )}

            <Link
              href="/premium/upgrade"
              className={`transition-colors duration-150 hover:text-[#ff4b55] ${
                pathname === "/premium/upgrade" ? "text-white font-semibold" : "text-[#E50914] font-semibold"
              }`}
            >
              Donasi
            </Link>

            {/* Netflix-style Genre / Kategori Dropdown */}
            {categories.length > 0 && (
              <div className="relative" ref={genreRef} onKeyDown={handleGenreKeyDown}>
                <button
                  ref={genreButtonRef}
                  type="button"
                  onClick={() => setGenreMenuOpen((prev) => !prev)}
                  className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[#e5e5e5] transition-colors duration-150 hover:text-white/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                  aria-expanded={genreMenuOpen}
                  aria-haspopup="menu"
                  aria-controls="desktop-genre-menu"
                >
                  <span>Kategori</span>
                  <svg
                    className={`h-3.5 w-3.5 transition-transform duration-150 ${genreMenuOpen ? "rotate-180" : ""}`}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
                {genreMenuOpen && (
                  <div
                    id="desktop-genre-menu"
                    role="menu"
                    className="absolute left-0 top-[calc(100%+12px)] max-h-[70vh] w-64 overflow-y-auto rounded-md border border-white/15 bg-black/95 p-3 shadow-2xl backdrop-blur-xl"
                  >
                    <div className="grid grid-cols-2 gap-1.5 text-[13px]">
                      {categories.map((genre) => {
                        const href = `/category/${encodeURIComponent(genre.toLowerCase())}`;
                        return (
                          <Link
                            key={genre}
                            href={href}
                            role="menuitem"
                            onClick={() => setGenreMenuOpen(false)}
                            className={`rounded px-2.5 py-1.5 transition hover:bg-white/10 hover:text-white ${
                              pathname === href ? "font-semibold text-white bg-white/10" : "text-white/80"
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
            )}
          </div>

          {/* Right Header Actions */}
          <div className="ml-auto flex items-center gap-2 sm:gap-4 text-sm">
            {/* Mobile Direct Search Link (< sm) so inline input never squeezes the header */}
            <Link
              href="/search"
              className="inline-flex h-10 w-10 min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-white transition hover:text-white/75 active:scale-95 focus:outline-none focus:ring-2 focus:ring-white/30 sm:hidden"
              aria-label="Cari film atau series"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <circle cx="11" cy="11" r="7" />
                <path strokeLinecap="round" d="M20 20l-3.5-3.5" />
              </svg>
            </Link>

            {/* Netflix Inline Expandable Search (sm+) */}
            <div ref={searchRef} className="relative hidden sm:flex items-center">
              {searchOpen ? (
                <form
                  onSubmit={handleSearchSubmit}
                  className="flex items-center rounded-md border border-white/85 bg-black/85 px-2.5 py-1 transition-all duration-200 w-56 md:w-64"
                >
                  <button
                    type="submit"
                    className="mr-2 rounded text-white/90 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                    aria-label="Jalankan pencarian"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <circle cx="11" cy="11" r="7" />
                      <path strokeLinecap="round" d="M20 20l-3.5-3.5" />
                    </svg>
                  </button>
                  <input
                    ref={searchInputRef}
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Judul, genre..."
                    className="w-full bg-transparent text-xs sm:text-sm text-white placeholder:text-white/50 focus:outline-none"
                    aria-label="Cari film atau serial"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        searchInputRef.current?.focus();
                      }}
                      className="ml-1 text-white/60 hover:text-white"
                      aria-label="Bersihkan pencarian"
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setSearchOpen(true)}
                  className="inline-flex h-10 w-10 min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-white transition hover:text-white/75 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                  aria-label="Cari film atau series"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <circle cx="11" cy="11" r="7" />
                    <path strokeLinecap="round" d="M20 20l-3.5-3.5" />
                  </svg>
                </button>
              )}
            </div>

            {/* Auth / Netflix Square Profile Avatar */}
            {loading ? (
              <div className="h-8 w-8 rounded-[4px] bg-white/10 animate-pulse" />
            ) : user ? (
              <div className="relative flex items-center" ref={menuRef}>
                <button
                  type="button"
                  onClick={handleToggleProfileMenu}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-md px-1 text-white transition hover:opacity-90 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  aria-controls="desktop-profile-menu"
                  aria-label="Menu profil pengguna"
                >
                  <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-[4px] bg-gradient-to-br from-[#E50914] to-[#991b1b] text-xs font-bold text-white ring-1 ring-white/15">
                    {avatarSrc && !avatarError ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={avatarSrc}
                        alt="Avatar"
                        width={32}
                        height={32}
                        onError={() => setAvatarError(true)}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      avatarInitial
                    )}
                  </span>
                  <svg
                    className={`hidden sm:block h-3.5 w-3.5 text-white transition-transform duration-200 ${
                      menuOpen ? "rotate-180" : ""
                    }`}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>

                {menuOpen && (
                <div
                  id="desktop-profile-menu"
                  className="absolute right-0 top-[calc(100%+8px)] w-52 rounded-md border border-white/15 bg-black/95 py-2 shadow-2xl backdrop-blur-xl"
                  role="menu"
                >
                  <div className="truncate border-b border-white/15 px-4 pb-2.5 pt-1 text-xs font-semibold text-white/75">
                    {user.displayName || user.email}
                  </div>
                  <nav className="mt-1.5 flex flex-col text-[13px] text-white/85">
                    <Link
                      href="/profile/history"
                      className="flex min-h-[40px] items-center px-4 py-2 transition hover:bg-white/10 hover:text-white"
                      role="menuitem"
                    >
                      Riwayat Tonton
                    </Link>
                    <Link
                      href="/profile/favorites"
                      className="flex min-h-[40px] items-center px-4 py-2 transition hover:bg-white/10 hover:text-white"
                      role="menuitem"
                    >
                      Daftar Saya
                    </Link>
                    <Link
                      href="/profile/settings"
                      className="flex min-h-[40px] items-center px-4 py-2 transition hover:bg-white/10 hover:text-white"
                      role="menuitem"
                    >
                      Pengaturan Profil
                    </Link>
                    <div className="my-1 border-t border-white/15" />
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex min-h-[40px] w-full items-center px-4 py-2 text-left text-white/80 transition hover:bg-white/10 hover:text-white"
                      role="menuitem"
                      disabled={signingOut}
                    >
                      {signingOut ? "Keluar..." : "Keluar dari Kstream"}
                    </button>
                  </nav>
                </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold">
                <Link
                  href="/register"
                  className="hidden sm:inline-flex min-h-[36px] items-center rounded-[4px] border border-white/25 px-3 py-1.5 text-white transition hover:border-white/60 hover:bg-white/10"
                >
                  Daftar
                </Link>
                <Link
                  href="/login"
                  className="inline-flex min-h-[36px] items-center rounded-[4px] bg-[#E50914] px-3.5 py-1.5 text-white shadow transition hover:bg-[#f6121d] active:scale-95"
                >
                  Masuk
                </Link>
              </div>
            )}
          </div>
        </div>

      </nav>

      {/* Fixed Slide-Over Drawer Modal (tablet md..lg only; hidden on HP < md) */}
      {mobileNavOpen && (
        <div
          id="mobile-nav-drawer"
          className="fixed inset-0 z-50 hidden md:block lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Menu navigasi"
        >
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileNavOpen(false)}
            aria-hidden="true"
          />

          <aside
            ref={drawerRef}
            className="relative z-10 flex h-full w-[82vw] max-w-xs flex-col justify-between overflow-y-auto overscroll-contain border-r border-white/10 bg-[#141414]/98 p-5 text-white/85 shadow-2xl backdrop-blur-xl sm:p-6"
            style={{
              paddingTop: "max(1.25rem, env(safe-area-inset-top, 0px))",
              paddingBottom: "max(1.25rem, env(safe-area-inset-bottom, 0px))",
            }}
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <Link
                  href="/"
                  onClick={() => setMobileNavOpen(false)}
                  className="text-2xl font-black uppercase tracking-[-0.04em] text-[#E50914]"
                >
                  KSTREAM
                </Link>
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(false)}
                  className="inline-flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-white/10 bg-white/5 text-white transition hover:bg-white/10 active:scale-95"
                  aria-label="Tutup menu navigasi"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <nav className="flex flex-col gap-1 text-base font-medium">
                <Link
                  href="/"
                  onClick={() => setMobileNavOpen(false)}
                  className={`flex min-h-[44px] items-center rounded-md px-3.5 py-2.5 transition ${
                    pathname === "/"
                      ? "border-l-[3px] border-[#E50914] bg-white/10 font-semibold text-white pl-3"
                      : "text-white/80 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  Beranda
                </Link>
                <Link
                  href="/movies/trending"
                  onClick={() => setMobileNavOpen(false)}
                  className={`flex min-h-[44px] items-center rounded-md px-3.5 py-2.5 transition ${
                    pathname === "/movies/trending"
                      ? "border-l-[3px] border-[#E50914] bg-white/10 font-semibold text-white pl-3"
                      : "text-white/80 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  Trending
                </Link>
                <Link
                  href="/movies/new"
                  onClick={() => setMobileNavOpen(false)}
                  className={`flex min-h-[44px] items-center rounded-md px-3.5 py-2.5 transition ${
                    pathname === "/movies/new"
                      ? "border-l-[3px] border-[#E50914] bg-white/10 font-semibold text-white pl-3"
                      : "text-white/80 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  Baru & Populer
                </Link>
                {user && (
                  <Link
                    href="/profile/favorites"
                    onClick={() => setMobileNavOpen(false)}
                    className={`flex min-h-[44px] items-center rounded-md px-3.5 py-2.5 transition ${
                      pathname === "/profile/favorites"
                        ? "border-l-[3px] border-[#E50914] bg-white/10 font-semibold text-white pl-3"
                        : "text-white/80 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    Daftar Saya
                  </Link>
                )}
                <Link
                  href="/premium/upgrade"
                  onClick={() => setMobileNavOpen(false)}
                  className={`flex min-h-[44px] items-center rounded-md px-3.5 py-2.5 transition ${
                    pathname === "/premium/upgrade"
                      ? "border-l-[3px] border-[#E50914] bg-white/10 font-semibold text-white pl-3"
                      : "text-[#E50914] hover:bg-white/10 font-semibold"
                  }`}
                >
                  Donasi
                </Link>
              </nav>

              {categories.length > 0 && (
                <div className="border-t border-white/10 pt-4">
                  <p className="px-1 pb-3 text-xs font-semibold uppercase tracking-widest text-white/50">
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
                              ? "border-[#E50914] bg-[#E50914] text-white"
                              : "border-white/15 bg-white/5 text-white/80 hover:border-white/40 hover:text-white"
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

            <div className="mt-6 border-t border-white/10 pt-4">
              {user ? (
                <div className="space-y-1">
                  <div className="truncate px-2 pb-2 text-xs font-semibold text-white/55">
                    {user.displayName || user.email}
                  </div>
                  <Link
                    href="/profile/history"
                    onClick={() => setMobileNavOpen(false)}
                    className="flex min-h-[44px] items-center rounded-md px-3.5 py-2.5 text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
                  >
                    Riwayat Tonton
                  </Link>
                  <Link
                    href="/profile/favorites"
                    onClick={() => setMobileNavOpen(false)}
                    className="flex min-h-[44px] items-center rounded-md px-3.5 py-2.5 text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
                  >
                    Daftar Saya
                  </Link>
                  <Link
                    href="/profile/settings"
                    onClick={() => setMobileNavOpen(false)}
                    className="flex min-h-[44px] items-center rounded-md px-3.5 py-2.5 text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
                  >
                    Kelola Profil
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileNavOpen(false);
                      handleLogout();
                    }}
                    className="flex min-h-[44px] w-full items-center rounded-md px-3.5 py-2.5 text-left text-sm text-rose-300 transition hover:bg-rose-500/10"
                    disabled={signingOut}
                  >
                    {signingOut ? "Keluar..." : "Keluar dari Kstream"}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5 pt-2">
                  <Link
                    href="/login"
                    onClick={() => setMobileNavOpen(false)}
                    className="flex min-h-[44px] items-center justify-center rounded-[4px] bg-[#E50914] text-sm font-semibold text-white transition hover:bg-[#f6121d] active:scale-95"
                  >
                    Masuk
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileNavOpen(false)}
                    className="flex min-h-[44px] items-center justify-center rounded-[4px] border border-white/20 bg-white/5 text-sm font-semibold text-white transition hover:bg-white/15 active:scale-95"
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
