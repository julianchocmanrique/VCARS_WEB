import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { InitialLoaderGate } from '@/components/InitialLoaderGate';
import { PageTransitionShell } from '@/components/transitions/PageTransitionShell';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800', '900'],
});

export const metadata: Metadata = {
  title: 'VCARS Web',
  description: 'Portal web de operación para VCARS',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={inter.variable}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body>
        <InitialLoaderGate>
          <PageTransitionShell>{children}</PageTransitionShell>
        </InitialLoaderGate>
      </body>
    </html>
  );
}
