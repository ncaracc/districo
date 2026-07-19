import Link from 'next/link'

export function SiteFooter() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="max-w-5xl mx-auto grid grid-cols-1 gap-6 px-4 py-8 text-center md:grid-cols-3">
        <div className="flex items-center justify-center">
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

        <div className="flex items-center justify-center">
          <a href="mailto:info@districo.it" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
            info@districo.it
          </a>
        </div>
      </div>
    </footer>
  )
}
