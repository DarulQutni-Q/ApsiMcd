"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Info, Printer, ShoppingBag } from "@phosphor-icons/react";
import { PasscodeDialog } from "@/components/shared/PasscodeDialog";
import type { Order } from "@/types";
import { PageHeader } from "@/components/page-header";
import { BadgeTag } from "@/components/badge-tag";
import { useToast } from "@/components/ui/use-toast";
import { LiveIndicator } from "@/components/live-indicator";
import { Receipt } from "@/components/receipt";

const METHOD_LABEL: Record<string, string> = {
  Cash: "Tunai",
  Card: "Kartu",
  QRIS: "QRIS",
  Transfer: "Transfer",
};

export default function PickupPage() {
  const [passcode, setPasscode] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [previewOrder, setPreviewOrder] = useState<Order | null>(null);
  const { toast } = useToast();

  const formatIDR = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(price);
  };

  const fetchOrders = async () => {
    try {
      const res = await fetch("/api/orders?status=paid", { cache: "no-store" });
      const { orders: data } = await res.json();
      if (!res.ok) throw new Error();
      setLastSync(Date.now());
      setOrders((prev) => {
        if (data.length > prev.length) {
          new Audio("/notification.mp3").play().catch(() => {});
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
    const interval = setInterval(fetchOrders, 2000);
    return () => clearInterval(interval);
  }, [passcode]);

  const handoverOrder = async (orderId: string) => {
    const target = orders.find((o) => o.id === orderId);
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
    try {
      const res = await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId, status: "completed", passcode, role: "pickup" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);
      toast({
        title: "Pesanan diambil",
        description: target ? `#${target.order_number}` : undefined,
      });
    } catch (e: any) {
      setErrorMsg(e.message || "Gagal menyerahkan pesanan.");
      setTimeout(() => setErrorMsg(null), 3000);
      fetchOrders();
    }
  };

  const printReceipt = () => window.print();

  if (!passcode) {
    return <PasscodeDialog isOpen={true} role="pickup" onSuccess={setPasscode} />;
  }

  return (
    <div className="flex min-h-[100dvh] w-full flex-col bg-background relative overflow-hidden">
      <PageHeader title="Pengambilan" backHref="/" />

      <AnimatePresence>
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute left-1/2 top-20 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl bg-destructive px-6 py-3 text-sm font-bold text-destructive-foreground shadow-lg"
          >
            <Info weight="bold" /> {errorMsg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed top-20 right-6 z-50">
        <BadgeTag variant="count">{orders.length} Paid Orders</BadgeTag>
      </div>

      <LiveIndicator lastSync={lastSync} />

      <div className="mx-auto w-full max-w-4xl flex-1 p-6 md:p-8 relative z-10">
        <div className="mt-8">
          <AnimatePresence mode="popLayout">
            {orders.map((order) => (
              <motion.div
                key={order.id}
                layout
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 50, scale: 0.95 }}
                className="mb-6 flex flex-col overflow-hidden rounded-2xl border border-border bg-card"
              >
                <div className="flex items-center justify-between gap-3 bg-[#7fbbb3]/10 px-6 py-3 md:px-8">
                  <div className="flex items-center gap-2 text-[#7fbbb3]">
                    <CheckCircle weight="fill" className="h-5 w-5" />
                    <span className="text-sm font-black uppercase tracking-widest">Lunas / Paid</span>
                  </div>
                  <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-bold text-muted-foreground">
                    {order.payment_method ? METHOD_LABEL[order.payment_method] ?? order.payment_method : "—"}
                  </span>
                </div>

                <div className="p-6 md:p-8">
                  <div className="mb-6 flex items-center justify-between border-b border-border/50 pb-4">
                    <h2 className="text-4xl font-black tracking-tighter text-foreground">#{order.order_number}</h2>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPreviewOrder(order)}
                        className="flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1 text-xs font-bold text-muted-foreground transition-colors hover:border-[#7fbbb3]/40 hover:text-[#7fbbb3]"
                      >
                        <Printer weight="bold" className="h-3.5 w-3.5" /> Struk
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {order.order_items?.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start justify-between gap-3 text-foreground"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-black text-[#7fbbb3]">{item.qty}x</span>
                          <span className="font-medium">
                            {item.menus?.name}
                            {item.selected_options && item.selected_options.length > 0 && (
                              <span className="ml-1 text-[11px] text-muted-foreground/70">
                                ({item.selected_options.map((o) => o.choice).join(", ")})
                              </span>
                            )}
                          </span>
                        </div>
                        <span className="font-semibold">{formatIDR(item.subtotal_price)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="my-4 border-t border-dashed border-border" />

                  <div className="flex items-baseline justify-between text-2xl font-black tracking-tight text-foreground">
                    <span>Total</span>
                    <span className="text-[#7fbbb3]">{formatIDR(order.total_price)}</span>
                  </div>

                  <button
                    onClick={() => handoverOrder(order.id)}
                    className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#7fbbb3] py-4 font-black text-background transition-transform active:scale-[0.98]"
                  >
                    <ShoppingBag weight="bold" className="h-5 w-5" />
                    Sudah Diambil
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {orders.length === 0 && (
            <div className="mt-32 flex flex-col items-center justify-center text-muted-foreground">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-muted/50 mb-6 shadow-inner">
                <CheckCircle weight="light" className="h-12 w-12 opacity-50" />
              </div>
              <p className="text-xl font-medium tracking-tight">No paid orders waiting for pickup.</p>
            </div>
          )}
        </div>
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
              <Receipt order={previewOrder} paymentMethod={previewOrder.payment_method || "Cash"} />
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
    </div>
  );
}
