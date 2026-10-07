import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'OwnYourBody',
    short_name: 'OwnYourBody',
    description: 'Nền tảng quản lý tập luyện',
    start_url: '/',
    display: 'standalone',
    background_color: '#F4F2EB',
    theme_color: '#2A3C24',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      }
    ],
  }
}
