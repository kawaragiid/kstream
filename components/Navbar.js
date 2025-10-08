"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { isPremium, logout } from '../lib/auth';
import { useAuth } from '../hooks/useAuth';

export default function Navbar({ categories = [] }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [isPremiumUser, setIsPremiumUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const hideChrome = pathname?.startsWith('/profile/settings') || pathname?.startsWith('/player');

  useEffect(() => {
    if (!user) {
      setIsPremiumUser(null);
      return;
    }
    let active = true;
    isPremium(user)
      .then((value) => {
        if (active) setIsPremiumUser(Boolean(value));
      })
      .catch(() => {
        if (active) setIsPremiumUser(false);
      });
    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleClickAway = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickAway);
    return () => document.removeEventListener('mousedown', handleClickAway);
  }, []);

  const handleLogout = async () => {
    try {
      setSigningOut(true);
      await logout();
      router.push('/');
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setSigningOut(false);
      setMenuOpen(false);
    }
  };

  const avatarInitial = useMemo(() => {
    if (!user) return 'K';
    const source = user.displayName || user.email || 'K';
    return source.charAt(0)?.toUpperCase?.() || 'K';
  }, [user?.displayName, user?.email]);

  const avatarSrc = user?.photoURL || user?.photoUrl;

  if (hideChrome) {
    return null;
  }

  const showSubscribeButton = !loading && ((user && isPremiumUser === false) || !user);
  const showPremiumBadge = !loading && user && isPremiumUser === true;

  return (
    <nav className="sticky top-0 z-40 bg-gradient-to-b from-black/90 to-black/40 backdrop-blur">
      <div className="container mx-auto flex items-center gap-6 px-4 py-4 text-text-secondary">
        <Link href="/" className="text-2xl font-semibold tracking-tight text-text-primary">
          Kstream
        </Link>
        <div className="hidden lg:flex items-center gap-4 text-sm uppercase tracking-wide">
          <Link href="/" className="transition hover:text-text-primary">Beranda</Link>
          <Link href="/movies/trending" className="transition hover:text-text-primary">Trending</Link>
          <Link href="/movies/new" className="transition hover:text-text-primary">Baru</Link>
          {categories.slice(0, 5).map((genre) => (
            <Link key={genre} href={`/category/${encodeURIComponent(genre.toLowerCase())}`} className="transition hover:text-text-primary">
              {genre}
            </Link>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-4 text-sm">
          <Link href="/search" className="hidden sm:inline-flex items-center rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-text-primary transition hover:bg-white/20">
            Cari
          </Link>
          {showSubscribeButton ? (
            <Link
              href="/premium/upgrade"
              className="hidden md:inline-flex rounded-full bg-brand px-4 py-1.5 text-xs font-semibold text-white shadow-poster transition hover:bg-brand-dark"
            >
              Langganan
            </Link>
          ) : null}
          {showPremiumBadge ? (
            <span className="hidden md:inline-flex rounded-full border border-emerald-400 px-4 py-1.5 text-xs font-semibold text-emerald-300">
              Premium
            </span>
          ) : null}
          {loading ? (
            <span className="text-text-muted">Memuat...</span>
          ) : user ? (
            <div className="flex items-center gap-3" ref={menuRef}>
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
                className={`absolute right-4 top-[4.5rem] w-56 rounded-2xl border border-white/10 bg-black/90 p-3 shadow-2xl transition-all duration-150 ${
                  menuOpen ? 'pointer-events-auto opacity-100 translate-y-0' : 'pointer-events-none opacity-0 -translate-y-2'
                }`}
                role="menu"
              >
                <div className="px-2 pb-2 text-xs font-semibold uppercase tracking-widest text-white/50">
                  {user.displayName || user.email}
                </div>
                <nav className="flex flex-col gap-1 text-sm text-white/80">
                  <Link href="/profile/history" className="rounded-lg px-2 py-2 transition hover:bg-white/10" role="menuitem">
                    Riwayat
                  </Link>
                  <Link href="/profile/favorites" className="rounded-lg px-2 py-2 transition hover:bg-white/10" role="menuitem">
                    Favorit
                  </Link>
                  <Link href="/profile/settings" className="rounded-lg px-2 py-2 transition hover:bg-white/10" role="menuitem">
                    Pengaturan
                  </Link>
                  {isPremiumUser ? (
                    <span className="rounded-lg px-2 py-2 text-white/50" role="menuitem">
                      Premium
                    </span>
                  ) : (
                    <Link href="/premium/upgrade" className="rounded-lg px-2 py-2 transition hover:bg-white/10" role="menuitem">
                      Langganan
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="rounded-lg px-2 py-2 text-left text-white/80 transition hover:bg-white/10"
                    role="menuitem"
                    disabled={signingOut}
                  >
                    {signingOut ? 'Keluar...' : 'Keluar'}
                  </button>
                </nav>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-sm font-medium">
              <Link href="/login" className="transition hover:text-text-primary">
                Masuk
              </Link>
              <Link href="/register" className="hidden sm:inline transition hover:text-text-primary">
                Daftar
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
