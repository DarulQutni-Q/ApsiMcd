import { ReactNode } from "react";
import { Separator } from "@/components/ui/separator";

interface SectionEyebrowProps {
  icon?: ReactNode;
  label: string;
  count?: number;
  colorClass?: string; // e.g. "border-l-primary"
}

export function SectionEyebrow({ icon, label, count, colorClass = "border-l-border" }: SectionEyebrowProps) {
  return (
    <div className={`flex items-center gap-4 mb-5 border-l-4 pl-3 ${colorClass} transition-colors`}>
      <div className="flex items-center gap-2 text-foreground">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </h2>
      </div>
      <Separator className="flex-1" />
      {count !== undefined && (
        <span className="text-xs font-semibold text-muted-foreground">
          &middot; {count} {count === 1 ? 'item' : 'items'}
        </span>
      )}
    </div>
  );
}
