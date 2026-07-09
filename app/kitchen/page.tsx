"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CookingPot, CheckSquare, Square, Check, Info } from "@phosphor-icons/react";
import { PasscodeDialog } from "@/components/shared/PasscodeDialog";
import { createClient } from "@/lib/supabase/client";
import type { Order } from "@/types";
import { PageHeader } from "@/components/page-header";
import { BadgeTag } from "@/components/badge-tag";
import { useToast } from "@/components/ui/use-toast";

export default function KitchenPage() {
  const [passcode, setPasscode] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchOrders = async (supabase: any) => {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*, menus(name, image_url))')
      .in('status', ['pending', 'preparing'])
      .order('created_at', { ascending: true });
      
    if (error) {
       console.error(error);
       setErrorMsg("Gagal mengambil data orders dari database.");
    } else if (data) {
       setOrders(data as Order[]);
    }
  };

  useEffect(() => {
    if (!passcode) return;

    const supabase = createClient();
    fetchOrders(supabase);

    // Dapur harus merender order terbaru walau tidak dipencet.
    // Supabase Realtime *hanya* menembak event tanpa payload JOIN (relasi order_items dan menus tidak ikut).
    // Oleh karena itu, trik terbaik agar selalu akurat adalah: Saat ada perubahan di orders atau order_items, 
    // kita memanggil ulang `fetchOrders()` secara background.
    const channel = supabase.channel('kitchen_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
         if (payload.eventType === 'INSERT') {
             new Audio('/notification.mp3').play().catch(() => {});
         }
         fetchOrders(supabase);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => {
         fetchOrders(supabase);
      })
      .subscribe((status) => {
        if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          toast({ title: "Koneksi Terputus", description: "Mencoba menghubungkan ulang ke Dapur...", variant: "destructive" });
        }
      });

    // Fallback polling (Setiap 5 detik) untuk jaga-jaga kalau event realtime terlewat
    const interval = setInterval(() => fetchOrders(supabase), 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [passcode, toast]);

  const toggleItemCheck = async (itemId: string, currentStatus: boolean, orderId: string) => {
    // Optimistic UI
    setOrders(prev => prev.map(o => o.id === orderId ? {
      ...o,
      order_items: o.order_items?.map(i => i.id === itemId ? { ...i, is_checked: !currentStatus } : i)
    } : o));

    try {
      const res = await fetch('/api/orders/items', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: itemId, is_checked: !currentStatus, passcode })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);
    } catch (e: any) {
      console.error(e); 
      setErrorMsg(e.message || "Gagal update item.");
      setTimeout(() => setErrorMsg(null), 3000);
      const supabase = createClient();
      fetchOrders(supabase); // revert on failure
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    // Optimistic Update
    if (status === 'ready') {
      setOrders(prev => prev.filter(o => o.id !== orderId));
    } else {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: status as any } : o));
    }

    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId, status, passcode, role: 'kitchen' })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);
    } catch (e: any) {
      console.error(e); 
      setErrorMsg(e.message || "Gagal mengubah status.");
      setTimeout(() => setErrorMsg(null), 3000);
      const supabase = createClient();
      fetchOrders(supabase); // revert
    }
  };

  if (!passcode) {
    return <PasscodeDialog isOpen={true} role="kitchen" onSuccess={setPasscode} />;
  }

  return (
    <div className="flex h-[100dvh] w-full flex-col bg-background relative overflow-hidden">
      <PageHeader title="Kitchen Task Board" backHref="/" />

      <AnimatePresence>
        {errorMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="absolute left-1/2 top-20 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl bg-destructive px-6 py-3 text-sm font-bold text-destructive-foreground shadow-lg"
          >
            <Info weight="bold" /> {errorMsg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-x-auto overflow-y-hidden p-6 bg-muted/20 relative">
        <div className="absolute top-6 right-6 z-10">
           <BadgeTag variant="count">{orders.length} Active Orders</BadgeTag>
        </div>
        
        <div className="flex h-full gap-6 pb-4 mt-8">
          <AnimatePresence mode="popLayout">
            {orders.map(order => {
              const allChecked = order.order_items?.every(item => item.is_checked);
              const isPreparing = order.status === 'preparing';
              
              return (
                <motion.div
                  key={order.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, filter: "blur(4px)" }}
                  className={`flex w-80 shrink-0 flex-col overflow-hidden rounded-2xl border transition-all duration-300 shadow-sm ${
                    isPreparing ? 'border-[#e67e80]/30 bg-[#e67e80]/5' : 'border-border/50 bg-card'
                  }`}
                >
                  <div className={`p-5 border-b ${isPreparing ? 'border-[#e67e80]/20 bg-[#e67e80]/10' : 'border-border/50'}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-3xl font-black tracking-tighter text-foreground">
                        #{order.order_number}
                      </span>
                      <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest shadow-sm ${
                        isPreparing ? 'bg-[#e67e80] text-background' : 'bg-muted text-muted-foreground'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-5">
                    <div className="space-y-3">
                      {order.order_items?.map(item => (
                        <motion.div 
                          key={item.id} 
                          layout
                          onClick={() => isPreparing && toggleItemCheck(item.id, item.is_checked, order.id)}
                          className={`flex items-center gap-3 rounded-xl border p-3 transition-all ${
                            !isPreparing ? 'cursor-not-allowed opacity-50 border-border/50 bg-muted/20' :
                            item.is_checked ? 'cursor-pointer border-[#e67e80]/20 bg-[#e67e80]/10 opacity-70' : 
                            'cursor-pointer border-border bg-card shadow-sm hover:border-[#e67e80]/40 hover:shadow-md'
                          }`}
                        >
                          {item.is_checked ? (
                            <CheckSquare weight="fill" className="h-6 w-6 shrink-0 text-[#e67e80]" />
                          ) : (
                            <Square weight="bold" className={`h-6 w-6 shrink-0 ${isPreparing ? 'text-muted-foreground' : 'text-muted-foreground/30'}`} />
                          )}
                          <div className="flex-1 font-semibold text-foreground leading-tight">
                            <span className="mr-2 font-black text-[#e67e80]">{item.qty}x</span>
                            {item.menus?.name}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-border/50 p-5 bg-card">
                    {!isPreparing ? (
                      <button
                        onClick={() => updateOrderStatus(order.id, 'preparing')}
                        className="w-full rounded-xl bg-foreground py-4 min-h-[44px] text-sm font-black tracking-wide text-background shadow-sm transition-transform active:scale-[0.98]"
                      >
                        Start Preparing
                      </button>
                    ) : (
                      <button
                        onClick={() => updateOrderStatus(order.id, 'ready')}
                        disabled={!allChecked}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#e67e80] py-4 min-h-[44px] text-sm font-black tracking-wide text-background shadow-sm transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
                      >
                        <Check weight="bold" className="h-5 w-5" />
                        Complete & Send
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {orders.length === 0 && (
            <div className="flex w-full flex-col items-center justify-center text-muted-foreground gap-4">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-muted/50">
                <CookingPot weight="light" className="h-12 w-12 opacity-50" />
              </div>
              <p className="font-medium text-lg">No active orders. Waiting for customers...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
