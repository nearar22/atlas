export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />
}

export function MapSkeleton() {
  return (
    <div className="grid grid-cols-6 gap-2 p-6" aria-hidden="true">
      {Array.from({ length: 24 }).map((_, i) => (
        <Skeleton key={i} className="aspect-square w-full" />
      ))}
    </div>
  )
}

export function CartoucheSkeleton() {
  return (
    <div className="paper deckle rounded-lg p-5">
      <Skeleton className="h-6 w-2/3" />
      <Skeleton className="mt-3 h-4 w-full" />
      <Skeleton className="mt-2 h-4 w-4/5" />
    </div>
  )
}
