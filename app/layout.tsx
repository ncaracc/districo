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
  // — riorganizzazione Profilo/Impostazioni; beta_tester/is_admin,
  // 2026-08-22, forum beta — servono qui per decidere se mostrare la
  // voce "Beta Tester" in nav, invariati per il resto). Badge notifiche
  // beta: SOLO per l'admin (`beta_notifiche_admin_count()`, migration
  // 0062) — chiamata solo se `is_admin`, non ha senso interrogarla per
  // chiunque altro (la funzione tornerebbe comunque un numero coerente
  // con quel che l'RLS lascia vedere al chiamante, ma l'unico punto che
  // la userebbe davvero è il badge admin-only).
  const [{ data: appuntamentiScaduti }, { data: artigiano }] = await Promise.all([
    user ? supabase.rpc('appuntamenti_scaduti_count') : Promise.resolve({ data: 0 }),
    user
      ? supabase.from('artigiano').select('nome, cognome, immagine_profilo, beta_tester, is_admin').eq('id', user.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const { data: notificheBeta } = artigiano?.is_admin
    ? await supabase.rpc('beta_notifiche_admin_count')
    : { data: 0 };

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
          isBetaTester={!!artigiano?.beta_tester}
          isAdmin={!!artigiano?.is_admin}
          notificheBeta={notificheBeta ?? 0}
        />
        <div className="flex-1 flex flex-col min-h-0">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
