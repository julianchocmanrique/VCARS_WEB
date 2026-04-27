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
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                try {
                  var BUILD_KEY = '@vcars_web_build_version';
                  var BUILD_VALUE = '2026-04-27-hotfix-1';
                  var prev = localStorage.getItem(BUILD_KEY);
                  if (prev === BUILD_VALUE) return;

                  localStorage.setItem(BUILD_KEY, BUILD_VALUE);
                  localStorage.removeItem('@vcars_entries');
                  localStorage.removeItem('@vcars_current_entry');
                  localStorage.removeItem('@vcars_order_forms');

                  var href = window.location.href || '';
                  var hasFlag = href.indexOf('_vcars_refresh=1') !== -1;
                  if (!hasFlag) {
                    var sep = href.indexOf('?') === -1 ? '?' : '&';
                    window.location.replace(href + sep + '_vcars_refresh=1');
                  }
                } catch (_) {}
              })();
            `,
          }}
        />
      </head>
      <body>
        <InitialLoaderGate>
          <PageTransitionShell>{children}</PageTransitionShell>
        </InitialLoaderGate>
      </body>
    </html>
  );
}
