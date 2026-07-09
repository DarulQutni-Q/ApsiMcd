"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

interface PageHeaderProps {
  title: string;
  backHref?: string;
}

export function PageHeader({ title, backHref }: PageHeaderProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="z-20 flex h-16 w-full shrink-0 items-center justify-between border-b border-border/50 bg-card/80 px-6 backdrop-blur-xl sticky top-0 shadow-sm">
      <div className="flex items-center gap-4">
        {backHref && (
          <Link href={backHref} className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/50 bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <ArrowLeft weight="bold" />
          </Link>
        )}
        <div className="flex items-center gap-3">
          <Logo className="h-8 w-8" />
          <h1 className="text-xl font-bold tracking-tight text-foreground">{title}</h1>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        {mounted && (
          <div className="font-mono text-sm font-bold text-muted-foreground">
            {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace(':', '.')} WIB
          </div>
        )}
        <ThemeToggle />
      </div>
    </header>
  );
}
