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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-16">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_#1e293b,_transparent_55%)]" />
      <div className="w-full max-w-md space-y-6 rounded-3xl border border-white/10 bg-black/70 p-8 sm:p-10 shadow-2xl backdrop-blur">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl sm:text-3xl font-semibold text-white">Lupa Password</h1>
          <p className="text-sm text-white/60">Masukkan email akunmu untuk menerima tautan reset password.</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
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
          {message && <p className="text-sm text-emerald-400">{message}</p>}
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            className="w-full rounded-full bg-brand py-3 text-sm font-semibold text-white shadow-poster transition hover:bg-brand-dark disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? "Mengirim..." : "Kirim Tautan Reset"}
          </button>
        </form>

        <p className="text-center text-xs text-white/60">
          Kembali ke{" "}
          <Link href="/login" className="font-semibold text-brand hover:text-brand-dark">
            halaman masuk
          </Link>
        </p>
      </div>
    </div>
  );
}
