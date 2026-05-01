import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "QR Pages",
  description: "Host and share interactive HTML pages with QR codes.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
