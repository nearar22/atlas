import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Atlas | The Shared World Cartographer',
  description:
    'An on-chain AI canon-keeper for a single shared fictional world. Claim a region of the living parchment map, write its lore, and let the Cartographer rule it CANON, CONTESTED, or APOCRYPHA under GenLayer validator consensus.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cardo:ital,wght@0,400;0,700;1,400&family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Spline+Sans+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
