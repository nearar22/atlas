'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

export function Copyable({
  value,
  label,
  className = '',
}: {
  value: string
  label?: string
  className?: string
}) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
    } catch {
      /* clipboard may be unavailable */
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={`inline-flex items-center gap-1.5 font-mono text-[0.78rem] text-sepia hover:text-ink transition-colors ${className}`}
      aria-label={`Copy ${label ?? 'value'} to clipboard`}
      title="Copy to clipboard"
    >
      <span className="truncate">{label ?? value}</span>
      {copied ? (
        <Check size={13} className="text-teal" aria-hidden="true" />
      ) : (
        <Copy size={13} className="opacity-60" aria-hidden="true" />
      )}
    </button>
  )
}
