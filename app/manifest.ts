import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Lembragua.online - Água e Remédios',
    short_name: 'Lembragua',
    description: 'Aplicativo leve para cuidar de hábitos essenciais: beber água e tomar remédios. 100% offline, fácil e sem cadastro.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#ffffff',
    orientation: 'portrait',
    ...({
      themeColorDark: '#0f172a',
      navigationColor: '#1e3a8a',
      navigationColorDark: '#1e3a8a',
      navigationDividerColor: '#1e3a8a',
      navigationDividerColorDark: '#1e3a8a',
    } as Record<string, string>),
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
}
