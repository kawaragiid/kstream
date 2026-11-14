export const metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : 'https://kstream-alpha.vercel.app')
  ),
  title: {
    default: 'Kstream — Streaming Film & Series',
    template: '%s — Kstream',
  },
  description: 'Tonton film, anime, dan series favoritmu dengan kualitas HD dan subtitle lengkap di Kstream.',
  icons: {
    icon: '/icon.png',
    shortcut: '/icon.png',
    apple: '/icon.png',
  },
  openGraph: {
    title: 'Kstream — Streaming Film & Series',
    description: 'Tonton film, anime, dan series favoritmu dengan kualitas HD dan subtitle lengkap di Kstream.',
    type: 'website',
    siteName: 'Kstream',
    images: [
      {
        url: '/icon.png',
        width: 512,
        height: 512,
        alt: 'Kstream Logo',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'Kstream — Streaming Film & Series',
    description: 'Tonton film, anime, dan series favoritmu dengan kualitas HD dan subtitle lengkap di Kstream.',
    images: ['/icon.png'],
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: '#141414',
};

import { cache } from 'react';
import '../styles/globals.css';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Providers from './providers';
import { getPlatformSettings } from '../lib/firestoreServer';

const getCachedSettings = cache(async () =>
  getPlatformSettings().catch(() => ({ categories: [] }))
);

export default async function RootLayout({ children }) {
  const settings = await getCachedSettings();
  const categories = settings?.categories || [];

  return (
    <html lang="id" className="dark bg-[#141414]">
      <body
        suppressHydrationWarning
        className="min-h-screen bg-[#141414] text-text-primary antialiased selection:bg-brand selection:text-white"
      >
        <Providers>
          <Navbar categories={categories} />
          <main className="min-h-screen bg-[#141414] text-text-primary">
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
