import type { Metadata, Viewport } from "next";
import { Nav, TabBar } from "@/components/nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Animus — Private Reading Platform",
  description: "A private, unified library for manga, manhwa, novels, comics and visual novels.",
  applicationName: "Animus",
};

export const viewport: Viewport = {
  themeColor: "#08080b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="aurora" />
        <div className="relative z-10 min-h-screen">
          <Nav />
          <main className="mx-auto max-w-7xl px-3 pb-28 pt-4 sm:px-6 md:pb-16">{children}</main>
          <TabBar />
        </div>
      </body>
    </html>
  );
}
