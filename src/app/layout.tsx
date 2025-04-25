// app/layout.tsx
import './globals.css'  // your Tailwind imports
import { ReactNode } from 'react'

export const metadata = {
  title: 'Reels Battle',
  description: 'Live screen-share Reels competition',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900">{children}</body>
    </html>
  )
}
