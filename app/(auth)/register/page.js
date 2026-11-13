"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { loginWithGoogle, register, updateProfile } from "../../../lib/auth";
import { readUserDoc, updateUserProfileDoc } from "../../../lib/firestore";

export default function RegisterPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("Password minimal 6 karakter.");
      return;
    }
    setLoading(true);
    try {
      const credential = await register(email, password);
      try {
        await updateUserProfileDoc(credential.user.uid, {
          role: "pelanggan",
          displayName: displayName.trim() || null,
        });
      } catch {}
      if (displayName.trim()) {
        await updateProfile(credential.user, { displayName: displayName.trim() });
      }
      router.push("/");
    } catch (err) {
      setError(err.message || "Gagal mendaftar.");
    } finally {
      setLoading(false);
    }
  };

  const onGoogleRegister = async () => {
    setError("");
    setGoogleLoading(true);
    try {
      const credential = await loginWithGoogle();
      try {
        const { data: existingData } = await readUserDoc(credential.user.uid);
        const profilePayload = {
          displayName: existingData?.displayName || credential.user.displayName || null,
        };
        if (!existingData?.role) {
          profilePayload.role = "pelanggan";
        }
        await updateUserProfileDoc(credential.user.uid, profilePayload);
      } catch {}
      router.push("/");
    } catch (err) {
      setError(err.message || "Gagal mendaftar dengan Google.");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-16">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_#1e293b,_transparent_55%)]" />
      <div className="w-full max-w-md space-y-8 rounded-3xl border border-white/10 bg-black/70 p-8 sm:p-10 shadow-2xl backdrop-blur">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-semibold text-white">Buat Akun Kstream</h1>
          <p className="text-sm text-white/60">Daftar gratis untuk menyimpan favorit dan riwayat tontonanmu.</p>
        </div>

        <button
          type="button"
          onClick={onGoogleRegister}
          disabled={googleLoading}
          className="flex w-full items-center justify-center gap-3 rounded-full border border-white/20 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#EA4335"
              d="M12 10.2v4h5.6c-.24 1.44-1.68 4.2-5.6 4.2-3.36 0-6.1-2.76-6.1-6.2s2.74-6.2 6.1-6.2c1.92 0 3.2.82 3.94 1.54l2.68-2.6C16.84 3.16 14.64 2.2 12 2.2 6.86 2.2 2.7 6.38 2.7 11.6S6.86 21 12 21c5.56 0 9.3-3.92 9.3-9.44 0-.64-.08-1.12-.18-1.6H12z"
            />
          </svg>
          {googleLoading ? "Menghubungkan..." : "Daftar dengan Google"}
        </button>

        <div className="relative text-center text-xs uppercase tracking-[0.3em] text-white/40">
          <div className="absolute left-0 top-1/2 w-full -translate-y-1/2 border-t border-white/10" aria-hidden="true" />
          <span className="relative z-10 bg-black/70 px-3">atau gunakan email</span>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-widest text-white/60">
              Nama Tampilan (Opsional)
            </label>
            <input
              className="w-full rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-brand focus:outline-none"
              placeholder="Nama kamu"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-widest text-white/60">Email</label>
            <input
              className="w-full rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-brand focus:outline-none"
              placeholder="nama@email.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-widest text-white/60">Password</label>
            <input
              className="w-full rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-brand focus:outline-none"
              placeholder="Minimal 6 karakter"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            className="w-full rounded-full bg-brand py-3 text-sm font-semibold text-white shadow-poster transition hover:bg-brand-dark disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? "Memproses..." : "Daftar Sekarang"}
          </button>
        </form>

        <p className="text-center text-xs text-white/60">
          Sudah punya akun?{" "}
          <Link href="/login" className="font-semibold text-brand hover:text-brand-dark">
            Masuk di sini
          </Link>
        </p>
      </div>
    </div>
  );
}
