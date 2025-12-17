import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Providers from './providers'
import Header from '@/components/Header'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Job Aggregator - Powered by Motia',
  description: 'Real-time job aggregation from multiple sources',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-900 text-white`}>
        <Providers>
          <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1">
              {children}
            </main>
            <footer className="bg-gray-800 border-t border-gray-700 py-4">
              <div className="container mx-auto px-4 text-center text-gray-400 text-sm">
                Built with Motia - Unified Backend Runtime | Backend Reloaded Hackathon
              </div>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  )
}
