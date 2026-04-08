import type { Metadata, Viewport } from 'next';
import './globals.css';
import { InitialLoaderGate } from '@/components/InitialLoaderGate';
import { PageTransitionShell } from '@/components/transitions/PageTransitionShell';

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
    <html lang="es">
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
