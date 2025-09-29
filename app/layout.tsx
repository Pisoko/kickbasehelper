import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import ServiceWorkerProvider from '../components/ServiceWorkerProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'KickbaseHelper',
  description: 'KickbaseHelper – Optimiere deine Kickbase Startelf',
  manifest: '/manifest.json',
  themeColor: '#0f172a',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className={`${inter.className} min-h-screen bg-slate-950 text-slate-100`}>
        <ServiceWorkerProvider>
          <div className="mx-auto flex min-h-screen w-full max-w-screen-2xl flex-col px-4 py-6 sm:px-6 lg:px-8">
            <main className="flex-1">{children}</main>

          </div>
        </ServiceWorkerProvider>
      </body>
    </html>
  );
}
