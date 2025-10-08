"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { useAuth } from "../../../../hooks/useAuth";
import { isPremium, resetPassword, updateProfile } from "../../../../lib/auth";
import { updateUserProfileDoc } from "../../../../lib/firestore";
import { getDb, getFirebaseStorage } from "../../../../lib/firebase";

const PLACEHOLDER_AVATAR =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><rect width="160" height="160" fill="%23111827"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23FFFFFF" font-size="24" font-family="Arial, sans-serif">Avatar</text></svg>';

const languageOptions = [
  { value: "id", label: "Bahasa Indonesia" },
  { value: "en", label: "English" },
  { value: "jp", label: "Bahasa Jepang" },
];

const themeOptions = [
  { value: "dark", label: "Tema Gelap" },
  { value: "light", label: "Tema Terang" },
  { value: "auto", label: "Ikuti Sistem" },
];

export default function ProfileSettingsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [premium, setPremium] = useState(false);
  const [loadingPreferences, setLoadingPreferences] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [securityLoading, setSecurityLoading] = useState(false);
  const [dangerLoading, setDangerLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    displayName: "",
    tagline: "",
    preferredLanguage: "id",
    autoplay: true,
    dataSaver: false,
    theme: "dark",
  });

  const [photoUrl, setPhotoUrl] = useState("");
  const [photoUrlInput, setPhotoUrlInput] = useState("");
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState("");

  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [status, setStatus] = useState({ type: null, message: "" });

  useEffect(() => {
    if (!user) {
      setLoadingPreferences(false);
      return;
    }

    setForm((prev) => ({
      ...prev,
      displayName: user.displayName || prev.displayName || "",
    }));
    setPhotoUrl(user.photoURL || "");
    setPhotoUrlInput("");
    setFile(null);
    setFilePreview("");
    setProfileMessage("");
    setProfileError("");
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    isPremium(user)
      .then((value) => {
        if (mounted) setPremium(Boolean(value));
      })
      .catch(() => {
        if (mounted) setPremium(false);
      });
    return () => {
      mounted = false;
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoadingPreferences(true);
    const db = getDb();
    getDoc(doc(db, "users", user.uid))
      .then((snapshot) => {
        if (!active) return;
        const data = snapshot.data() || {};
        const preferences = data.preferences || {};
        setForm((prev) => ({
          ...prev,
          displayName: user.displayName || prev.displayName || "",
          tagline: data.tagline || "",
          preferredLanguage: preferences.preferredLanguage || prev.preferredLanguage || "id",
          autoplay: typeof preferences.autoplay === "boolean" ? preferences.autoplay : true,
          dataSaver: typeof preferences.dataSaver === "boolean" ? preferences.dataSaver : false,
          theme: preferences.theme || "dark",
        }));
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoadingPreferences(false);
      });
    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    if (!file) {
      setFilePreview("");
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setFilePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const previewPhoto = useMemo(() => {
    if (photoUrlInput.trim()) return photoUrlInput.trim();
    if (filePreview) return filePreview;
    if (photoUrl) return photoUrl;
    return PLACEHOLDER_AVATAR;
  }, [filePreview, photoUrl, photoUrlInput]);

  const avatarInitial = useMemo(() => {
    const source = form.displayName || user?.email || "K";
    return source.charAt(0)?.toUpperCase?.() || "K";
  }, [form.displayName, user?.email]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleToggle = (key) => {
    setForm((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleFileChange = (event) => {
    const selected = event.target.files?.[0] || null;
    setFile(selected);
    if (selected) {
      setPhotoUrlInput("");
      setProfileMessage("");
      setProfileError("");
    }
  };

  const uploadFileIfNeeded = async () => {
    if (!file || !user) return null;
    setUploading(true);
    try {
      const storage = getFirebaseStorage();
      const extension = file.name?.split?.(".")?.pop?.() || "jpg";
      const path = `profilePictures/${user.uid}/${Date.now()}.${extension}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file, { contentType: file.type });
      return await getDownloadURL(storageRef);
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    if (!user) return;
    setSavingProfile(true);
    setProfileMessage("");
    setProfileError("");

    try {
      let nextPhotoUrl = photoUrl;

      if (file) {
        const uploadedUrl = await uploadFileIfNeeded();
        if (uploadedUrl) {
          nextPhotoUrl = uploadedUrl;
        }
      } else if (photoUrlInput.trim()) {
        nextPhotoUrl = photoUrlInput.trim();
      }

      await updateProfile(user, {
        displayName: form.displayName || null,
        photoURL: nextPhotoUrl || null,
      });

      await updateUserProfileDoc(user.uid, {
        displayName: form.displayName || null,
        photoUrl: nextPhotoUrl || null,
        tagline: form.tagline || "",
      });

      setPhotoUrl(nextPhotoUrl || "");
      setPhotoUrlInput("");
      setFile(null);
      setProfileMessage("Profil berhasil diperbarui.");
    } catch (error) {
      setProfileError(error?.message || "Gagal memperbarui profil.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSavePreferences = async (event) => {
    event.preventDefault();
    if (!user) return;
    setSavingPreferences(true);
    setStatus({ type: null, message: "" });

    try {
      await updateUserProfileDoc(user.uid, {
        preferences: {
          preferredLanguage: form.preferredLanguage,
          autoplay: form.autoplay,
          dataSaver: form.dataSaver,
          theme: form.theme,
        },
      });
      setStatus({ type: "success", message: "Preferensi pemutaran berhasil disimpan." });
    } catch (error) {
      setStatus({
        type: "error",
        message: error?.message || "Gagal menyimpan preferensi. Coba beberapa saat lagi.",
      });
    } finally {
      setSavingPreferences(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    setSecurityLoading(true);
    setStatus({ type: null, message: "" });
    try {
      await resetPassword(user.email);
      setStatus({ type: "success", message: "Email reset kata sandi telah dikirim." });
    } catch (error) {
      setStatus({
        type: "error",
        message: error?.message || "Gagal mengirim email reset kata sandi.",
      });
    } finally {
      setSecurityLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (!user) return;
    if (typeof window !== "undefined") {
      const confirmed = window.confirm("Hapus semua riwayat tontonan dari akun ini?");
      if (!confirmed) return;
    }
    setDangerLoading(true);
    setStatus({ type: null, message: "" });
    try {
      await updateUserProfileDoc(user.uid, { history: [] });
      setStatus({ type: "success", message: "Riwayat tontonan berhasil dihapus." });
    } catch (error) {
      setStatus({
        type: "error",
        message: error?.message || "Gagal menghapus riwayat tontonan.",
      });
    } finally {
      setDangerLoading(false);
    }
  };

  const statusColor =
    status.type === "success" ? "text-emerald-300" : status.type === "error" ? "text-rose-300" : "text-white/60";

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#050509] via-[#0f172a] to-black text-white">
        <header className="flex items-center justify-between px-6 py-6">
          <Link href="/" className="text-2xl font-bold tracking-tight text-white">
            Kstream
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white/80 hover:border-white/40 hover:text-white"
            >
              &larr; Kembali ke beranda
            </Link>
            <Link
              href="/profile"
              className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white/80 hover:border-white/40 hover:text-white"
            >
              &larr; Kembali ke profil
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-4xl px-6 pb-16">
          <p className="mt-20 text-center text-white/60">Memuat pengaturan...</p>
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#050509] via-[#0f172a] to-black text-white">
        <header className="flex items-center justify-between px-6 py-6">
          <Link href="/" className="text-2xl font-bold tracking-tight text-white">
            Kstream
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white/80 hover:border-white/40 hover:text-white"
            >
              &larr; Kembali ke beranda
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-4xl px-6 pb-16">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-10 text-center backdrop-blur">
            <h1 className="text-3xl font-semibold text-white">Masuk untuk mengatur profilmu</h1>
            <p className="mt-3 text-sm text-white/60">Halaman ini hanya tersedia untuk pengguna yang telah masuk.</p>
            <div className="mt-6 flex justify-center gap-4">
              <Link
                href="/login"
                className="rounded-full bg-brand px-6 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-brand/80"
              >
                Masuk sekarang
              </Link>
              <button
                type="button"
                onClick={() => router.back()}
                className="rounded-full border border-white/20 px-6 py-2 text-sm font-semibold text-white/80 hover:border-white/40 hover:text-white"
              >
                Batal
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#050509] via-[#0f172a] to-black text-white">
      <header className="flex items-center justify-between px-6 py-6">
        <Link href="/" className="text-2xl font-bold tracking-tight text-white">
          Kstream
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white/80 hover:border-white/40 hover:text-white"
          >
            &larr; Kembali ke beranda
          </Link>
          <Link
            href="/profile"
            className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white/80 hover:border-white/40 hover:text-white"
          >
            &larr; Kembali ke profil
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 pb-16">
        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl backdrop-blur">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-2xl font-semibold text-white">
                {avatarInitial}
              </div>
              <div>
                <h1 className="text-3xl font-semibold text-white">Pengaturan Profil</h1>
                <p className="text-sm text-white/60">{user.email}</p>
              </div>
            </div>
            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                premium ? "border-emerald-400 text-emerald-300" : "border-white/20 text-white/70"
              }`}
            >
              {premium ? "Premium" : "Free"}
            </span>
          </div>
        </section>

        <form
          onSubmit={handleSaveProfile}
          className="mt-10 grid gap-8 rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur lg:grid-cols-[320px,1fr]"
        >
          <div className="space-y-4">
            <div className="relative h-60 w-60 overflow-hidden rounded-full border border-white/10 bg-surface-100">
              <img src={previewPhoto} alt="Foto profil" className="h-full w-full object-cover" />
            </div>
            <label className="block text-sm font-medium text-white/70">
              Unggah foto baru
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="mt-2 w-full text-xs text-white/70 file:mr-4 file:rounded-full file:border-0 file:bg-brand file:px-4 file:py-2 file:text-xs file:font-semibold file:text-white"
              />
            </label>
            <p className="text-xs text-white/50">Atau tempel URL gambar di kolom sebelah. Ukuran ideal 400x400px.</p>
            {uploading && <p className="text-xs text-white/50">Mengunggah foto...</p>}
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-white/70">Nama tampilan</label>
              <input
                name="displayName"
                value={form.displayName}
                onChange={handleInputChange}
                placeholder="Nama tampilan"
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white focus:border-brand focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/70">Tagline</label>
              <textarea
                name="tagline"
                value={form.tagline}
                onChange={handleInputChange}
                rows={3}
                placeholder="Ceritakan sedikit tentang preferensimu"
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white focus:border-brand focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/70">URL foto profil</label>
              <input
                value={photoUrlInput}
                onChange={(event) => setPhotoUrlInput(event.target.value)}
                placeholder="https://"
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white focus:border-brand focus:outline-none"
              />
            </div>

            {profileMessage && <p className="text-sm text-emerald-300">{profileMessage}</p>}
            {profileError && <p className="text-sm text-rose-300">{profileError}</p>}

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                className="inline-flex items-center rounded-full bg-brand px-6 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-brand/80 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={savingProfile || uploading}
              >
                {savingProfile ? "Menyimpan..." : "Simpan profil"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPhotoUrlInput("");
                  setFile(null);
                  setFilePreview("");
                  setProfileMessage("");
                  setProfileError("");
                }}
                className="inline-flex items-center rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white/80 transition hover:border-white/40 hover:text-white"
              >
                Reset
              </button>
            </div>
          </div>
        </form>

        <form
          onSubmit={handleSavePreferences}
          className="mt-10 space-y-6 rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur"
        >
          <h2 className="text-lg font-semibold text-white">Preferensi Pemutaran</h2>
          <p className="text-sm text-white/60">Sesuaikan pengalaman menonton sesuai kebiasaanmu.</p>

          <div className="space-y-5">
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div>
                <p className="text-sm font-medium text-white">Autoplay episode berikutnya</p>
                <p className="text-xs text-white/50">Putar otomatis episode lanjutan ketika episode saat ini selesai.</p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle("autoplay")}
                aria-pressed={form.autoplay}
                className={`relative h-8 w-14 rounded-full border transition ${
                  form.autoplay ? "border-brand bg-brand/90" : "border-white/20 bg-white/10"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-7 w-7 transform rounded-full bg-white shadow transition ${
                    form.autoplay ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div>
                <p className="text-sm font-medium text-white">Mode hemat data</p>
                <p className="text-xs text-white/50">Prioritaskan streaming dengan bit-rate lebih rendah.</p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle("dataSaver")}
                aria-pressed={form.dataSaver}
                className={`relative h-8 w-14 rounded-full border transition ${
                  form.dataSaver ? "border-brand bg-brand/90" : "border-white/20 bg-white/10"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-7 w-7 transform rounded-full bg-white shadow transition ${
                    form.dataSaver ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <label className="flex flex-col gap-2 text-sm text-white/70">
              Bahasa subtitle utama
              <select
                name="preferredLanguage"
                value={form.preferredLanguage}
                onChange={handleInputChange}
                disabled={loadingPreferences || savingPreferences}
                className="rounded-2xl border border-white/20 bg-white/5 px-4 py-3 text-base text-white focus:border-brand focus:outline-none"
              >
                {languageOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm text-white/70">
              Tampilan aplikasi
              <select
                name="theme"
                value={form.theme}
                onChange={handleInputChange}
                disabled={loadingPreferences || savingPreferences}
                className="rounded-2xl border border-white/20 bg-white/5 px-4 py-3 text-base text-white focus:border-brand focus:outline-none"
              >
                {themeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className={`text-sm font-medium ${statusColor}`}>
                {status.message || "Perubahan preferensi akan diterapkan di seluruh perangkatmu."}
              </p>
              {loadingPreferences && <p className="text-xs text-white/40">Memuat preferensi akun...</p>}
            </div>
            <button
              type="submit"
              className="rounded-full bg-brand px-6 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-brand/80 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={savingPreferences || loadingPreferences}
            >
              {savingPreferences ? "Menyimpan..." : "Simpan preferensi"}
            </button>
          </div>
        </form>

        <section className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur">
            <h2 className="text-lg font-semibold text-white">Keamanan Akun</h2>
            <p className="mt-1 text-sm text-white/60">Kelola akses masuk dan keamanan kredensialmu.</p>
            <div className="mt-5 space-y-4">
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div>
                  <p className="text-sm font-medium text-white">Reset kata sandi</p>
                  <p className="text-xs text-white/50">Kami akan mengirim tautan reset ke {user.email}.</p>
                </div>
                <button
                  type="button"
                  onClick={handlePasswordReset}
                  disabled={securityLoading}
                  className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-white transition hover:border-white/40 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {securityLoading ? "Mengirim..." : "Kirim email"}
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-rose-500/40 bg-rose-500/10 p-6 backdrop-blur">
            <h2 className="text-lg font-semibold text-rose-100">Zona Berbahaya</h2>
            <p className="mt-1 text-sm text-rose-200/80">
              Menghapus riwayat tontonan akan menghilangkan rekomendasi personal dan posisi terakhir tontonanmu.
            </p>
            <button
              type="button"
              onClick={handleClearHistory}
              disabled={dangerLoading}
              className="mt-5 rounded-full border border-rose-400 px-4 py-2 text-xs font-semibold text-rose-100 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {dangerLoading ? "Menghapus..." : "Hapus riwayat tontonan"}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
