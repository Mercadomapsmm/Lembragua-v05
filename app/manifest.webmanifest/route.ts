import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const themeParam = req.nextUrl.searchParams.get('theme');
  const cookieTheme = cookieStore.get('lembragua_theme')?.value;
  const isDark = themeParam ? themeParam === 'dark' : cookieTheme === 'dark';
  const barColor = isDark ? '#0f172a' : '#ffffff';

  const manifest = {
    id: '/',
    name: 'Lembragua - Água e Remédios',
    short_name: 'Lembragua',
    description:
      'Aplicativo leve para cuidar de hábitos essenciais: beber água e tomar remédios. 100% offline, fácil e sem cadastro.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    display_override: ['standalone', 'minimal-ui'],
    background_color: barColor,
    theme_color: barColor,
    dark_theme_color: '#0f172a',
    dark_background_color: '#0f172a',
    themeColorDark: '#0f172a',
    navigationColor: barColor,
    navigationColorDark: '#0f172a',
    navigationDividerColor: barColor,
    navigationDividerColorDark: '#0f172a',
    user_preferences: {
      color_scheme_dark: {
        theme_color: '#0f172a',
        background_color: '#0f172a',
      },
    },
    orientation: 'portrait',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  };

  return new NextResponse(JSON.stringify(manifest, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/manifest+json; charset=utf-8',
      'Cache-Control': 'no-store, must-revalidate',
    },
  });
}
