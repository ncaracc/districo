import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AppNav } from "@/components/app-nav";
import { SiteFooter } from "@/components/site-footer";
import { createClient } from "@/lib/supabase/server";
import "./globals.css";

// Font sans-serif di default per tutta l'app (il serif resta esclusivamente
// nel logo). Caricato via next/font/google: stesso meccanismo già in uso per
// Geist in precedenza — self-hosted da Next.js in fase di build, nessuna
// richiesta a runtime verso i server Google.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Districo - l'assistente per l'artigiano",
  description: "Districo - l'assistente per l'artigiano",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <AppNav isLoggedIn={!!user} />
        <div className="flex-1 flex flex-col min-h-0">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
