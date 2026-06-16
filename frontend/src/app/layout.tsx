import type { Metadata } from 'next'
import { IM_Fell_English_SC, EB_Garamond, Cutive_Mono } from 'next/font/google'
import './globals.css'

const display = IM_Fell_English_SC({
  weight: ['400'],
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})

const body = EB_Garamond({
  weight: ['400', '500', '600'],
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
})

const mono = Cutive_Mono({
  weight: ['400'],
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'ATLAS - a shared world charted under consensus',
  description:
    'A living antique world map on GenLayer. Claim a region of the shared parchment, write its lore, and an on-chain AI Cartographer rules it CANON, CONTESTED, or APOCRYPHA under validator consensus. Only CANON regions occupy the map.',
  openGraph: {
    title: 'ATLAS',
    description:
      'Claim the shared world. An on-chain AI Cartographer judges each region under validator consensus on GenLayer Bradbury Testnet.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ATLAS',
    description:
      'A shared antique world charted region by region, judged CANON under consensus.',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable} ${mono.variable}`}>{children}</body>
    </html>
  )
}
