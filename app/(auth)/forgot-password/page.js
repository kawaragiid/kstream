"use client";

import Link from 'next/link';
import { useState } from 'react';
import { resetPassword } from '../../../lib/auth';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);
    try {
      await resetPassword(email);
      setMessage('Link reset telah dikirim. Periksa email Anda.');
    } catch (err) {
      setError(err.message || 'Gagal mengirim link reset.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="container mx-auto px-4 py-12 max-w-md">
      <h1 className="text-2xl font-semibold mb-6">Lupa Password</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <input
          className="w-full border rounded px-3 py-2"
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        {message && <p className="text-sm text-green-600">{message}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="w-full rounded bg-brand text-white py-2" disabled={loading}>
          {loading ? 'Mengirim...' : 'Kirim Link Reset'}
        </button>
      </form>
      <p className="mt-6 text-sm text-gray-600">
        Kembali ke <Link href="/login" className="text-brand">halaman masuk</Link>.
      </p>
    </section>
  );
}
