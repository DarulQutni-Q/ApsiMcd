"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Receipt, CheckCircle, Money, Bank, CreditCard, Wallet, Info } from "@phosphor-icons/react";
import { PasscodeDialog } from "@/components/shared/PasscodeDialog";
import { createClient } from "@/lib/supabase/client";
import type { Order } from "@/types";
import { PageHeader } from "@/components/page-header";
import { BadgeTag } from "@/components/badge-tag";
import { useToast } from "@/components/ui/use-toast";

export default function CashierPage() {
  const [passcode, setPasscode] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const formatIDR = (price: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(price);
  };

  const fetchOrders = async (supabase: any) => {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*, menus(name, image_url))')
      .eq('status', 'ready')
      .order('created_at', { ascending: true });
      
    if (error) {
       console.error(error);
       setErrorMsg("Gagal memuat pesanan dari database.");
    } else if (data) {
       setOrders(data as Order[]);
    }
  };

  useEffect(() => {
    if (!passcode) return;

    const supabase = createClient();
    fetchOrders(supabase);

    const channel = supabase.channel('cashier_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload: any) => {
         if (payload.eventType === 'UPDATE') {
            if (payload.new.status === 'ready') {
               new Audio('/notification.mp3').play().catch(() => {});
            }
         }
         fetchOrders(supabase);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => {
         fetchOrders(supabase);
      })
      .subscribe((status) => {
        if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          toast({ title: "Koneksi Terputus", description: "Mencoba menghubungkan ulang ke Kasir...", variant: "destructive" });
        }
      });

    const interval = setInterval(() => fetchOrders(supabase), 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [passcode, toast]);

  const updateOrderStatus = async (orderId: string) => {
    const paymentMethod = selectedPayment[orderId] || 'Cash';
    
    // Optimistic UI removal
    setOrders(prev => prev.filter(o => o.id !== orderId));

    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          order_id: orderId, 
          status: 'completed', 
          passcode, 
          role: 'cashier',
          payment_method: paymentMethod 
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);
      
      new Audio('/notification.mp3').play().catch(() => {});
    } catch (e: any) {
      console.error(e); 
      setErrorMsg(e.message || "Gagal memproses pembayaran.");
      setTimeout(() => setErrorMsg(null), 3000);
      const supabase = createClient();
      fetchOrders(supabase); // Revert
    }
  };

  const handlePaymentSelect = (orderId: string, method: string) => {
    setSelectedPayment(prev => ({ ...prev, [orderId]: method }));
  };

  if (!passcode) {
    return <PasscodeDialog isOpen={true} role="cashier" onSuccess={setPasscode} />;
  }

  return (
    <div className="flex min-h-[100dvh] w-full flex-col bg-background relative overflow-hidden">
      <PageHeader title="Cashier Register" backHref="/" />

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

      <div className="mx-auto w-full max-w-4xl flex-1 p-6 md:p-8 relative z-10">
        <div className="absolute top-6 right-8 z-10">
           <BadgeTag variant="count">{orders.length} Ready Orders</BadgeTag>
        </div>
        
        <div className="mt-8">
          <AnimatePresence mode="popLayout">
            {orders.map(order => {
               const method = selectedPayment[order.id] || 'Cash';
               
               return (
                <motion.div
                  key={order.id}
                  layout
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -50, scale: 0.95 }}
                  className="mb-8 flex flex-col md:flex-row overflow-hidden rounded-3xl border border-border/50 bg-card shadow-sm"
                >
                  <div className="flex-1 p-6 md:p-8">
                    <div className="mb-6 flex items-center justify-between border-b border-border/50 pb-4">
                      <h2 className="text-4xl font-black text-foreground tracking-tighter">#{order.order_number}</h2>
                      <BadgeTag variant="label" className="text-[#7fbbb3] border-[#7fbbb3]/30 bg-[#7fbbb3]/10 px-3 py-1">
                        Ready to Pay
                      </BadgeTag>
                    </div>
                    
                    <div className="space-y-4">
                      {order.order_items?.map(item => (
                        <div key={item.id} className="flex justify-between items-start text-foreground">
                          <div className="flex gap-3">
                            <span className="font-black text-[#7fbbb3]">{item.qty}x</span>
                            <span className="font-semibold text-muted-foreground">{item.menus?.name}</span>
                          </div>
                          <span className="font-bold">{formatIDR(item.subtotal_price)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col justify-between border-t border-border/50 bg-muted/20 p-6 md:p-8 md:w-96 md:border-l md:border-t-0">
                    <div className="space-y-3 text-sm font-medium">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Subtotal</span>
                        <span className="text-foreground">{formatIDR(order.subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Tax (10%)</span>
                        <span className="text-foreground">{formatIDR(order.tax_amount)}</span>
                      </div>
                      {order.discount_amount > 0 && (
                        <div className="flex justify-between font-bold text-primary">
                          <span>Discount</span>
                          <span>-{formatIDR(order.discount_amount)}</span>
                        </div>
                      )}
                      <div className="my-4 border-t border-border/50 border-dashed" />
                      <div className="flex justify-between text-3xl font-black text-foreground tracking-tight">
                        <span>Total</span>
                        <span className="text-[#7fbbb3]">{formatIDR(order.total_price)}</span>
                      </div>
                    </div>

                    <div className="mt-8">
                      <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">Payment Method</h3>
                      <div className="grid grid-cols-2 gap-2 mb-6">
                        <button 
                          onClick={() => handlePaymentSelect(order.id, 'Cash')}
                          className={`flex flex-col items-center justify-center gap-2 rounded-xl border p-3 transition-all ${method === 'Cash' ? 'border-[#7fbbb3] bg-[#7fbbb3]/10 text-[#7fbbb3] shadow-sm' : 'border-border/50 bg-background text-muted-foreground hover:border-[#7fbbb3]/50'}`}
                        >
                          <Money weight={method === 'Cash' ? "fill" : "regular"} className="h-6 w-6" />
                          <span className="text-xs font-bold">Cash</span>
                        </button>
                        <button 
                          onClick={() => handlePaymentSelect(order.id, 'Card')}
                          className={`flex flex-col items-center justify-center gap-2 rounded-xl border p-3 transition-all ${method === 'Card' ? 'border-[#7fbbb3] bg-[#7fbbb3]/10 text-[#7fbbb3] shadow-sm' : 'border-border/50 bg-background text-muted-foreground hover:border-[#7fbbb3]/50'}`}
                        >
                          <CreditCard weight={method === 'Card' ? "fill" : "regular"} className="h-6 w-6" />
                          <span className="text-xs font-bold">Card</span>
                        </button>
                        <button 
                          onClick={() => handlePaymentSelect(order.id, 'QRIS')}
                          className={`flex flex-col items-center justify-center gap-2 rounded-xl border p-3 transition-all ${method === 'QRIS' ? 'border-[#7fbbb3] bg-[#7fbbb3]/10 text-[#7fbbb3] shadow-sm' : 'border-border/50 bg-background text-muted-foreground hover:border-[#7fbbb3]/50'}`}
                        >
                          <Wallet weight={method === 'QRIS' ? "fill" : "regular"} className="h-6 w-6" />
                          <span className="text-xs font-bold">QRIS</span>
                        </button>
                        <button 
                          onClick={() => handlePaymentSelect(order.id, 'Transfer')}
                          className={`flex flex-col items-center justify-center gap-2 rounded-xl border p-3 transition-all ${method === 'Transfer' ? 'border-[#7fbbb3] bg-[#7fbbb3]/10 text-[#7fbbb3] shadow-sm' : 'border-border/50 bg-background text-muted-foreground hover:border-[#7fbbb3]/50'}`}
                        >
                          <Bank weight={method === 'Transfer' ? "fill" : "regular"} className="h-6 w-6" />
                          <span className="text-xs font-bold">Transfer</span>
                        </button>
                      </div>

                      <button
                        onClick={() => updateOrderStatus(order.id)}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#7fbbb3] py-5 font-black text-background shadow-md transition-transform active:scale-[0.98]"
                      >
                        <CheckCircle weight="bold" className="h-6 w-6" />
                        Complete Transaction
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          
          {orders.length === 0 && (
            <div className="mt-32 flex flex-col items-center justify-center text-muted-foreground">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-muted/50 mb-6 shadow-inner">
                <CheckCircle weight="light" className="h-12 w-12 opacity-50" />
              </div>
              <p className="text-xl font-medium tracking-tight">No orders pending payment.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
