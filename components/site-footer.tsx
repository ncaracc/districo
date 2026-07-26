import Link from 'next/link'

export function SiteFooter() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      {/* Stesso contenitore a piena larghezza dell'header (vedi commento in
          app-nav.tsx): niente più max-w-5xl mx-auto, stesso px-4/lg:px-12
          del breakout Dashboard/Conclusi, per allineamento garantito. */}
      <div className="grid grid-cols-1 gap-6 px-4 py-10 text-center md:grid-cols-3 lg:px-12">
        <div className="flex items-center justify-center md:justify-start">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/districo_logo.svg" alt="Districo" className="h-9 w-auto" />
        </div>

        <div className="flex flex-col items-center gap-1">
          <Link href="/privacy" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
            Privacy Policy
          </Link>
          <Link href="/cookie-policy" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
            Cookie Policy
          </Link>
        </div>

        <div className="flex items-center justify-center md:justify-end">
          <a href="mailto:info@districo.it" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
            info@districo.it
          </a>
        </div>
      </div>
    </footer>
  )
}
