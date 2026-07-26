import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Default di Next.js per le Server Actions è 1 MB — troppo poco per una
    // foto da smartphone (spesso 2-10 MB). Allineato al client_max_body_size
    // 20M già configurato su Nginx per districo.it (vedi CLAUDE.md).
    serverActions: {
      bodySizeLimit: "20mb",
    },
    // Limite SEPARATO e indipendente dal precedente: middleware.ts (attivo su
    // ogni richiesta per l'autenticazione) fa clonare a Next.js il body della
    // richiesta fino a questo limite (default 10 MB) — se superato, il body
    // viene troncato silenziosamente invece di essere rifiutato, causando un
    // errore di parsing del multipart ("Unexpected end of form") a valle.
    // Scoperto empiricamente durante il fix del limite di upload allegati:
    // alzare solo serverActions.bodySizeLimit non basta, va alzato anche
    // questo. Vecchio nome `middlewareClientMaxBodySize`, deprecato in
    // questa versione di Next.js a favore di `proxyClientMaxBodySize`.
    proxyClientMaxBodySize: "20mb",
  },
};

export default nextConfig;
