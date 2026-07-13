"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart } from "@phosphor-icons/react/dist/ssr";
import { CartSidebar } from "./components/CartSidebar";
import { useKioskStore } from "@/lib/store";
import type { Menu, Promo, SelectedOption } from "@/types";
import { useIdleTimer } from "@/hooks/use-idle-timer";
import Image from "next/image";
import { Logo } from "@/components/logo";

const FALLBACK_MENUS: (Menu & { isNew?: boolean, isPopular?: boolean })[] = [
  { id: 'f1', name: 'Signature Double Burger', category: 'Food', price: 45000, image_url: '/images/big-mac.png', is_active: true, isPopular: true },
  { id: 'f2', name: 'Crispy Chicken Nuggets (6 pc)', category: 'Food', price: 25000, image_url: '/images/nuggets.png', is_active: true },
  { id: 'f3', name: 'Salted French Fries (Large)', category: 'Food', price: 18000, image_url: '/images/fries.png', is_active: true, isPopular: true },
  { id: 'f4', name: 'Iced Coca-Cola (Medium)', category: 'Drinks', price: 12000, image_url: '/images/coke.png', is_active: true },
  { id: 'f5', name: 'Vanilla Oreo Sundae', category: 'Dessert', price: 15000, image_url: '/images/mcflurry.png', is_active: true },
  { id: 'f6', name: 'Classic Cheeseburger', category: 'Food', price: 28000, image_url: '/images/big-mac.png', is_active: true },
  { id: 'f7', name: 'Onion Rings', category: 'Food', price: 15000, image_url: '/images/fries.png', is_active: true, isNew: true },
  { id: 'f8', name: 'Iced Lemon Tea', category: 'Drinks', price: 10000, image_url: '/images/coke.png', is_active: true },
];

