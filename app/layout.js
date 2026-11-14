export const metadata = {
  title: 'Kstream',
  description: 'Streaming platform - user area',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: '#000000',
};

import '../styles/globals.css';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Providers from './providers';
import { getPlatformSettings } from '../lib/firestoreServer';

export default async function RootLayout({ children }) {
  const settings = await getPlatformSettings().catch(() => ({ categories: [] }));
  const categories = settings?.categories || [];

  return (
    <html lang="en" className="dark bg-black">
      <body
        suppressHydrationWarning
        className="min-h-screen bg-black text-text-primary antialiased overflow-x-hidden selection:bg-brand selection:text-white"
      >
        <Providers>
          <Navbar categories={categories} />
          <main className="min-h-screen bg-gradient-to-b from-black via-surface-100 to-black/90 text-text-primary">
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
