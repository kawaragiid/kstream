"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import ConfirmDialog from "../../../../components/ConfirmDialog";
import ProfileSubNav from "../../../../components/ProfileSubNav";
import { useAuth } from "../../../../hooks/useAuth";
import { resetPassword, updateProfile } from "../../../../lib/auth";
import { readUserDoc, updateUserProfileDoc } from "../../../../lib/firestore";

const PLACEHOLDER_AVATAR =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><rect width="160" height="160" fill="%23111827"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23FFFFFF" font-size="24" font-family="Arial, sans-serif">Avatar</text></svg>';

const languageOptions = [
  { value: "id", label: "Bahasa Indonesia" },
  { value: "en", label: "English" },
  { value: "jp", label: "Bahasa Jepang" },
];

export default function ProfileSettingsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [loadingPreferences, setLoadingPreferences] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [securityLoading, setSecurityLoading] = useState(false);
  const [dangerLoading, setDangerLoading] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const [form, setForm] = useState({
    displayName: "",
    tagline: "",
    preferredLanguage: "id",
    autoplay: true,
    dataSaver: false,
  });

  const [photoUrl, setPhotoUrl] = useState("");
  const [photoUrlInput, setPhotoUrlInput] = useState("");
  const [photoError, setPhotoError] = useState(false);

  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [status, setStatus] = useState({ type: null, message: "" });
  const [securityStatus, setSecurityStatus] = useState({ type: null, message: "" });
  const [dangerStatus, setDangerStatus] = useState({ type: null, message: "" });

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
    setProfileMessage("");
    setProfileError("");
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoadingPreferences(true);
    readUserDoc(user.uid)
      .then(({ data = {} }) => {
        if (!active) return;
        const preferences = data.preferences || {};
        setForm((prev) => ({
          ...prev,
          displayName: user.displayName || prev.displayName || "",
          tagline: data.tagline || "",
          preferredLanguage: preferences.preferredLanguage || prev.preferredLanguage || "id",
          autoplay: typeof preferences.autoplay === "boolean" ? preferences.autoplay : true,
          dataSaver: typeof preferences.dataSaver === "boolean" ? preferences.dataSaver : false,
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

  const previewPhoto = useMemo(() => {
    if (photoUrlInput.trim()) return photoUrlInput.trim();
    if (photoUrl) return photoUrl;
    return PLACEHOLDER_AVATAR;
  }, [photoUrl, photoUrlInput]);

  useEffect(() => {
    setPhotoError(false);
  }, [previewPhoto]);

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

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    if (!user) return;
    setSavingProfile(true);
    setProfileMessage("");
    setProfileError("");

    try {
      let nextPhotoUrl = photoUrl;
      const typedUrl = photoUrlInput.trim();

      if (typedUrl) {
        if (!/^https:\/\//i.test(typedUrl)) {
          throw new Error("URL foto profil harus diawali https://");
        }
        try {
          const parsed = new URL(typedUrl);
          if (parsed.protocol !== "https:") {
            throw new Error("URL foto profil harus menggunakan https://");
          }
        } catch {
          throw new Error("Format URL foto profil tidak valid.");
        }
        nextPhotoUrl = typedUrl;
      }

      await updateProfile(user, {
        displayName: form.displayName || null,
        photoURL: nextPhotoUrl || null,
      });

      await updateUserProfileDoc(user.uid, {
        displayName: form.displayName || null,
        photoURL: nextPhotoUrl || null,
        tagline: form.tagline || "",
      });

      if (typeof user.reload === "function") {
        await user.reload().catch(() => undefined);
      }
      router.refresh();

      setPhotoUrl(nextPhotoUrl || "");
      setPhotoUrlInput("");
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
    setSecurityStatus({ type: null, message: "" });
    try {
      await resetPassword(user.email);
      setSecurityStatus({ type: "success", message: "Email reset kata sandi telah dikirim." });
    } catch (error) {
      setSecurityStatus({
        type: "error",
        message: error?.message || "Gagal mengirim email reset kata sandi.",
      });
    } finally {
      setSecurityLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (!user || dangerLoading) return;
    setDangerLoading(true);
    setDangerStatus({ type: null, message: "" });
    try {
      await updateUserProfileDoc(user.uid, { history: [] });
      setConfirmClearOpen(false);
      window.dispatchEvent(new Event("kstream:history-updated"));
      setDangerStatus({ type: "success", message: "Riwayat tontonan berhasil dihapus." });
    } catch (error) {
      setConfirmClearOpen(false);
      setDangerStatus({
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
      <div className="min-h-[75vh] bg-[#141414] px-4 sm:px-6 pt-24 sm:pt-28 pb-16 text-white">
        <div className="mx-auto max-w-4xl">
          <p className="mt-10 text-center text-white/60">Memuat profil...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[75vh] bg-[#141414] px-4 pt-24 sm:pt-28 pb-16 text-white">
        <div className="mx-auto max-w-lg rounded-md border border-white/10 bg-[#181818] p-8 sm:p-10 text-center shadow-2xl">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Masuk untuk Mengelola Profil</h1>
          <p className="mt-3 text-sm text-white/65">Halaman ini hanya tersedia untuk akun yang sudah masuk.</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/login?redirect=/profile/settings"
              className="inline-flex min-h-[44px] items-center justify-center rounded-[4px] bg-[#E50914] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#f6121d] motion-reduce:transition-none"
            >
              Masuk Sekarang
            </Link>
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex min-h-[44px] items-center justify-center rounded-[4px] border border-white/25 px-5 py-2.5 text-sm font-semibold text-white/80 hover:border-white hover:text-white"
            >
              Batal
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#141414] text-white">
      <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 pt-24 sm:pt-28 pb-16 space-y-10">
        <ProfileSubNav active="settings" />
        {/* Netflix Edit Profile Header */}
        <div className="border-b border-[#2b2b2b] pb-5">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white">Edit Profil</h1>
          <p className="mt-1 text-sm text-white/65">{user.email}</p>
        </div>

        {/* Netflix Profile Identity Form */}
        <form
          onSubmit={handleSaveProfile}
          className="grid gap-8 border-b border-[#2b2b2b] pb-10 sm:grid-cols-[160px,1fr]"
        >
          <div className="flex flex-col items-center sm:items-start gap-3">
            <div className="relative h-32 w-32 sm:h-36 sm:w-36 overflow-hidden rounded-[6px] bg-gradient-to-br from-[#E50914] to-[#7f1d1d] ring-1 ring-white/20 shadow-lg">
              {previewPhoto && previewPhoto !== PLACEHOLDER_AVATAR && !photoError ? (
                <img
                  src={previewPhoto}
                  alt="Foto profil"
                  onError={() => setPhotoError(true)}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-5xl font-black text-white">
                  {avatarInitial}
                </div>
              )}
              <span
                aria-hidden="true"
                className="absolute bottom-2 left-2 flex h-7 w-7 items-center justify-center rounded-full border border-white/60 bg-black/75 text-white shadow"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-white/65 text-center sm:text-left">
              Tempel URL gambar (https://) atau gunakan foto akun Google.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="profile-display-name" className="block text-xs font-semibold uppercase tracking-wider text-white/65">
                Nama Profil
              </label>
              <input
                id="profile-display-name"
                name="displayName"
                value={form.displayName}
                onChange={handleInputChange}
                placeholder="Nama tampilan"
                className="mt-1.5 min-h-[44px] w-full rounded-[4px] border border-transparent bg-[#333333] px-4 py-2.5 text-sm sm:text-base text-white placeholder:text-white/65 focus:border-white focus:bg-[#404040] focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="profile-tagline" className="block text-xs font-semibold uppercase tracking-wider text-white/65">
                Bio / Tagline
              </label>
              <textarea
                id="profile-tagline"
                name="tagline"
                value={form.tagline}
                onChange={handleInputChange}
                rows={2}
                placeholder="Ceritakan sedikit tentang tontonan favoritmu"
                className="mt-1.5 w-full rounded-[4px] border border-transparent bg-[#333333] px-4 py-2.5 text-sm sm:text-base text-white placeholder:text-white/65 focus:border-white focus:bg-[#404040] focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="profile-photo-url" className="block text-xs font-semibold uppercase tracking-wider text-white/65">
                URL Foto Profil
              </label>
              <input
                id="profile-photo-url"
                value={photoUrlInput}
                onChange={(event) => setPhotoUrlInput(event.target.value)}
                placeholder="https://"
                className="mt-1.5 min-h-[44px] w-full rounded-[4px] border border-transparent bg-[#333333] px-4 py-2.5 text-sm sm:text-base text-white placeholder:text-white/65 focus:border-white focus:bg-[#404040] focus:outline-none"
              />
            </div>

            {profileMessage && (
              <p role="status" className="text-sm text-[#46d369]">
                {profileMessage}
              </p>
            )}
            {profileError && (
              <p role="alert" className="text-sm text-rose-400">
                {profileError}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="submit"
                className="inline-flex min-h-[44px] items-center justify-center rounded-[2px] bg-white px-6 py-2.5 text-sm font-bold text-black transition hover:bg-[#E50914] hover:text-white motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-60"
                disabled={savingProfile}
              >
                {savingProfile ? "Menyimpan..." : "Simpan"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPhotoUrlInput("");
                  setProfileMessage("");
                  setProfileError("");
                }}
                className="inline-flex min-h-[44px] items-center justify-center rounded-[2px] border border-[#808080] px-5 py-2.5 text-sm font-semibold text-[#b3b3b3] transition hover:border-white hover:text-white motion-reduce:transition-none"
              >
                Reset
              </button>
            </div>
          </div>
        </form>

        {/* Netflix Playback Preferences */}
        <form onSubmit={handleSavePreferences} className="space-y-6 border-b border-[#2b2b2b] pb-10">
          <div>
            <h2 className="text-xl font-semibold text-white">Pengaturan Pemutaran</h2>
            <p className="mt-1 text-sm text-white/65">Sesuaikan autoplay, kualitas data, dan bahasa subtitle utama.</p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4 rounded-[4px] border border-white/10 bg-[#181818] p-4">
              <div>
                <p className="text-sm font-medium text-white">Putar otomatis episode berikutnya</p>
                <p className="text-xs text-white/65">Lanjutkan episode berikutnya secara otomatis saat episode selesai.</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={form.autoplay}
                onClick={() => handleToggle("autoplay")}
                aria-label="Putar otomatis episode berikutnya"
                className="inline-flex min-h-[44px] min-w-[52px] shrink-0 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-white/50"
              >
                <span
                  aria-hidden="true"
                  className={`relative h-7 w-12 rounded-full border transition motion-reduce:transition-none ${
                    form.autoplay ? "border-[#E50914] bg-[#E50914]" : "border-white/25 bg-[#333333]"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0 h-5 w-5 transform rounded-full bg-white shadow transition motion-reduce:transition-none ${
                      form.autoplay ? "translate-x-6" : "translate-x-0.5"
                    }`}
                  />
                </span>
              </button>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-[4px] border border-white/10 bg-[#181818] p-4">
              <div>
                <p className="text-sm font-medium text-white">Mode hemat data</p>
                <p className="text-xs text-white/65">Prioritaskan streaming dengan bitrate lebih hemat.</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={form.dataSaver}
                onClick={() => handleToggle("dataSaver")}
                aria-label="Mode hemat data"
                className="inline-flex min-h-[44px] min-w-[52px] shrink-0 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-white/50"
              >
                <span
                  aria-hidden="true"
                  className={`relative h-7 w-12 rounded-full border transition motion-reduce:transition-none ${
                    form.dataSaver ? "border-[#E50914] bg-[#E50914]" : "border-white/25 bg-[#333333]"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0 h-5 w-5 transform rounded-full bg-white shadow transition motion-reduce:transition-none ${
                      form.dataSaver ? "translate-x-6" : "translate-x-0.5"
                    }`}
                  />
                </span>
              </button>
            </div>

            <div className="pt-2">
              <label className="flex max-w-xs flex-col gap-1.5 text-xs font-semibold uppercase tracking-wider text-white/65">
                Bahasa Subtitle Utama
                <select
                  name="preferredLanguage"
                  value={form.preferredLanguage}
                  onChange={handleInputChange}
                  disabled={loadingPreferences || savingPreferences}
                  className="min-h-[44px] rounded-[4px] border border-white/15 bg-[#333333] px-3.5 py-2.5 text-sm font-normal text-white focus:border-white focus:outline-none"
                >
                  {languageOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p
                role={status.type === "error" ? "alert" : status.type === "success" ? "status" : undefined}
                className={`text-sm font-medium ${statusColor}`}
              >
                {status.message || "Perubahan preferensi akan diterapkan di seluruh perangkatmu."}
              </p>
              {loadingPreferences && <p className="text-xs text-white/65">Memuat preferensi akun...</p>}
            </div>
            <button
              type="submit"
              className="inline-flex min-h-[44px] items-center justify-center rounded-[2px] bg-white px-6 py-2.5 text-sm font-bold text-black transition hover:bg-[#E50914] hover:text-white motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-60"
              disabled={savingPreferences || loadingPreferences}
            >
              {savingPreferences ? "Menyimpan..." : "Simpan Preferensi"}
            </button>
          </div>
        </form>

        {/* Netflix Account Security & Danger Zone */}
        <section className="grid gap-5 sm:grid-cols-2">
          <div className="rounded-[4px] border border-white/10 bg-[#181818] p-5">
            <h2 className="text-base font-semibold text-white">Keamanan Akun</h2>
            <p className="mt-1 text-xs text-white/65">Kirim tautan reset kata sandi ke {user.email}.</p>
            <button
              type="button"
              onClick={handlePasswordReset}
              disabled={securityLoading}
              className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-[2px] border border-[#808080] px-4 py-2.5 text-xs font-semibold text-white transition hover:border-white hover:bg-white/10 motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-60"
            >
              {securityLoading ? "Mengirim..." : "Kirim Email Reset Kata Sandi"}
            </button>
            {securityStatus.message && (
              <p
                role={securityStatus.type === "error" ? "alert" : "status"}
                className={`mt-3 text-xs font-medium ${securityStatus.type === "error" ? "text-rose-300" : "text-emerald-300"}`}
              >
                {securityStatus.message}
              </p>
            )}
          </div>

          <div className="rounded-[4px] border border-[#E50914]/40 bg-[#181818] p-5">
            <h2 className="text-base font-semibold text-white">Riwayat Tontonan</h2>
            <p className="mt-1 text-xs text-white/65">
              Menghapus seluruh riwayat tontonan dan posisi terakhir pemutaran.
            </p>
            <button
              type="button"
              onClick={() => setConfirmClearOpen(true)}
              disabled={dangerLoading}
              className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-[2px] border border-[#E50914]/70 px-4 py-2.5 text-xs font-semibold text-[#ff6b6b] transition hover:bg-[#E50914] hover:text-white motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-60"
            >
              {dangerLoading ? "Menghapus..." : "Hapus Riwayat Tontonan"}
            </button>
            {dangerStatus.message && (
              <p
                role={dangerStatus.type === "error" ? "alert" : "status"}
                className={`mt-3 text-xs font-medium ${dangerStatus.type === "error" ? "text-rose-300" : "text-emerald-300"}`}
              >
                {dangerStatus.message}
              </p>
            )}
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={confirmClearOpen}
        title="Hapus semua riwayat tontonan?"
        description="Semua riwayat tontonan dan posisi terakhir pemutaran akan dihapus permanen dari akun ini."
        confirmLabel="Hapus Riwayat"
        cancelLabel="Batal"
        loading={dangerLoading}
        onConfirm={handleClearHistory}
        onCancel={() => setConfirmClearOpen(false)}
      />
    </div>
  );
}
