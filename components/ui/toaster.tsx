"use client"

import { useToast } from "@/components/ui/use-toast"
import { motion, AnimatePresence } from "framer-motion"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`rounded-xl border p-4 shadow-lg ${
              t.variant === "destructive" 
                ? "bg-destructive text-destructive-foreground border-destructive/20" 
                : "bg-card text-foreground border-border/50"
            }`}
          >
            {t.title && <div className="font-bold text-sm mb-1">{t.title}</div>}
            {t.description && <div className="text-xs opacity-90">{t.description}</div>}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
