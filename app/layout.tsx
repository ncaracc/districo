import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AppNav } from "@/components/app-nav";
import { SiteFooter } from "@/components/site-footer";
import { createClient } from "@/lib/supabase/server";
import { leggiOrigineSezione } from "@/lib/nav/origine-sezione.server";
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

  // Badge "appuntamenti scaduti": solo per utenti autenticati — la RPC ha
  // EXECUTE revocato da anon (0027), chiamarla da anonimo fallirebbe.
  const { data: appuntamentiScaduti } = user
    ? await supabase.rpc('appuntamenti_scaduti_count')
    : { data: 0 }

  // Provenienza Dettaglio Lavoro (vedi CLAUDE.md e lib/nav/origine-sezione.ts):
  // letta qui (root layout, Server Component) e passata ad AppNav — un
  // Client Component non può leggere cookies() direttamente, e questo è
  // l'unico punto in cui AppNav viene istanziato.
  const origineSezione = await leggiOrigineSezione();

  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <AppNav isLoggedIn={!!user} appuntamentiScaduti={appuntamentiScaduti ?? 0} origineSezione={origineSezione} />
        <div className="flex-1 flex flex-col min-h-0">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
