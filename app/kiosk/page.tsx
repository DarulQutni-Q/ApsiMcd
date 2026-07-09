"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkle, ShoppingCart, Info } from "@phosphor-icons/react/dist/ssr";
import { MenuCard } from "./components/MenuCard";
import { CartSidebar } from "./components/CartSidebar";
import { useKioskStore } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import type { Menu, Promo } from "@/types";
import { BadgeTag } from "@/components/badge-tag";
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
  
  const { isWeekendActive, activePromo, checkWeekendPromo, items, clearCart, activeCategory, setActiveCategory, selectedMenuId, setSelectedMenuId, addItem } = useKioskStore();
  const { showWarning } = useIdleTimer(60000, 10000); 

  useEffect(() => {
    async function loadData() {
      try {
        const supabase = createClient();
        const { data: menuData, error } = await supabase
          .from('menus')
          .select('*')
          .eq('is_active', true)
          .order('category');
          
        if (error || !menuData || menuData.length === 0) {
          setMenus(FALLBACK_MENUS);
        } else {
          // Remap categories to Food/Drinks/Dessert for the new UI
          const processedMenus = menuData.map((m: any) => ({
             ...m,
             category: m.category === 'Burgers' || m.category === 'Chicken' || m.category === 'Sides' ? 'Food' : 
                       m.category === 'Beverages' ? 'Drinks' : 'Dessert',
             isPopular: m.name.includes('Double') || m.name.includes('Fries'),
             isNew: m.name.includes('Rings'),
             image_url: m.image_url?.includes('unsplash.com') 
                ? (m.name.includes('Mac') || m.name.includes('Burger') ? '/images/big-mac.png' : 
                   m.name.includes('Nuggets') ? '/images/nuggets.png' : 
                   m.name.includes('Fries') || m.name.includes('Rings') ? '/images/fries.png' : 
                   m.name.includes('Coke') || m.name.includes('Tea') ? '/images/coke.png' : '/images/mcflurry.png')
                : m.image_url
          }));
          setMenus(processedMenus);
        }

        const { data: promoData } = await supabase
          .from('promos')
          .select('*')
          .eq('name', 'Weekend Special')
          .eq('is_active', true)
          .single();
          
        if (promoData) checkWeekendPromo(promoData as Promo);
      } catch (err) {
        setMenus(FALLBACK_MENUS);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [checkWeekendPromo]);

  // Set default category and selected item
  useEffect(() => {
     if (menus.length > 0 && !activeCategory) {
       setActiveCategory('Food');
     }
  }, [menus, activeCategory, setActiveCategory]);

  useEffect(() => {
     if (menus.length > 0 && activeCategory) {
        const firstInCat = menus.find(m => m.category === activeCategory);
        if (firstInCat) setSelectedMenuId(firstInCat.id);
     }
  }, [activeCategory, menus, setSelectedMenuId]);

  const categories = ['Food', 'Drinks', 'Dessert'];
  const displayedMenus = menus.filter(m => m.category === activeCategory);
  const selectedMenu = menus.find(m => m.id === selectedMenuId) || displayedMenus[0];

  const formatIDR = (price: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(price);
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
                 <button className="flex-1 rounded-lg bg-primary py-3 font-semibold text-primary-foreground transition-colors">
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
             {categories.map(cat => (
                <button 
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`text-sm font-bold transition-colors ${activeCategory === cat ? 'text-foreground border-b-2 border-primary pb-1' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  {cat}
                </button>
             ))}
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
                    key={activeCategory}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="z-10 absolute left-12 top-1/4 max-w-sm"
                 >
                    <h1 className="font-serif text-6xl md:text-8xl lg:text-[140px] font-bold text-foreground leading-[0.8] tracking-tighter mix-blend-multiply opacity-90">
                       {activeCategory?.toLowerCase()}<br/>
                       <span className="text-primary italic">zone</span>
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
                         className="relative w-4/5 h-4/5"
                       >
                         {selectedMenu?.image_url ? (
                           <Image 
                             src={selectedMenu.image_url} 
                             alt={selectedMenu.name}
                             fill
                             className="object-contain drop-shadow-2xl"
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
                           onClick={() => selectedMenu && addItem(selectedMenu)}
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
                    <span className="opacity-50 hover:opacity-100 cursor-pointer">&lt; Prev</span>
                    <span className="text-foreground">01</span>
                    <div className="w-16 h-px bg-border"></div>
                    <span>05</span>
                    <span className="opacity-50 hover:opacity-100 cursor-pointer">Next &gt;</span>
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
                           onClick={() => { setSelectedMenuId(menu.id); addItem(menu); }}
                           className={`relative flex items-center p-3 rounded-full cursor-pointer transition-all duration-300 ${
                             isActive 
                               ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 -ml-12 md:-ml-20 scale-105' 
                               : 'bg-card text-foreground shadow-sm hover:shadow-md border border-white'
                           }`}
                         >
                            <div className="h-16 w-16 shrink-0 rounded-full bg-background overflow-hidden p-1 shadow-inner relative flex items-center justify-center">
                               {menu.image_url ? (
                                 <Image src={menu.image_url} alt={menu.name} fill className="object-contain p-1" />
                               ) : (
                                 <span className="text-xl opacity-50 grayscale">🍔</span>
                               )}
                            </div>
                            <div className="ml-4 pr-4 flex-1">
                               <h3 className={`text-xs font-bold leading-tight line-clamp-2 uppercase tracking-wide ${isActive ? 'text-primary-foreground' : 'text-foreground'}`}>
                                 {menu.name}
                               </h3>
                               {!isActive && (
                                 <p className="text-[10px] text-muted-foreground mt-1 font-medium">Click to select</p>
                               )}
                            </div>
                         </motion.div>
                       );
                    })}
                 </div>
              </div>
           </div>
        )}
      </div>

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
