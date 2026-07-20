"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Storefront, CookingPot, Wallet, ShoppingBag, ChartBar } from "@phosphor-icons/react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Selamat pagi";
  if (hour < 15) return "Selamat siang";
  if (hour < 18) return "Selamat sore";
  return "Selamat malam";
}

const portals = [
  {
    href: "/kiosk",
    icon: Storefront,
    label: "Customer Kiosk",
    desc: "Layanan pemesanan mandiri.",
    shortcut: "1",
  },
  {
    href: "/kitchen",
    icon: CookingPot,
    label: "Kitchen Display",
    desc: "Manajemen persiapan pesanan.",
    shortcut: "2",
  },
  {
    href: "/payment",
    icon: Wallet,
    label: "Pembayaran",
    desc: "Proses pembayaran pelanggan.",
    shortcut: "3",
  },
  {
    href: "/pickup",
    icon: ShoppingBag,
    label: "Pengambilan",
    desc: "Serahkan pesanan yang lunas.",
    shortcut: "4",
  },
  {
    href: "/admin",
    icon: ChartBar,
    label: "Admin Dashboard",
    desc: "Analisis penjualan & revenue.",
    shortcut: "5",
  },
];

export default function Home() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "1") router.push("/kiosk");
      if (e.key === "2") router.push("/kitchen");
      if (e.key === "3") router.push("/payment");
      if (e.key === "4") router.push("/pickup");
      if (e.key === "5") router.push("/admin");
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  return (
    <div className="relative flex min-h-[100dvh] w-full flex-col bg-background text-foreground">
      {/* Subtle dot texture — the only nod to the everforest pattern */}
      <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.35] bg-everforest-pattern" aria-hidden />

      {/* Header */}
      <header className="sticky top-0 z-20 flex w-full items-center justify-between border-b border-border/60 bg-background/80 px-6 py-4 backdrop-blur md:px-12">
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex items-center gap-3"
        >
          <Logo className="h-7 w-7" />
          <span className="font-serif text-lg font-bold tracking-tight">
            Everforest Drive-Thru
          </span>
        </motion.div>

        <div className="flex items-center gap-4">
          {mounted && (
            <span className="font-mono text-xs font-bold text-muted-foreground">
              {new Date()
                .toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                })
                .replace(":", ".")}{" "}
              WIB
            </span>
          )}
          <ThemeToggle />
        </div>
      </header>

      {/* Hero */}
      <main className="z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-6 py-20 md:px-12 md:py-28">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-5"
        >
          {mounted && (
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              {getGreeting()},
            </span>
          )}
          <h1 className="font-serif text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl">
            Satu alur.
            <br />
            Tanpa hambatan.
          </h1>
          <p className="max-w-xl text-base font-medium text-muted-foreground md:text-lg">
            Empat modul operasional dalam satu meja. Pilih station untuk
            memulai pesanan, memasak, membayar, atau melihat performa toko.
          </p>
        </motion.div>

        {/* Modules */}
        <div className="mt-14 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border/60 bg-border/60 sm:grid-cols-2">
          {portals.map((portal, i) => {
            const Icon = portal.icon;
            return (
              <motion.div
                key={portal.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.5,
                  delay: 0.15 + i * 0.08,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                <Link
                  href={portal.href}
                  className="group flex h-full items-center gap-4 bg-background p-6 transition-colors duration-200 hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary md:p-7"
                >
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors duration-200 group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon weight="duotone" className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <h2 className="font-serif text-xl font-bold tracking-tight">
                      {portal.label}
                    </h2>
                    <p className="mt-0.5 text-sm font-medium text-muted-foreground">
                      {portal.desc}
                    </p>
                  </div>
                  <kbd className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded border border-border/80 bg-muted/30 font-mono text-xs font-bold text-muted-foreground transition-colors group-hover:border-primary/40 group-hover:text-primary">
                    {portal.shortcut}
                  </kbd>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </main>

      {/* Footer */}
      <footer className="z-10 border-t border-border/60 px-6 py-5 md:px-12">
        <p className="font-mono text-xs text-muted-foreground">
          ApsiMcd · Tekan 1–4 untuk membuka modul
        </p>
      </footer>
    </div>
  );
}
