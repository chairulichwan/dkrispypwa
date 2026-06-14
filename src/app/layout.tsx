// src/app/layout.tsx
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"

import "./globals.css"
import LayoutProviders from "@/components/LayoutProviders"

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
})

export const metadata: Metadata = {
  title: "Fintech Dashboard",
  description: "Premium Fintech PWA Dashboard",
  manifest: "/manifest.json",
  icons: {
    apple: "/icons/apple-touch-icon.png",
    icon: "/icons/favicon.ico",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Fintech App",
  },
  applicationName: "Fintech Dashboard",
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={inter.variable} data-scroll-behavior="smooth">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="font-sans antialiased min-h-screen">
        <LayoutProviders>{children}</LayoutProviders>
      </body>
    </html>
  )
}
