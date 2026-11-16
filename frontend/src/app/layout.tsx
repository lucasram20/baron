import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Baron",
  description:
    "Baron — 100% free, ad-free, local-first League of Legends companion & deep analytics desktop app",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-baron-canvas text-slate-50 antialiased">{children}</body>
    </html>
  );
}
