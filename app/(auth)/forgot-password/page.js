"use client";

import Link from "next/link";
import { useState } from "react";
import { resetPassword } from "../../../lib/auth";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);
    try {
      await resetPassword(email);
      setMessage("Tautan reset kata sandi telah dikirim. Silakan periksa kotak masuk atau folder spam email Anda.");
    } catch (err) {
      setError(err.message || "Gagal mengirim tautan reset.");
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
            disabled={loading}
          >
            {loading ? "Mengirim..." : "Kirim Tautan Reset"}
          </button>
        </form>

        <p className="text-center text-xs text-white/60">
          Kembali ke{" "}
          <Link href="/login" className="font-semibold text-white hover:underline">
            halaman masuk
          </Link>
        </p>
      </div>
    </div>
  );
}
