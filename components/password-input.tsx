'use client'

import { useState } from 'react'

export function PasswordInput({
  id,
  value,
  onChange,
  className,
  autoComplete,
}: {
  id: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  className: string
  autoComplete?: string
}) {
  const [visibile, setVisibile] = useState(false)

  return (
    <div className="relative">
      <input
        id={id}
        type={visibile ? 'text' : 'password'}
        autoComplete={autoComplete}
        value={value}
        onChange={onChange}
        className={`${className} pr-10`}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setVisibile((v) => !v)}
        aria-label={visibile ? 'Nascondi password' : 'Mostra password'}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
      >
        {visibile ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
            <path d="M3 3l18 18" strokeLinecap="round" />
            <path
              d="M10.58 10.58a2 2 0 002.83 2.83M9.36 5.36A9.77 9.77 0 0112 5c5 0 9 4.5 10 7-.42 1.1-1.18 2.32-2.24 3.44M6.6 6.6C4.6 7.9 3.02 9.8 2 12c1 2.5 5 7 10 7 1.36 0 2.64-.28 3.8-.76"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
            <path
              d="M2 12c1-2.5 5-7 10-7s9 4.5 10 7c-1 2.5-5 7-10 7s-9-4.5-10-7z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="12" cy="12" r="2.5" />
          </svg>
        )}
      </button>
    </div>
  )
}
