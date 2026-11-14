"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { resetPassword } from "../../../lib/auth";

function getSafeRedirect(raw) {
  if (!raw || typeof raw !== "string") return "/";
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/") || /^\/[\\/]/.test(trimmed)) return "/";
  return trimmed;
}

function mapResetError(err) {
  const code = err?.code || "";
  switch (code) {
    case "auth/invalid-email":
      return "Format email tidak valid.";
    case "auth/user-not-found":
      return "Email tidak terdaftar.";
    case "auth/too-many-requests":
      return "Terlalu banyak permintaan. Silakan coba beberapa saat lagi.";
    case "auth/network-request-failed":
      return "Koneksi jaringan bermasalah. Periksa internet Anda.";
    default:
      return "Gagal mengirim tautan reset. Silakan coba lagi.";
  }
}

function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const redirectTo = getSafeRedirect(searchParams.get("redirect") || "");
  const redirectQuery = redirectTo !== "/" ? `?redirect=${encodeURIComponent(redirectTo)}` : "";
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (loading || cooldown > 0) return;
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Masukkan alamat email terlebih dahulu.");
      return;
    }
    setMessage("");
    setError("");
    setLoading(true);
    try {
      await resetPassword(trimmedEmail);
      setMessage("Tautan reset kata sandi telah dikirim. Silakan periksa kotak masuk atau folder spam email Anda.");
      setCooldown(60);
    } catch (err) {
      setError(mapResetError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#141414] px-4 py-16">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_rgba(229,9,20,0.18),_transparent_55%)]" />
      <div className="w-full max-w-md space-y-6 rounded-md border border-white/10 bg-black/80 p-8 sm:p-12 shadow-2xl backdrop-blur-sm">
        <div className="space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Lupa Password</h1>
          <p className="text-sm text-white/60">Masukkan email akunmu untuk menerima tautan reset password.</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <input
              aria-label="Email"
              autoComplete="email"
              className="w-full rounded-[4px] border border-transparent bg-[#333333] px-4 py-3.5 text-sm text-white placeholder:text-white/50 focus:border-white/50 focus:bg-[#454545] focus:outline-none"
              placeholder="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          {message && <p className="rounded-[4px] bg-emerald-500/15 px-3 py-2 text-xs text-emerald-300">{message}</p>}
          {error && <p className="rounded-[4px] bg-[#e87c03]/15 px-3 py-2 text-xs text-[#e87c03]">{error}</p>}
          <button
            className="w-full rounded-[4px] bg-[#E50914] py-3.5 text-sm font-bold text-white transition hover:bg-[#f40612] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading || cooldown > 0}
          >
            {loading
              ? "Mengirim..."
              : cooldown > 0
                ? `Kirim Ulang (${cooldown}d)`
                : "Kirim Tautan Reset"}
          </button>
        </form>

        <p className="text-center text-xs text-white/60">
          Kembali ke{" "}
          <Link href={`/login${redirectQuery}`} className="font-semibold text-white hover:underline">
            halaman masuk
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#141414]" />}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
