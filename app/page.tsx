"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Storefront, CookingPot, Receipt, ChartBar } from "@phosphor-icons/react";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as any, stiffness: 300, damping: 24 } }
};

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Selamat pagi";
  if (hour < 15) return "Selamat siang";
  if (hour < 18) return "Selamat sore";
  return "Selamat malam";
}

export default function Home() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '1') router.push('/kiosk');
      if (e.key === '2') router.push('/kitchen');
      if (e.key === '3') router.push('/cashier');
      if (e.key === '4') router.push('/admin');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router]);

  const portals = [
    {
      href: "/kiosk",
      icon: Storefront,
      label: "Customer Kiosk",
      desc: "Layanan pemesanan mandiri",
      shortcut: "1",
      hoverClass: "hover:border-l-[#a7c080] group-hover/icon:text-[#a7c080] group-focus/card:border-l-[#a7c080]",
    },
    {
      href: "/kitchen",
      icon: CookingPot,
      label: "Kitchen Display",
      desc: "Manajemen persiapan pesanan",
      shortcut: "2",
      hoverClass: "hover:border-l-[#e69875] group-hover/icon:text-[#e69875] group-focus/card:border-l-[#e69875]",
    },
    {
      href: "/cashier",
      icon: Receipt,
      label: "Cashier Register",
      desc: "Pemrosesan pembayaran",
      shortcut: "3",
      hoverClass: "hover:border-l-[#7fbbb3] group-hover/icon:text-[#7fbbb3] group-focus/card:border-l-[#7fbbb3]",
    },
    {
      href: "/admin",
      icon: ChartBar,
      label: "Admin Dashboard",
      desc: "Analisis penjualan & revenue",
      shortcut: "4",
      hoverClass: "hover:border-l-[#d699b6] group-hover/icon:text-[#d699b6] group-focus/card:border-l-[#d699b6]",
    }
  ];

  return (
    <div className="flex min-h-[100dvh] w-full flex-col p-6 md:p-12 bg-background relative overflow-hidden">
      {/* Background Decor */}
      <div className="pointer-events-none fixed inset-0 z-0">
         <div className="absolute bottom-0 left-0 right-0 h-1/2 opacity-[0.05] flex items-end justify-center overflow-hidden">
           <svg viewBox="0 0 160 160" className="w-[120%] h-auto min-w-[800px] object-cover -mb-[10%]" preserveAspectRatio="none">
             <rect x="40" y="36" width="20" height="88" rx="6" fill="hsl(var(--foreground))" />
             <rect x="60" y="96" width="54" height="18" rx="6" fill="hsl(var(--primary))" />
             <rect x="60" y="68" width="40" height="18" rx="6" fill="hsl(var(--primary))" />
             <rect x="60" y="40" width="28" height="18" rx="6" fill="hsl(var(--primary))" />
           </svg>
         </div>
      </div>

      {/* Header: Rata Kiri */}
      <header className="z-10 flex w-full items-center justify-between">
        <motion.div 
          initial={{ opacity: 0, x: -20 }} 
          animate={{ opacity: 1, x: 0 }} 
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex items-center gap-4"
        >
          <Logo className="h-8 w-8" />
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Everforest Drive-Thru
          </h1>
        </motion.div>
        
        <div className="flex items-center gap-4">
          {mounted && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="font-mono text-sm font-bold text-muted-foreground"
            >
              {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace(':', '.')} WIB
            </motion.div>
          )}
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content Area */}
      <div className="z-10 flex-1 flex flex-col justify-center items-center w-full max-w-5xl mx-auto -mt-16">
        <div className="w-full">
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.2 }}
            className="mb-6 flex flex-col gap-1"
          >
            {mounted && (
               <span className="text-xs font-semibold text-muted-foreground">
                 {getGreeting()},
               </span>
            )}
            <h2 className="text-sm font-bold text-foreground uppercase tracking-widest">
              Pilih modul operasional
            </h2>
          </motion.div>

          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2"
          >
            {portals.map((portal) => {
              const Icon = portal.icon;
              return (
                <motion.div key={portal.label} variants={itemVariants}>
                  <Link href={portal.href} className="group/card block h-full outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-xl">
                    <Card className={`h-full overflow-hidden border-border bg-card shadow-sm transition-all duration-300 border-l-4 border-l-border/50 hover:bg-muted/10 focus:bg-muted/10 ${portal.hoverClass} relative group`}>
                      
                      {/* Hover Shine / Beam effect */}
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 group-focus/card:opacity-100 transition-opacity duration-700 bg-gradient-to-r from-transparent via-primary/5 to-transparent -skew-x-12 translate-x-[-150%] group-hover:animate-[shimmer_3s_infinite] pointer-events-none" />
                      
                      <CardContent className="flex items-center gap-5 p-6 h-full relative">
                        <div className="flex-shrink-0 transition-colors duration-300 text-muted-foreground group-hover/icon group-focus/card:text-foreground">
                          <Icon weight="duotone" className="h-10 w-10 transition-colors duration-300" />
                        </div>
                        <div className="flex-1 flex flex-col justify-center">
                          <h2 className="font-bold text-lg text-foreground leading-tight">
                            {portal.label}
                          </h2>
                          <p className="text-xs font-medium text-muted-foreground mt-1">
                            {portal.desc}
                          </p>
                        </div>
                        
                        {/* Keyboard Shortcut Badge */}
                        <div className="absolute top-4 right-4 flex items-center justify-center">
                          <kbd className="inline-flex h-6 min-w-[24px] items-center justify-center rounded border border-border/80 bg-muted/30 px-1.5 font-mono text-[11px] font-bold text-muted-foreground shadow-[inset_0_-1px_0_rgba(0,0,0,0.1)] group-hover:text-foreground group-hover:border-border transition-colors">
                            {portal.shortcut}
                          </kbd>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes shimmer {
          100% {
            transform: translateX(150%) skewX(-12deg);
          }
        }
      `}</style>
    </div>
  );
}
