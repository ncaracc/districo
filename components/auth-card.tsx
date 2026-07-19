export function AuthCard({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`rounded-2xl bg-gray-50 shadow-sm p-6 sm:p-8 ${className}`}>{children}</div>
  )
}
