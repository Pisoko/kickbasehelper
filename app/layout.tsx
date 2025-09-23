import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ArenaHelper',
  description: 'ArenaHelper – Optimiere deine Kickbase Arena Startelf'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className={`${inter.className} min-h-screen bg-slate-950 text-slate-100`}>
        <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
          <header className="mb-6 border-b border-slate-800 pb-4">
            <h1 className="text-3xl font-bold">ArenaHelper</h1>
            <p className="text-sm text-slate-400">
              Berechne die bestmögliche Startelf für den Kickbase Arena Mode.
            </p>
          </header>
          <main className="flex-1">{children}</main>
          <footer className="mt-8 border-t border-slate-800 pt-4 text-xs text-slate-500">
            Datenstand und Optimierung lokal berechnet. Aktualisiere wöchentlich für frische Daten.
          </footer>
        </div>
      </body>
    </html>
  );
}
