export function LinkedInLogo({ className = 'w-4 h-4 shrink-0' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="4.5" fill="#0A66C2" />
      <path
        d="M7.12 9.48v8.04H4.44V9.48h2.68zm-1.34-4.2c.86 0 1.55.69 1.55 1.55 0 .85-.69 1.54-1.55 1.54s-1.55-.69-1.55-1.54c0-.86.69-1.55 1.55-1.55zm13.78 12.24h-2.68v-4.19c0-1-.02-2.28-1.39-2.28-1.39 0-1.6 1.09-1.6 2.21v4.26h-2.68V9.48h2.57v1.16h.04c.36-.68 1.23-1.39 2.54-1.39 2.71 0 3.21 1.79 3.21 4.11v6.26z"
        fill="#ffffff"
      />
    </svg>
  )
}

export function BdjobsLogo({ className = 'w-4 h-4 shrink-0' }: { className?: string }) {
  return (
    <img
      src="/bdjobs-logo.png"
      alt="Bdjobs"
      loading="eager"
      className={`${className} object-contain rounded-xs shadow-2xs`}
    />
  )
}
