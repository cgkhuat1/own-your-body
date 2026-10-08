import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'OwnYourBody',
    short_name: 'OwnYourBody',
    description: 'Nền tảng quản lý tập luyện',
    start_url: '/',
    display: 'standalone',
    background_color: '#F4F1EA',
    theme_color: '#382C24',
    icons: [
      {
        src: '/icon',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png',
      }
    ],
  }
}
