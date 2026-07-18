import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import SwRegister from "@/components/SwRegister";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Homebase",
  description:
    "Your household command center. Never forget bills, maintenance, or household tasks again.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-192x192.png",
    // iOS home-screen install (kids' devices) reads apple-touch-icon.
    apple: "/icons/icon-192x192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Homebase",
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SwRegister />
        {children}
      </body>
    </html>
  );
}
