"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { loginWithGoogle, logout, register, updateProfile } from "../../../lib/auth";
import { updateUserProfileDoc } from "../../../lib/firestore";

function getSafeRedirect(raw) {
  if (!raw || typeof raw !== "string") return "/";
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/") || /^\/[\\/]/.test(trimmed)) return "/";
  return trimmed;
}

function parseExpiryMs(expiresAt) {
  if (!expiresAt) return null;
  if (typeof expiresAt === "number") return Number.isFinite(expiresAt) ? expiresAt : null;
  if (typeof expiresAt === "string") {
    const ms = Date.parse(expiresAt);
    return Number.isNaN(ms) ? null : ms;
  }
  if (typeof expiresAt === "object") {
    if (typeof expiresAt._seconds === "number") return expiresAt._seconds * 1000;
    if (typeof expiresAt.seconds === "number") return expiresAt.seconds * 1000;
  }
  return null;
}

function isAccountBlocked(userData) {
  if (!userData || typeof userData !== "object") return false;
  if (userData.isActive === false || userData.status === "suspend") return true;
  const role = String(userData.role || "pelanggan").toLowerCase();
  const isStaff = ["super-admin", "admin", "editor"].includes(role);
  const plan = String(userData.plan || "free").toLowerCase();
  if (!isStaff && plan === "premium") {
    const expiryMs = parseExpiryMs(userData.expiresAt);
    if (expiryMs !== null && expiryMs <= Date.now()) return true;
  }
  return false;
}

