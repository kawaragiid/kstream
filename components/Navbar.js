"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logout } from "../lib/auth";
import { useAuth } from "../hooks/useAuth";
import { useMediaOverlay } from "./MediaOverlayProvider";
import KLogoBadge from "./KLogoBadge";

export default function Navbar({ categories = [] }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const { openMedia } = useMediaOverlay();
  const [signingOut, setSigningOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [genreMenuOpen, setGenreMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const menuRef = useRef(null);
  const genreRef = useRef(null);
  const genreButtonRef = useRef(null);
  const searchRef = useRef(null);
  const searchOverlayRef = useRef(null);
  const searchInputRef = useRef(null);

  const isHome = pathname === "/";
  const hideChrome = pathname?.startsWith("/player");
  const hasSearchQuery = searchQuery.trim().length > 0;
  const showSearchOverlay = searchOpen && hasSearchQuery;

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

  // Netflix-style live search (debounced) without navigating away
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!searchOpen || !trimmed) {
      setSearchResults([]);
      setSearchLoading(false);
      setSearchError("");
      return undefined;
    }

    const controller = new AbortController();
    setSearchLoading(true);
    setSearchError("");

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        setSearchResults(Array.isArray(data?.items) ? data.items : []);
      } catch (err) {
        if (err?.name !== "AbortError") {
          setSearchError("Gagal memuat hasil pencarian.");
          setSearchResults([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setSearchLoading(false);
        }
      }
    }, 220);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchOpen, searchQuery]);

  // Lock body scroll when live search overlay is open
  useEffect(() => {
    if (!showSearchOverlay) return undefined;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [showSearchOverlay]);

  // Click-away listener for dropdowns & search
  useEffect(() => {
    const handleClickAway = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
      if (genreRef.current && !genreRef.current.contains(event.target)) {
        setGenreMenuOpen(false);
      }
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target) &&
        !(searchOverlayRef.current && searchOverlayRef.current.contains(event.target))
      ) {
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

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        const wasGenreOpen = genreMenuOpen;
        setMenuOpen(false);
        setGenreMenuOpen(false);
        setSearchOpen(false);
        if (wasGenreOpen) {
          genreButtonRef.current?.focus();
        }
      }
    };
    if (menuOpen || genreMenuOpen || searchOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [menuOpen, genreMenuOpen, searchOpen]);

  const handleToggleProfileMenu = () => {
    setMenuOpen((prev) => {
      const next = !prev;
      if (next) {
        setGenreMenuOpen(false);
        setSearchOpen(false);
      }
      return next;
    });
  };

  const handleOpenSearch = () => {
    setMenuOpen(false);
    setGenreMenuOpen(false);
    setSearchOpen(true);
  };

  const handleCloseSearch = () => {
    setSearchOpen(false);
    setSearchQuery("");
    setSearchResults([]);
    setSearchError("");
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    searchInputRef.current?.focus();
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
    scrolled || !isHome || showSearchOverlay
      ? "bg-[#141414]/95 backdrop-blur-md shadow-[0_8px_24px_rgba(0,0,0,0.65)]"
      : "bg-gradient-to-b from-black/85 via-black/45 to-transparent";

  return (
    <>
      <header className={`${headerPositionClass} transition-colors duration-300 ${headerSurfaceClass}`}>
        <nav aria-label="Navigasi Utama" className="w-full">
          <div className="mx-auto flex h-14 sm:h-16 max-w-[1600px] items-center gap-3 sm:gap-5 px-3.5 sm:px-6 lg:px-10 text-white/85">
            {/* Netflix-style Brand Wordmark + Logo (disembunyikan sementara di HP saat input search terbuka agar lega) */}
            <Link
              href="/"
              className={`${searchOpen ? "hidden sm:flex" : "flex"} items-center gap-2 select-none shrink-0`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
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

            {/* Desktop Navigation Links (hanya tampil jika layar muat: lg+) */}
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

            {/* Right Header Actions: Search (inline Netflix-style) + Profile */}
            <div className="ml-auto flex flex-1 sm:flex-initial items-center justify-end gap-2 sm:gap-4 text-sm">
              {/* Netflix Inline Expandable Search (semua ukuran layar) */}
              <div ref={searchRef} className={`relative flex items-center ${searchOpen ? "flex-1 sm:flex-initial" : ""}`}>
                {searchOpen ? (
                  <form
                    onSubmit={handleSearchSubmit}
                    className="flex w-full sm:w-64 md:w-72 items-center rounded-md border border-white/85 bg-black/85 px-2.5 py-1.5 transition-all duration-200"
                  >
                    <svg className="mr-2 h-4 w-4 shrink-0 text-white/90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <circle cx="11" cy="11" r="7" />
                      <path strokeLinecap="round" d="M20 20l-3.5-3.5" />
                    </svg>
                    <input
                      ref={searchInputRef}
                      type="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Judul, genre, serial..."
                      className="w-full bg-transparent text-xs sm:text-sm text-white placeholder:text-white/50 focus:outline-none"
                      aria-label="Cari film atau serial"
                    />
                    <button
                      type="button"
                      onClick={handleCloseSearch}
                      className="ml-1.5 rounded p-0.5 text-white/70 hover:text-white"
                      aria-label="Tutup pencarian"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={handleOpenSearch}
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
                <div className="h-8 w-8 shrink-0 rounded-[4px] bg-white/10 animate-pulse" />
              ) : user ? (
                <div className="relative flex shrink-0 items-center" ref={menuRef}>
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
                <div className="flex shrink-0 items-center gap-2 text-xs sm:text-sm font-semibold">
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
      </header>

      {/* Netflix-style Live Search Results Overlay (tanpa pindah tab/halaman) */}
      {showSearchOverlay && (
        <div
          ref={searchOverlayRef}
          role="dialog"
          aria-label="Hasil pencarian langsung"
          className="fixed inset-x-0 top-14 sm:top-16 bottom-0 z-40 overflow-y-auto bg-[#141414]/95 px-4 py-6 sm:px-8 lg:px-12 backdrop-blur-xl"
        >
          <div className="mx-auto max-w-[1600px] space-y-5">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
              <p className="text-sm sm:text-base text-white/75">
                Hasil untuk{" "}
                <span className="font-semibold text-white">&ldquo;{searchQuery.trim()}&rdquo;</span>
              </p>
              <button
                type="button"
                onClick={handleCloseSearch}
                className="rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/85 transition hover:bg-white/15 hover:text-white"
              >
                Tutup
              </button>
            </div>

            {searchLoading ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 sm:gap-4">
                {Array.from({ length: 12 }).map((_, idx) => (
                  <div key={idx} className="aspect-video rounded-[4px] bg-white/10 animate-pulse" />
                ))}
              </div>
            ) : searchError ? (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-6 text-center text-sm text-red-200">
                {searchError}
              </div>
            ) : searchResults.length === 0 ? (
              <div className="py-16 text-center space-y-2">
                <p className="text-base font-semibold text-white">
                  Tidak ada tayangan yang cocok dengan &ldquo;{searchQuery.trim()}&rdquo;
                </p>
                <p className="text-xs sm:text-sm text-white/55">
                  Coba kata kunci lain, judul film, atau nama genre.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 sm:gap-4">
                {searchResults.map((item) => {
                  const thumb = item?.backdropUrl || item?.posterUrl || item?.thumbnailUrl || "";
                  return (
                    <button
                      key={`${item?.type || "movie"}-${item?.id}`}
                      type="button"
                      onClick={() => {
                        setSearchOpen(false);
                        openMedia(item, { origin: "search" });
                      }}
                      className="group relative aspect-video overflow-hidden rounded-[4px] bg-[#1f1f1f] text-left shadow-md ring-1 ring-white/10 transition duration-200 hover:scale-[1.03] hover:ring-white/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E50914]"
                    >
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumb}
                          alt={item?.title || "Poster"}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center p-2 text-center text-xs font-semibold text-white/70">
                          {item?.title}
                        </div>
                      )}
                      <KLogoBadge size="xs" />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/55 to-transparent px-2.5 pb-2 pt-6">
                        <p className="truncate text-xs sm:text-[13px] font-semibold text-white">
                          {item?.title}
                        </p>
                        <p className="truncate text-[10px] text-white/65">
                          {item?.type === "series" ? "Serial" : "Film"}
                          {item?.releaseYear ? ` • ${item.releaseYear}` : ""}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
