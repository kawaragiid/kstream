"use client";

import Link from "next/link";

const PROFILE_TABS = [
  { key: "settings", label: "Pengaturan", href: "/profile/settings" },
  { key: "favorites", label: "Daftar Saya", href: "/profile/favorites" },
  { key: "history", label: "Riwayat", href: "/profile/history" },
];

export default function ProfileSubNav({ active = "settings" }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
      <nav aria-label="Navigasi Profil" className="flex flex-wrap items-center gap-2">
        {PROFILE_TABS.map((tab) => {
          const isCurrent = tab.key === active;
          return (
            <Link
              key={tab.key}
              href={tab.href}
              aria-current={isCurrent ? "page" : undefined}
              className={`inline-flex min-h-[44px] items-center justify-center rounded-md px-3.5 py-2 text-xs sm:text-sm transition motion-reduce:transition-none ${
                isCurrent
                  ? "bg-white/15 font-semibold text-white"
                  : "font-medium text-white/70 hover:bg-white/5 hover:text-white"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
