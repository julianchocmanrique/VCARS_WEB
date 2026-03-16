import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'VCARS Web',
  description: 'Portal web de operación para VCARS',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
