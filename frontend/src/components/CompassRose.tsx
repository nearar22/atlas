'use client'

// A hand-drawn antique compass rose. Pure SVG, no images.
export function CompassRose({ size = 88, drift = false }: { size?: number; drift?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      role="img"
      aria-label="Compass rose"
      className={drift ? 'compass-drift' : undefined}
    >
      <circle cx="60" cy="60" r="56" fill="none" stroke="var(--sepia)" strokeWidth="1.2" opacity="0.5" />
      <circle cx="60" cy="60" r="44" fill="none" stroke="var(--sepia)" strokeWidth="0.8" opacity="0.4" />
      <circle cx="60" cy="60" r="6" fill="none" stroke="var(--rust)" strokeWidth="1.4" />
      {/* secondary diagonal points */}
      <g opacity="0.7">
        <path d="M60 60 L86 34 L66 56 Z" fill="var(--teal)" opacity="0.45" />
        <path d="M60 60 L34 86 L54 64 Z" fill="var(--teal)" opacity="0.45" />
        <path d="M60 60 L86 86 L64 66 Z" fill="var(--teal)" opacity="0.3" />
        <path d="M60 60 L34 34 L56 54 Z" fill="var(--teal)" opacity="0.3" />
      </g>
      {/* primary cardinal star */}
      <path d="M60 6 L67 60 L60 60 Z" fill="var(--rust)" />
      <path d="M60 6 L53 60 L60 60 Z" fill="var(--ink)" opacity="0.75" />
      <path d="M60 114 L67 60 L60 60 Z" fill="var(--ink)" opacity="0.75" />
      <path d="M60 114 L53 60 L60 60 Z" fill="var(--sepia)" />
      <path d="M6 60 L60 53 L60 60 Z" fill="var(--ink)" opacity="0.6" />
      <path d="M6 60 L60 67 L60 60 Z" fill="var(--sepia)" />
      <path d="M114 60 L60 53 L60 60 Z" fill="var(--sepia)" />
      <path d="M114 60 L60 67 L60 60 Z" fill="var(--ink)" opacity="0.6" />
      <text x="60" y="20" textAnchor="middle" fontSize="11" fill="var(--ink)" fontFamily="var(--font-display), serif">
        N
      </text>
    </svg>
  )
}
