import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'Lembragua.online - Água e Remédios',
  description: 'Aplicativo leve para cuidar de hábitos essenciais: beber água e tomar remédios. 100% offline, fácil e sem cadastro.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Lembragua.online',
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/icon.svg',
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/manifest.webmanifest',
  openGraph: {
    title: 'Lembragua.online - Água e Remédios',
    description: 'Aplicativo leve para manter hábitos essenciais: beber água e tomar remédios.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Lembragua.online - Água e Remédios',
    description: 'Aplicativo leve para manter hábitos essenciais: beber água e tomar remédios.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="bg-[#ffffff] dark:bg-[#0f172a]" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var raw = localStorage.getItem('habitos_simples_v1');
                  var isDark = raw && JSON.parse(raw)?.settings?.theme === 'dark';
                  var barColor = isDark ? '#0f172a' : '#ffffff';
                  document.documentElement.classList.toggle('dark', !!isDark);
                  document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
                  document.documentElement.style.backgroundColor = barColor;
                  var metas = document.querySelectorAll('meta[name="theme-color"]');
                  for (var i = 0; i < metas.length; i++) {
                    metas[i].removeAttribute('media');
                    metas[i].setAttribute('content', barColor);
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="bg-[#ffffff] dark:bg-[#0f172a] text-slate-800 antialiased min-h-screen selection:bg-sky-200" suppressHydrationWarning>
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  var refreshing = false;
                  navigator.serviceWorker.addEventListener('controllerchange', function() {
                    if (!refreshing) {
                      refreshing = true;
                      window.location.reload();
                    }
                  });
                  navigator.serviceWorker.register('/sw.js').then(function(reg) {
                    reg.update().catch(function() {});
                  }).catch(function(err) {
                    console.log('SW registration skipped:', err);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
