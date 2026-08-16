import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AppNav } from "@/components/app-nav";
import { SiteFooter } from "@/components/site-footer";
import { createClient } from "@/lib/supabase/server";
import { urlAvatar } from "@/lib/profilo/avatar";
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
  // `artigiano` (nome/cognome/immagine_profilo, 2026-08-19, vedi CLAUDE.md
  // — riorganizzazione Profilo/Impostazioni): serve all'avatar in
  // navigazione, nuovo punto di accesso a /profilo distinto
  // dall'ingranaggio (/profilo/impostazioni, invariato).
  const [{ data: appuntamentiScaduti }, { data: artigiano }] = await Promise.all([
    user ? supabase.rpc('appuntamenti_scaduti_count') : Promise.resolve({ data: 0 }),
    user ? supabase.from('artigiano').select('nome, cognome, immagine_profilo').eq('id', user.id).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <AppNav
          isLoggedIn={!!user}
          appuntamentiScaduti={appuntamentiScaduti ?? 0}
          nome={artigiano?.nome ?? ''}
          cognome={artigiano?.cognome ?? ''}
          immagineUrl={user && artigiano ? urlAvatar(user.id, artigiano.immagine_profilo) : null}
        />
        <div className="flex-1 flex flex-col min-h-0">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
