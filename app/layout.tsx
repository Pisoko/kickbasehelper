import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import ServiceWorkerProvider from '../components/ServiceWorkerProvider';
import BuyMeACoffeeWidget from '../components/BuyMeACoffeeWidget';
// Initialize cache warmup on server startup
import '@/lib/startup/cache-warmup';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'KickbaseHelper',
  description: 'KickbaseHelper – Optimiere deine Kickbase Startelf',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'KickbaseHelper'
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent'
  }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0f172a'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className="dark">
      <body className={`${inter.className} min-h-screen bg-slate-950 text-slate-100`}>
        <ServiceWorkerProvider>
          <div className="mx-auto flex min-h-screen w-full max-w-screen-2xl flex-col px-4 py-6 sm:px-6 lg:px-8">
            <main className="flex-1">{children}</main>

          </div>
        </ServiceWorkerProvider>
        
        {/* Buy Me A Coffee Widget */}
        <BuyMeACoffeeWidget />
      </body>
    </html>
  );
}
