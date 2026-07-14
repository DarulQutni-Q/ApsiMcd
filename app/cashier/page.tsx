"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Money, Bank, CreditCard, Wallet, Info, XCircle, Printer } from "@phosphor-icons/react";
import { PasscodeDialog } from "@/components/shared/PasscodeDialog";
import type { Order } from "@/types";
import { PageHeader } from "@/components/page-header";
import { BadgeTag } from "@/components/badge-tag";
import { useToast } from "@/components/ui/use-toast";
import { LiveIndicator } from "@/components/live-indicator";
import { Receipt } from "@/components/receipt";

export default function CashierPage() {
  const [passcode, setPasscode] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<Record<string, string>>({});
  const [cashReceived, setCashReceived] = useState<Record<string, string>>({});
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [previewOrder, setPreviewOrder] = useState<Order | null>(null);
  const [paidReceipt, setPaidReceipt] = useState<{ order: Order; method: string } | null>(null);
  const { toast } = useToast();

  const formatIDR = (price: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(price);
  };

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/orders?status=ready', { cache: 'no-store' });
      const { orders: data } = await res.json();
      if (!res.ok) throw new Error();
      setLastSync(Date.now());
      setOrders((prev) => {
        if (data.length > prev.length) {
          new Audio('/notification.mp3').play().catch(() => {});
        }
        return data as Order[];
      });
    } catch {
      setErrorMsg("Gagal memuat pesanan.");
    }
  };

  useEffect(() => {
    if (!passcode) return;

    fetchOrders();
    // Offline: no realtime; poll every 2 seconds.
    const interval = setInterval(fetchOrders, 2000);

    return () => clearInterval(interval);
  }, [passcode]);

  // Auto-dismiss the post-payment receipt popup after 8 seconds.
  useEffect(() => {
    if (!paidReceipt) return;
    const t = setTimeout(() => setPaidReceipt(null), 8000);
    return () => clearTimeout(t);
  }, [paidReceipt]);

  const updateOrderStatus = async (orderId: string) => {
    const paymentMethod = selectedPayment[orderId] || 'Cash';
    const paidOrder = orders.find(o => o.id === orderId) || null;
    const items = paidOrder?.order_items ?? [];

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
      if (paidOrder) {
        setPaidReceipt({ order: { ...paidOrder, payment_method: paymentMethod }, method: paymentMethod });
      }
    } catch (e: any) {
      console.error(e); 
      setErrorMsg(e.message || "Gagal memproses pembayaran.");
      setTimeout(() => setErrorMsg(null), 3000);
      fetchOrders(); // Revert
    }
  };

  const handlePaymentSelect = (orderId: string, method: string) => {
    setSelectedPayment(prev => ({ ...prev, [orderId]: method }));
  };

  const cancelOrder = async (orderId: string) => {
    const ok = window.confirm("Batalkan pesanan ini?");
    if (!ok) return;
    setOrders(prev => prev.filter(o => o.id !== orderId));
    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId, status: 'cancelled', passcode, role: 'cashier' })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);
      toast({ title: "Pesanan dibatalkan", description: `#${orders.find(o => o.id === orderId)?.order_number}` });
    } catch (e: any) {
      setErrorMsg(e.message || "Gagal membatalkan pesanan.");
      setTimeout(() => setErrorMsg(null), 3000);
      fetchOrders();
    }
  };

  const printReceipt = () => window.print();

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

      <div className="fixed top-20 right-6 z-50">
        <BadgeTag variant="count">{orders.length} Ready Orders</BadgeTag>
      </div>

      <LiveIndicator lastSync={lastSync} />

      <div className="mx-auto w-full max-w-4xl flex-1 p-6 md:p-8 relative z-10">
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
                   className="mb-6 flex flex-col overflow-hidden rounded-2xl border border-border bg-card"
                 >
                   <div className="flex flex-col md:flex-row">
                     {/* Order details */}
                     <div className="flex-1 p-6 md:p-8">
                        <div className="mb-6 flex items-center justify-between border-b border-border/50 pb-4">
                          <h2 className="text-4xl font-black tracking-tighter text-foreground">#{order.order_number}</h2>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setPreviewOrder(order)}
                              className="flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1 text-xs font-bold text-muted-foreground transition-colors hover:border-[#7fbbb3]/40 hover:text-[#7fbbb3]"
                            >
                              <Printer weight="bold" className="h-3.5 w-3.5" /> Struk
                            </button>
                            <button
                              onClick={() => cancelOrder(order.id)}
                              className="flex items-center gap-1 rounded-full border border-[#e67e80]/30 bg-[#e67e80]/10 px-3 py-1 text-xs font-bold text-[#e67e80] transition-colors hover:bg-[#e67e80]/20"
                            >
                              <XCircle weight="bold" className="h-3.5 w-3.5" /> Batal
                            </button>
                            <span className="rounded-full border border-[#7fbbb3]/30 bg-[#7fbbb3]/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-[#7fbbb3]">
                              Ready to Pay
                            </span>
                          </div>
                        </div>

                       <div className="space-y-3">
                          {order.order_items?.map(item => (
                            <div
                              key={item.id}
                              className="flex items-start justify-between gap-3 text-foreground"
                            >
                              <div className="flex items-center gap-3">
                                <span className="font-black text-[#7fbbb3]">{item.qty}x</span>
                                <span className="font-medium text-muted-foreground">
                                  {item.menus?.name}
                                  {item.selected_options && item.selected_options.length > 0 && (
                                    <span className="ml-1 text-[11px] text-muted-foreground/70">({item.selected_options.map(o => o.choice).join(", ")})</span>
                                  )}
                                </span>
                              </div>
                              <span className="font-semibold">{formatIDR(item.subtotal_price)}</span>
                            </div>
                          ))}
                       </div>
                     </div>

                     {/* Payment */}
                     <div className="flex flex-col justify-between border-t border-border bg-muted/20 p-6 md:w-96 md:border-l md:border-t-0 md:p-8">
                       <div className="space-y-2 text-sm font-medium">
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
                         <div className="my-3 border-t border-dashed border-border" />
                         <div className="flex items-baseline justify-between text-2xl font-black tracking-tight text-foreground">
                           <span>Total</span>
                           <span className="text-[#7fbbb3]">{formatIDR(order.total_price)}</span>
                         </div>
                       </div>

                       <div className="mt-6">
                         <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">Metode Pembayaran</h3>
                         <div className="grid grid-cols-4 gap-2">
                           {(['Cash', 'Card', 'QRIS', 'Transfer'] as const).map((m) => (
                             <button
                               key={m}
                               onClick={() => handlePaymentSelect(order.id, m)}
                               className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 transition-all ${
                                 method === m
                                   ? 'border-[#7fbbb3] bg-[#7fbbb3]/10 text-[#7fbbb3]'
                                   : 'border-border bg-background text-muted-foreground hover:border-[#7fbbb3]/40'
                               }`}
                             >
                               {m === 'Cash' && <Money weight={method === 'Cash' ? 'fill' : 'regular'} className="h-5 w-5" />}
                               {m === 'Card' && <CreditCard weight={method === 'Card' ? 'fill' : 'regular'} className="h-5 w-5" />}
                               {m === 'QRIS' && <Wallet weight={method === 'QRIS' ? 'fill' : 'regular'} className="h-5 w-5" />}
                               {m === 'Transfer' && <Bank weight={method === 'Transfer' ? 'fill' : 'regular'} className="h-5 w-5" />}
                               <span className="text-[11px] font-bold">{m}</span>
                             </button>
                           ))}
                         </div>

                         {method === 'Cash' && (() => {
                           const received = Number(cashReceived[order.id] || 0);
                           const change = received - order.total_price;
                           return (
                             <div className="mt-4 space-y-3 rounded-xl border border-border bg-background p-4">
                               <div>
                                 <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                   Uang Diterima
                                 </label>
                                 <input
                                   type="number"
                                   min="0"
                                   inputMode="numeric"
                                   value={cashReceived[order.id] ?? ''}
                                   onChange={(e) => setCashReceived((prev) => ({ ...prev, [order.id]: e.target.value }))}
                                   placeholder={order.total_price.toString()}
                                   className="w-full rounded-lg border border-border bg-background p-3 text-lg font-bold text-foreground outline-none focus:border-[#7fbbb3]"
                                 />
                               </div>
                               {received > 0 && (
                                 <div className={`flex justify-between text-sm font-bold ${change >= 0 ? 'text-primary' : 'text-destructive'}`}>
                                   <span>{change >= 0 ? 'Kembalian' : 'Kurang'}</span>
                                   <span>{formatIDR(Math.abs(change))}</span>
                                 </div>
                               )}
                             </div>
                           );
                         })()}

                         <button
                           onClick={() => updateOrderStatus(order.id)}
                           disabled={method === 'Cash' && Number(cashReceived[order.id] || 0) < order.total_price}
                           className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#7fbbb3] py-4 font-black text-background transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                         >
                           <CheckCircle weight="bold" className="h-5 w-5" />
                           Selesaikan Transaksi
                         </button>
                       </div>
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
      {/* Receipt preview modal */}
      <AnimatePresence>
        {previewOrder && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 no-print">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-2xl"
            >
              <Receipt order={previewOrder} paymentMethod={selectedPayment[previewOrder.id] || 'Cash'} />
              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => setPreviewOrder(null)}
                  className="flex-1 rounded-xl border border-border bg-background py-3 font-bold text-muted-foreground transition-colors hover:bg-muted"
                >
                  Tutup
                </button>
                <button
                  onClick={printReceipt}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#7fbbb3] py-3 font-black text-background transition-transform active:scale-95"
                >
                  <Printer weight="bold" className="h-5 w-5" /> Cetak
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Post-payment receipt popup (auto-dismiss after 8s) */}
      <AnimatePresence>
        {paidReceipt && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 no-print">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-2xl"
            >
              <div className="mb-3 flex items-center justify-center gap-2 text-[#7fbbb3]">
                <CheckCircle weight="fill" className="h-6 w-6" />
                <span className="text-sm font-black uppercase tracking-widest">Pembayaran Berhasil</span>
              </div>
              <Receipt order={paidReceipt.order} paymentMethod={paidReceipt.method} />
              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => setPaidReceipt(null)}
                  className="flex-1 rounded-xl border border-border bg-background py-3 font-bold text-muted-foreground transition-colors hover:bg-muted"
                >
                  Tutup
                </button>
                <button
                  onClick={printReceipt}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#7fbbb3] py-3 font-black text-background transition-transform active:scale-95"
                >
                  <Printer weight="bold" className="h-5 w-5" /> Cetak
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}
