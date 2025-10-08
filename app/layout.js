export const metadata = {
  title: 'Kstream',
  description: 'Streaming platform - user area',
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
    <html lang="en">
      <body suppressHydrationWarning className="bg-black text-text-primary">
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
