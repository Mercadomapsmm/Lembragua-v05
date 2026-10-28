import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import './globals.css';

export async function generateViewport(): Promise<Viewport> {
  const cookieStore = await cookies();
  const isDark = cookieStore.get('lembragua_theme')?.value === 'dark';
  const barColor = isDark ? '#0f172a' : '#ffffff';

  return {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    viewportFit: 'cover',
    themeColor: barColor,
    colorScheme: isDark ? 'dark' : 'light',
  };
}

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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const isServerDark = cookieStore.get('lembragua_theme')?.value === 'dark';
  const initialBarColor = isServerDark ? '#0f172a' : '#ffffff';

  return (
    <html
      lang="pt-BR"
      className={`${isServerDark ? 'dark ' : ''}bg-[#ffffff] dark:bg-[#0f172a]`}
      suppressHydrationWarning
    >
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="msapplication-navbutton-color" content={initialBarColor} suppressHydrationWarning />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var raw = localStorage.getItem('habitos_simples_v1');
                  var hasSaved = !!raw;
                  var isDark = hasSaved
                    ? JSON.parse(raw)?.settings?.theme === 'dark'
                    : document.documentElement.classList.contains('dark');
                  var barColor = isDark ? '#0f172a' : '#ffffff';
                  var scheme = isDark ? 'dark' : 'light';
                  var cookieAttrs = window.location.protocol === 'https:'
                    ? '; path=/; max-age=31536000; SameSite=None; Secure'
                    : '; path=/; max-age=31536000; SameSite=Lax';
                  document.cookie = 'lembragua_theme=' + scheme + cookieAttrs;
                  document.documentElement.classList.toggle('dark', isDark);
                  document.documentElement.style.colorScheme = scheme;
                  document.documentElement.style.backgroundColor = barColor;
                  var metas = document.querySelectorAll('meta[name="theme-color"]');
                  if (metas.length > 0) {
                    for (var i = 0; i < metas.length; i++) {
                      metas[i].removeAttribute('media');
                      metas[i].setAttribute('content', barColor);
                    }
                  } else {
                    var m = document.createElement('meta');
                    m.setAttribute('name', 'theme-color');
                    m.setAttribute('content', barColor);
                    document.head.appendChild(m);
                  }
                  var cs = document.querySelector('meta[name="color-scheme"]');
                  if (cs) {
                    cs.setAttribute('content', scheme);
                  } else {
                    var csm = document.createElement('meta');
                    csm.setAttribute('name', 'color-scheme');
                    csm.setAttribute('content', scheme);
                    document.head.appendChild(csm);
                  }
                  var msNav = document.querySelector('meta[name="msapplication-navbutton-color"]');
                  if (msNav) msNav.setAttribute('content', barColor);
                  var manifestLink = document.querySelector('link[rel="manifest"]');
                  if (manifestLink) {
                    manifestLink.setAttribute('href', '/manifest.webmanifest?theme=' + scheme);
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${isServerDark ? 'dark ' : ''}bg-[#ffffff] dark:bg-[#0f172a] text-slate-800 dark:text-slate-100 antialiased min-h-dvh selection:bg-sky-200`}
        suppressHydrationWarning
      >
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
