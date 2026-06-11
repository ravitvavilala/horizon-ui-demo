import type { Metadata } from "next";
import { JetBrains_Mono, Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { AppShell } from "@/components/shell/AppShell";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { cn } from "@/lib/utils";

// Body + headings = Inter, mono = JetBrains Mono (Sera/Mauve preset
// b6aLGwHoO, 2026-06-09).
const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Horizon",
  description: "Revenue minus expenses equals profit.",
};

export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(jetbrains.variable, "font-sans", inter.variable)}
    >
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <Providers>
          <AppShell>{children}</AppShell>
          <ChatWidget />
        </Providers>
      </body>
    </html>
  );
}