function mapAuthError(err, fallback = "Gagal mendaftar. Silakan coba lagi.") {
  if (err?.isCustomSyncError) return err.message;
  const code = err?.code || "";
  switch (code) {
    case "auth/email-already-in-use":
      return "Email sudah terdaftar. Silakan masuk.";
    case "auth/invalid-email":
      return "Format email tidak valid.";
    case "auth/weak-password":
      return "Password terlalu lemah. Gunakan minimal 6 karakter.";
    case "auth/too-many-requests":
      return "Terlalu banyak percobaan. Silakan coba beberapa saat lagi.";
    case "auth/network-request-failed":
      return "Koneksi jaringan bermasalah. Periksa internet Anda.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "Pendaftaran dengan Google dibatalkan.";
    case "auth/popup-blocked":
      return "Popup diblokir browser. Izinkan popup dan coba lagi.";
    case "auth/user-disabled":
      return "Akun Anda telah dinonaktifkan.";
    default:
      return fallback;
  }
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get("redirect") || "";
  const redirectTo = getSafeRedirect(rawRedirect);
  const redirectQuery = redirectTo !== "/" ? `?redirect=${encodeURIComponent(redirectTo)}` : "";
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const isSubmitting = loading || googleLoading;

  const onSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError("");
    if (password.length < 6) {
      setError("Password minimal 6 karakter.");
      return;
    }
    setLoading(true);
    try {
      const credential = await register(email.trim(), password);
      if (displayName.trim()) {
        await updateProfile(credential.user, { displayName: displayName.trim() });
      }
      try {
        await updateUserProfileDoc(credential.user.uid, {
          email: credential.user.email || email.trim(),
          role: "pelanggan",
          displayName: displayName.trim() || null,
        });
      } catch {
        try {
          await credential.user.delete?.();
        } catch {
          await logout().catch(() => {});
        }
        const syncErr = new Error("Gagal menyimpan profil akun ke server. Silakan coba lagi.");
        syncErr.isCustomSyncError = true;
        throw syncErr;
      }
      router.push(redirectTo);
    } catch (err) {
      setError(mapAuthError(err, "Gagal mendaftar. Silakan coba lagi."));
    } finally {
      setLoading(false);
    }
  };

  const onGoogleRegister = async () => {
    if (isSubmitting) return;
    setError("");
    setGoogleLoading(true);
    try {
      const credential = await loginWithGoogle();
      const firebaseUser = credential.user;
      let existingData = null;
      let fetchOk = false;

      try {
        const token = await firebaseUser.getIdToken?.();
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await fetch(`/api/user?uid=${encodeURIComponent(firebaseUser.uid)}`, {
          cache: "no-store",
          headers,
        });
        if (res.ok) {
          fetchOk = true;
          const json = await res.json().catch(() => null);
          existingData = json?.data || {};
        } else if (res.status === 401 || res.status === 403 || res.status === 503) {
          try {
            await logout();
          } catch {}
          setError(
            res.status === 503
              ? "Layanan server sedang tidak tersedia. Silakan coba beberapa saat lagi."
              : res.status === 401
                ? "Sesi autentikasi tidak valid. Silakan masuk kembali."
                : "Akun Anda sedang dinonaktifkan oleh admin."
          );
          return;
        }
      } catch {
        // Non-blocking network check
      }

      if (fetchOk && isAccountBlocked(existingData)) {
        try {
          await logout();
        } catch {}
        setError("Akun Anda sedang dinonaktifkan atau masa aktif telah berakhir.");
        return;
      }

      if (fetchOk) {
        const profilePayload = {
          email: firebaseUser.email || existingData?.email || "",
          displayName: existingData?.displayName || firebaseUser.displayName || null,
          photoURL: firebaseUser.photoURL || existingData?.photoURL || null,
        };
        if (!existingData?.role) {
          profilePayload.role = "pelanggan";
        }
        await updateUserProfileDoc(firebaseUser.uid, profilePayload);
      }
      router.push(redirectTo);
    } catch (err) {
      setError(mapAuthError(err, "Gagal mendaftar dengan Google."));
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#141414] px-4 py-16">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_rgba(229,9,20,0.18),_transparent_55%)]" />
      <div className="w-full max-w-md space-y-6 rounded-md border border-white/10 bg-black/80 p-8 sm:p-12 shadow-2xl backdrop-blur-sm">
        <div className="space-y-1.5">
          <h1 className="text-3xl font-bold tracking-tight text-white">Daftar Akun</h1>
          <p className="text-sm text-white/60">Simpan daftar favorit dan riwayat tontonanmu.</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="register-name" className="block text-xs font-medium text-white/80">
              Nama Tampilan <span className="text-white/65">(opsional)</span>
            </label>
            <input
              id="register-name"
              autoComplete="name"
              className="w-full rounded-[4px] border border-transparent bg-[#333333] px-4 py-3.5 text-sm text-white placeholder:text-white/65 focus:border-white/50 focus:bg-[#454545] focus:outline-none"
              placeholder="Nama tampilan"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="register-email" className="block text-xs font-medium text-white/80">
              Email
            </label>
            <input
              id="register-email"
              autoComplete="email"
              className="w-full rounded-[4px] border border-transparent bg-[#333333] px-4 py-3.5 text-sm text-white placeholder:text-white/65 focus:border-white/50 focus:bg-[#454545] focus:outline-none"
              placeholder="nama@email.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="register-password" className="block text-xs font-medium text-white/80">
              Password
            </label>
            <div className="relative">
              <input
                id="register-password"
                autoComplete="new-password"
                className="w-full rounded-[4px] border border-transparent bg-[#333333] px-4 py-3.5 pr-12 text-sm text-white placeholder:text-white/65 focus:border-white/50 focus:bg-[#454545] focus:outline-none"
                placeholder="Minimal 6 karakter"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                className="absolute right-1 top-1/2 -translate-y-1/2 inline-flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center text-white/65 transition hover:text-white motion-reduce:transition-none"
              >
                {showPassword ? (
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && (
            <p role="alert" className="rounded-[4px] bg-[#e87c03]/15 px-3 py-2 text-xs text-[#e87c03]">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="min-h-[44px] w-full rounded-[4px] bg-[#E50914] py-3.5 text-sm font-bold text-white transition hover:bg-[#f40612] motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
          >
            {loading ? "Memproses..." : "Daftar Sekarang"}
          </button>
        </form>

        <div className="relative text-center text-xs uppercase tracking-widest text-white/65">
          <div className="absolute left-0 top-1/2 w-full -translate-y-1/2 border-t border-white/10" aria-hidden="true" />
          <span className="relative z-10 bg-black/80 px-3">atau</span>
        </div>

        <button
          type="button"
          onClick={onGoogleRegister}
          disabled={isSubmitting}
          className="flex min-h-[44px] w-full items-center justify-center gap-3 rounded-[4px] border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15 motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-60"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#EA4335"
              d="M12 10.2v4h5.6c-.24 1.44-1.68 4.2-5.6 4.2-3.36 0-6.1-2.76-6.1-6.2s2.74-6.2 6.1-6.2c1.92 0 3.2.82 3.94 1.54l2.68-2.6C16.84 3.16 14.64 2.2 12 2.2 6.86 2.2 2.7 6.38 2.7 11.6S6.86 21 12 21c5.56 0 9.3-3.92 9.3-9.44 0-.64-.08-1.12-.18-1.6H12z"
            />
          </svg>
          {googleLoading ? "Menghubungkan..." : "Daftar dengan Google"}
        </button>

        <p className="text-center text-xs text-white/65">
          Sudah punya akun?{" "}
          <Link href={`/login${redirectQuery}`} className="inline-flex min-h-[44px] items-center py-2 font-semibold text-white hover:underline">
            Masuk di sini
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#141414]" />}>
      <RegisterForm />
    </Suspense>
  );
}
