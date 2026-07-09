export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 160" className={className} role="img" aria-label="Everforest Drive-Thru">
      <rect width="160" height="160" rx="34" fill="hsl(var(--background))" />
      <rect x="40" y="36" width="20" height="88" rx="6" fill="hsl(var(--foreground))" />
      <rect x="60" y="96" width="54" height="18" rx="6" fill="hsl(var(--primary))" />
      <rect x="60" y="68" width="40" height="18" rx="6" fill="hsl(var(--primary))" />
      <rect x="60" y="40" width="28" height="18" rx="6" fill="hsl(var(--primary))" />
    </svg>
  );
}
