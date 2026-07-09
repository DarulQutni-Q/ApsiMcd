"use client";

import { motion } from "framer-motion";
import { Plus } from "@phosphor-icons/react/dist/ssr";
import { Menu } from "@/types";
import { useKioskStore } from "@/lib/store";
import { useState } from "react";
import { BadgeTag } from "@/components/badge-tag";
import Image from "next/image";

export function MenuCard({ menu, isPopular, isNew }: { menu: Menu, isPopular?: boolean, isNew?: boolean }) {
  const addItem = useKioskStore(state => state.addItem);
  const [imageError, setImageError] = useState(false);

  const formatIDR = (price: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(price);
  };

  return (
    <motion.div 
      whileHover={{ y: -4, scale: 1.02 }} 
      whileTap={{ scale: 0.98 }} 
      className="group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-lg hover:shadow-primary/5"
      onClick={() => addItem(menu)}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted/50">
        {!imageError && menu.image_url ? (
          <Image 
            src={menu.image_url} 
            alt={menu.name} 
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            onError={() => setImageError(true)}
            className="object-cover transition-transform duration-500 group-hover:scale-105" 
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-primary/5">
            <span className="text-4xl opacity-50 grayscale">🍔</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
        
        {/* Status Tags */}
        <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
          {isPopular && <BadgeTag variant="label" className="bg-background/80 backdrop-blur-sm border-none shadow-sm text-[#e67e80]">Populer</BadgeTag>}
          {isNew && <BadgeTag variant="label" className="bg-background/80 backdrop-blur-sm border-none shadow-sm text-[#a7c080]">Baru</BadgeTag>}
        </div>
      </div>
      
      <div className="flex flex-1 flex-col justify-between p-4 bg-card z-10">
        <h3 className="line-clamp-2 text-sm font-semibold leading-tight text-foreground">
          {menu.name}
        </h3>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-sm font-bold text-primary">
            {formatIDR(menu.price)}
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
            <Plus weight="bold" className="h-4 w-4" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
