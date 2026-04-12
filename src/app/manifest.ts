import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '낭만 길드',
    short_name: '낭만',
    description: '마비노기 모바일 낭만 길드 관리 시스템',
    start_url: '/',
    display: 'standalone',
    background_color: '#f9fafb',
    theme_color: '#6366f1',
    orientation: 'portrait',
    icons: [
      {
        src: '/api/icons/192',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/api/icons/512',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/api/icons/512',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
