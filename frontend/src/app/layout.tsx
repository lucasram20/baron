import type { ReactNode } from "react";
import { DisableContextMenu } from "@/components/DisableContextMenu";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Baron",
  description:
    "Baron — 100% free, ad-free, local-first League of Legends companion & deep analytics desktop app",
  icons: {
    icon: "/baron_logo.png",
    shortcut: "/favicon.ico",
    apple: "/baron_logo.png",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="bg-baron-chrome text-baron-ink antialiased">
        <DisableContextMenu />
        <ThemeProvider>
          <TooltipProvider delayDuration={180}>{children}</TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
