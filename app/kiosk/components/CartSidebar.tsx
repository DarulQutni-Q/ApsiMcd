"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart, Minus, Plus, Trash, CheckCircle } from "@phosphor-icons/react";
import { useKioskStore } from "@/lib/store";
import { submitCheckout } from "../actions";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BadgeTag } from "@/components/badge-tag";

export function CartSidebar() {
  const { items, activePromo, isWeekendActive, updateQty, removeItem, clearCart, getSubtotal, getTax, getDiscount, getTotal } = useKioskStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successOrder, setSuccessOrder] = useState<number | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const formatIDR = (price: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(price);
  };

  const handleConfirmClick = () => {
    if (items.length === 0) return;
    setIsConfirmOpen(true);
  };

  const executeCheckout = async () => {
    setIsSubmitting(true);
    try {
      const payload = {
        items: items.map(i => ({ menu_id: i.menu.id, qty: i.qty })),
        promo_id: isWeekendActive && activePromo ? activePromo.id : null
      };
      const res = await submitCheckout(payload);
      if (res.success) {
        setSuccessOrder(res.order_number);
        setIsConfirmOpen(false);
        clearCart();
        setTimeout(() => setSuccessOrder(null), 5000); 
      } else {
        alert("Checkout failed: " + res.error);
      }
    } catch (error: any) {
      console.error(error);
      alert("Checkout failed. Please try again. " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (successOrder) {
    return (
      <div className="flex h-full w-full sm:w-[380px] flex-col items-center justify-center bg-card p-8 shadow-2xl border-l z-30">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center text-center w-full">
          <CheckCircle weight="fill" className="h-20 w-20 text-primary mb-6 drop-shadow-sm" />
          <h2 className="text-2xl font-black tracking-tight text-foreground">Order Received!</h2>
          <p className="mt-2 text-sm font-medium text-muted-foreground">Please wait for your number.</p>
          <div className="mt-8 rounded-xl bg-primary/10 border border-primary/20 p-8 w-full shadow-inner">
            <span className="text-xs font-bold uppercase tracking-widest text-primary">Order No.</span>
            <div className="mt-2 text-6xl font-black text-primary">#{successOrder}</div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <>
      <div className="flex h-full w-full sm:w-[380px] flex-col bg-card shadow-2xl border-l z-30">
        {/* Sidebar Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border/50 p-6 bg-card/50 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShoppingCart weight="duotone" className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">Your Order</h2>
          </div>
          <BadgeTag variant="count">
            {items.reduce((acc, i) => acc + i.qty, 0)}
          </BadgeTag>
        </div>

        {/* Cart Items Area */}
        <ScrollArea className="flex-1 p-6">
          <AnimatePresence initial={false}>
            {items.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex h-64 flex-col items-center justify-center text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted/50 mb-4">
                  <ShoppingCart weight="light" className="h-10 w-10 text-muted-foreground/50" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">Your cart is empty.</p>
              </motion.div>
            ) : (
              <div className="flex flex-col gap-4">
                {items.map((item) => (
                  <motion.div 
                    key={item.menu.id}
                    layout
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex flex-col gap-3 rounded-xl border border-border/60 bg-background p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between">
                      <h4 className="text-sm font-bold leading-tight text-foreground line-clamp-2 pr-4">{item.menu.name}</h4>
                      <span className="text-sm font-bold text-foreground shrink-0">{formatIDR(item.menu.price * item.qty)}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs font-medium text-muted-foreground">{formatIDR(item.menu.price)} / ea</span>
                      <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
                        <button onClick={() => updateQty(item.menu.id, item.qty - 1)} className="flex h-8 w-8 items-center justify-center rounded-md bg-background text-foreground shadow-sm hover:text-primary transition-colors active:scale-95">
                          {item.qty === 1 ? <Trash weight="bold" className="h-4 w-4" /> : <Minus weight="bold" className="h-4 w-4" />}
                        </button>
                        <span className="w-8 text-center text-sm font-bold">{item.qty}</span>
                        <button onClick={() => updateQty(item.menu.id, item.qty + 1)} className="flex h-8 w-8 items-center justify-center rounded-md bg-background text-foreground shadow-sm hover:text-primary transition-colors active:scale-95">
                          <Plus weight="bold" className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>
        </ScrollArea>

        {/* Checkout Footer */}
        <div className="shrink-0 border-t border-border/50 bg-muted/10 p-6">
          <div className="space-y-2 text-sm font-medium">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span className="text-foreground">{formatIDR(getSubtotal())}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Tax (10%)</span>
              <span className="text-foreground">{formatIDR(getTax())}</span>
            </div>
            <AnimatePresence>
              {isWeekendActive && activePromo && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="flex justify-between font-bold text-primary pt-1">
                  <span>{activePromo.name}</span>
                  <span>-{formatIDR(getDiscount())}</span>
                </motion.div>
              )}
            </AnimatePresence>
            <Separator className="my-4 bg-border/50" />
            <div className="flex justify-between text-xl font-black text-foreground">
              <span>Total</span>
              <span>{formatIDR(getTotal())}</span>
            </div>
          </div>
          
          <Button 
            onClick={handleConfirmClick}
            disabled={items.length === 0}
            className="mt-6 w-full rounded-xl py-6 text-base font-bold shadow-sm transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
          >
            <span>Checkout</span><ShoppingCart weight="bold" className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>

      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight">Confirm Order</DialogTitle>
            <DialogDescription className="text-sm">
              Please review your order. Once submitted, it will be sent directly to the kitchen.
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[300px] w-full rounded-lg border border-border/50 bg-muted/30 p-4 my-4">
            {items.map((item) => (
              <div key={item.menu.id} className="flex justify-between py-3 border-b border-border/50 last:border-0 text-sm">
                <span className="font-medium text-muted-foreground"><strong className="text-foreground mr-2">{item.qty}x</strong>{item.menu.name}</span>
                <span className="font-bold text-foreground">{formatIDR(item.menu.price * item.qty)}</span>
              </div>
            ))}
          </ScrollArea>
          
          <div className="flex justify-between items-center py-2 px-2 text-lg font-bold">
             <span>Total to Pay</span>
             <span className="text-primary">{formatIDR(getTotal())}</span>
          </div>

          <DialogFooter className="mt-4 gap-3 sm:gap-2">
            <Button variant="outline" className="rounded-lg font-semibold" onClick={() => setIsConfirmOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button className="rounded-lg font-semibold" onClick={executeCheckout} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="h-4 w-4 mr-2 rounded-full border-2 border-primary-foreground border-t-transparent" />
                  Processing...
                </>
              ) : (
                "Place Order"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
