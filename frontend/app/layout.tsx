import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Yantage",
  description: "Advanced Asset Intelligence",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Yantage",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Prevent zoom on inputs
};

import { ClientLayout } from "@/components/ClientLayout";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" crossOrigin="use-credentials" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        data-chart-theme="Morandi"
      >
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}