export default function KioskPage() {
  const [menus, setMenus] = useState<(Menu & { isNew?: boolean, isPopular?: boolean })[]>([]);
  const [loading, setLoading] = useState(true);
  const [optionMenu, setOptionMenu] = useState<Menu | null>(null);
  
  const { isWeekendActive, activePromo, checkWeekendPromo, items, clearCart, selectedMenuId, setSelectedMenuId, addItem } = useKioskStore();
  const { showWarning, dismiss } = useIdleTimer(60000, 10000); 

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/menus?activeOnly=true', { cache: 'no-store' });
        const { menus: menuData } = await res.json();

         if (!res.ok || !menuData || menuData.length === 0) {
           setMenus(FALLBACK_MENUS);
         } else {
           setMenus(menuData);
         }

        const promoRes = await fetch('/api/promos', { cache: 'no-store' });
        const { promos } = await promoRes.json();
        const promoData = promos?.find((p: Promo) => p.name === 'Weekend Special' && p.is_active);

        if (promoData) checkWeekendPromo(promoData as Promo);
      } catch (err) {
        setMenus(FALLBACK_MENUS);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [checkWeekendPromo]);

  // Set default selected item once menus load
  useEffect(() => {
     if (menus.length > 0 && !selectedMenuId) {
       setSelectedMenuId(menus[0].id);
     }
  }, [menus, selectedMenuId, setSelectedMenuId]);

  const displayedMenus = menus;
  const selectedMenu = menus.find(m => m.id === selectedMenuId) || menus[0];

  const formatIDR = (price: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(price);
  };

  const orderMenu = (menu: Menu | undefined) => {
    if (!menu) return;
    if (menu.option_groups && menu.option_groups.length > 0) {
      setOptionMenu(menu);
    } else {
      addItem(menu);
    }
  };

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-background font-sans text-foreground">
      
      {/* Idle Warning Modal */}
      <AnimatePresence>
        {showWarning && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-sm rounded-xl border border-border bg-card p-6 text-center shadow-lg"
            >
              <h2 className="mb-2 text-xl font-bold font-serif">Masih di sana?</h2>
              <p className="mb-6 text-sm text-muted-foreground">Sesi pesanan Anda akan direset karena tidak ada aktivitas.</p>
              <div className="flex gap-3">
                 <button onClick={() => { clearCart(); }} className="flex-1 rounded-lg border border-border/50 bg-background py-3 font-semibold text-muted-foreground hover:bg-muted transition-colors">
                    Batal Pesan
                 </button>
                  <button onClick={dismiss} className="flex-1 rounded-lg bg-primary py-3 font-semibold text-primary-foreground transition-colors">
                     Lanjutkan
                  </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex flex-1 flex-col overflow-hidden relative">
        
        {/* Minimalist Top Navigation */}
        <header className="flex h-24 shrink-0 items-center justify-between px-8 md:px-12 z-20">
          <div className="flex items-center gap-3">
            <Logo className="h-8 w-8" />
            <span className="font-bold tracking-widest uppercase text-xs">Everforest</span>
          </div>
          
          <nav className="flex items-center gap-8">
             <span className="text-sm font-bold uppercase tracking-widest text-foreground border-b-2 border-primary pb-1">
                Menu
             </span>
          </nav>

          <div className="flex items-center">
            {/* Cart trigger handled by Sidebar, but we can put a decorative icon here */}
            <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-muted/30">
               <ShoppingCart weight="bold" className="h-5 w-5 text-foreground" />
               {items.length > 0 && (
                 <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                   {items.reduce((a,b)=>a+b.qty,0)}
                 </span>
               )}
            </div>
          </div>
        </header>

        {/* Main Content: Asymmetrical Overlapping Layout */}
        {loading ? (
           <div className="flex h-full items-center justify-center">
             <div className="h-8 w-8 rounded-full border-2 border-muted border-t-primary animate-spin" />
           </div>
        ) : (
           <div className="flex-1 relative flex">
              
              {/* Left Column: Typography & Central Image */}
              <div className="flex-1 relative flex flex-col justify-center pl-12 md:pl-20">
                 
                 {/* Massive Elegant Typography */}
                  <motion.div 
                     key={selectedMenu?.id}
                     initial={{ opacity: 0, x: -20 }}
                     animate={{ opacity: 1, x: 0 }}
                     className="z-10 absolute left-12 top-1/4 max-w-sm"
                  >
                     <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl font-bold text-foreground leading-[0.85] tracking-tighter mix-blend-multiply opacity-90">
                         {selectedMenu?.name}
                      </h1>
                     <p className="mt-8 text-sm text-muted-foreground font-medium max-w-xs border-l-2 border-primary/30 pl-4">
                        Pilih menu favorit Anda dengan kualitas terbaik dari bahan-bahan segar pilihan.
                     </p>
                  </motion.div>

                 {/* Main Circular Image */}
                  <div className="absolute right-[20%] top-1/2 -translate-y-1/2 -translate-x-12 w-[60vh] h-[60vh] max-w-[600px] max-h-[600px] rounded-full bg-[#fdf6e3] shadow-[inset_0_0_100px_rgba(0,0,0,0.02)] border border-white flex items-center justify-center z-20">
                     <AnimatePresence mode="wait">
                        <motion.div
                          key={selectedMenu?.id}
                          initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
                          animate={{ opacity: 1, scale: 1, rotate: 0 }}
                          exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                          transition={{ type: "spring", stiffness: 200, damping: 20 }}
                          className="relative w-full h-full rounded-full overflow-hidden"
                        >
                          {selectedMenu?.image_url ? (
                            <Image 
                              src={selectedMenu.image_url} 
                              alt={selectedMenu.name}
                              fill
                              className="object-cover"
                              priority
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-8xl grayscale opacity-20">🍔</div>
                          )}
                        </motion.div>
                     </AnimatePresence>

                    {/* Floating CTA */}
                    <AnimatePresence mode="wait">
                      <motion.div
                         key={`price-${selectedMenu?.id}`}
                         initial={{ opacity: 0, y: 20 }}
                         animate={{ opacity: 1, y: 0 }}
                         exit={{ opacity: 0, y: 10, transition: { duration: 0.1 } }}
                         className="absolute -bottom-6 left-1/2 -translate-x-1/2 z-30"
                      >
                         <button 
                           onClick={() => orderMenu(selectedMenu)}
                           className="flex h-14 items-center rounded-full bg-primary pl-6 pr-8 text-primary-foreground font-bold shadow-xl transition-transform hover:scale-105 active:scale-95"
                         >
                           <span className="mr-4 border-r border-primary-foreground/30 pr-4">
                              {formatIDR(selectedMenu?.price || 0)}
                           </span>
                           ORDER NOW
                         </button>
                      </motion.div>
                    </AnimatePresence>
                 </div>
                 
                 {/* Bottom Pagination / Decor */}
                  <div className="absolute bottom-8 left-12 flex items-center gap-6 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                     <button
                       type="button"
                       onClick={() => {
                         const i = menus.findIndex(m => m.id === selectedMenuId);
                         const prev = menus[(i - 1 + menus.length) % menus.length];
                         if (prev) setSelectedMenuId(prev.id);
                       }}
                       className="opacity-50 hover:opacity-100 transition-opacity"
                     >
                       &lt; Prev
                     </button>
                     <span className="text-foreground tabular-nums">
                       {String(menus.findIndex(m => m.id === selectedMenuId) + 1).padStart(2, '0')}
                     </span>
                     <div className="w-16 h-px bg-border"></div>
                     <span className="tabular-nums">{String(menus.length).padStart(2, '0')}</span>
                     <button
                       type="button"
                       onClick={() => {
                         const i = menus.findIndex(m => m.id === selectedMenuId);
                         const next = menus[(i + 1) % menus.length];
                         if (next) setSelectedMenuId(next.id);
                       }}
                       className="opacity-50 hover:opacity-100 transition-opacity"
                     >
                       Next &gt;
                     </button>
                  </div>
              </div>

              {/* Right Column: Overlapping Pill Cards */}
              <div className="w-80 md:w-96 shrink-0 relative z-30 flex flex-col justify-center h-full py-24">
                 {/* Adding a subtle gradient mask for the scrolling list to blend */}
                 <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-background to-transparent z-40 pointer-events-none" />
                 <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-background to-transparent z-40 pointer-events-none" />
                 
                  <div className="flex-1 overflow-y-auto px-4 py-8 space-y-4 no-scrollbar scroll-smooth">
                     {displayedMenus.map((menu) => {
                        const isActive = selectedMenuId === menu.id;
                        
                        return (
                           <motion.div 
                             key={menu.id}
                             role="button"
                             tabIndex={0}
                             aria-pressed={isActive}
                             aria-label={menu.name}
                             onClick={() => setSelectedMenuId(menu.id)}
                             onKeyDown={(e) => {
                               if (e.key === 'Enter' || e.key === ' ') {
                                 e.preventDefault();
                                 setSelectedMenuId(menu.id);
                               }
                             }}
                             className={`relative flex items-center p-3 rounded-full cursor-pointer transition-all duration-300 ${
                              isActive 
                                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105' 
                                : 'bg-card text-foreground shadow-sm hover:shadow-md border border-white'
                            }`}
                          >
                             <div className="h-16 w-16 shrink-0 rounded-full bg-background overflow-hidden shadow-inner relative flex items-center justify-center">
                                {menu.image_url ? (
                                  <Image src={menu.image_url} alt={menu.name} fill className="object-cover" />
                                ) : (
                                  <span className="text-xl opacity-50 grayscale">🍔</span>
                                )}
                             </div>
                              <div className="ml-4 pr-4 flex-1 min-w-0">
                                 <div className="flex items-center gap-2">
                                   {menu.option_groups && menu.option_groups.length > 0 && (
                                     <span className="shrink-0 rounded bg-primary/15 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-primary">
                                       Pilihan
                                     </span>
                                   )}
                                   <h3 className={`text-sm font-bold leading-tight truncate uppercase tracking-wide ${isActive ? 'text-primary-foreground' : 'text-foreground'}`}>
                                     {menu.name}
                                   </h3>
                                 </div>
                                <p className={`text-[10px] mt-1 font-medium ${isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                                  {formatIDR(menu.price)}
                                </p>
                             </div>
                          </motion.div>
                        );
                     })}
                  </div>
              </div>
           </div>
        )}
      </div>

      <AnimatePresence>
        {optionMenu && (
          <OptionModal
            menu={optionMenu}
            formatIDR={formatIDR}
            onClose={() => setOptionMenu(null)}
            onConfirm={(opts) => {
              addItem(optionMenu, opts);
              setOptionMenu(null);
            }}
          />
        )}
      </AnimatePresence>

      <CartSidebar />

      <style jsx global>{`
        /* Hide scrollbar for a cleaner look */
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}

function OptionModal({
  menu,
  formatIDR,
  onClose,
  onConfirm,
}: {
  menu: Menu;
  formatIDR: (n: number) => string;
  onClose: () => void;
  onConfirm: (opts: SelectedOption[]) => void;
}) {
  const groups = menu.option_groups ?? [];
  const [choices, setChoices] = useState<Record<string, string>>({});

  const requiredGroups = groups.filter((g) => g.required);
  const allChosen = requiredGroups.every((g) => choices[g.name]);

  const extra = groups.reduce((sum, g) => {
    const opt = g.options.find((o) => o.label === choices[g.name]);
    return sum + (opt?.price_delta ?? 0);
  }, 0);
  const total = menu.price + extra;

  const confirm = () => {
    if (!allChosen) return;
    const selected: SelectedOption[] = [];
    for (const g of groups) {
      const label = choices[g.name];
      if (!label) continue;
      const opt = g.options.find((o) => o.label === label);
      if (!opt) continue;
      selected.push({ group: g.name, choice: opt.label, price_delta: opt.price_delta });
    }
    onConfirm(selected);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 sm:items-center"
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-card shadow-2xl sm:rounded-3xl"
      >
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-lg font-black uppercase tracking-wide text-foreground">{menu.name}</h2>
          <p className="text-sm text-muted-foreground">Pilih opsi untuk melanjutkan</p>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {groups.map((g) => (
            <div key={g.name}>
              <div className="mb-2 flex items-center gap-2">
                <h3 className="text-sm font-bold uppercase tracking-wide text-foreground">{g.name}</h3>
                {g.required && (
                  <span className="rounded bg-destructive/15 px-1.5 py-0.5 text-[9px] font-black uppercase text-destructive">
                    Wajib
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {g.options.map((o) => {
                  const active = choices[g.name] === o.label;
                  return (
                    <button
                      key={o.label}
                      onClick={() => setChoices((c) => ({ ...c, [g.name]: o.label }))}
                      className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors ${
                        active ? "border-primary bg-primary/10" : "border-border bg-background hover:bg-muted"
                      }`}
                    >
                      <span className="text-sm font-semibold text-foreground">{o.label}</span>
                      <span className="text-xs font-bold text-muted-foreground">
                        {o.price_delta > 0 ? `+${formatIDR(o.price_delta)}` : "—"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 border-t border-border px-6 py-4">
          <button
            onClick={onClose}
            className="h-12 rounded-full border border-border px-5 text-sm font-bold text-foreground"
          >
            Batal
          </button>
          <button
            onClick={confirm}
            disabled={!allChosen}
            className="flex h-12 flex-1 items-center justify-center rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground disabled:opacity-40"
          >
            Tambah · {formatIDR(total)}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
