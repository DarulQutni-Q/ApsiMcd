import { cn } from "@/lib/utils";

interface BadgeTagProps {
  children: React.ReactNode;
  variant?: "count" | "label";
  className?: string;
}

export function BadgeTag({ children, variant = "label", className }: BadgeTagProps) {
  if (variant === "count") {
    return (
      <span className={cn("inline-flex items-center justify-center rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold text-primary-foreground shadow-sm", className)}>
        {children}
      </span>
    );
  }

  // Label variant (kbd-like style)
  return (
    <kbd className={cn("inline-flex h-6 items-center justify-center rounded border border-border/80 bg-muted/30 px-2 font-mono text-[11px] font-bold text-muted-foreground shadow-[inset_0_-1px_0_rgba(0,0,0,0.1)] transition-colors", className)}>
      {children}
    </kbd>
  );
}
