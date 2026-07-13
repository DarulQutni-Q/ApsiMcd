"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CookingPot, CheckSquare, Square, Check, Info, XCircle, Clock } from "@phosphor-icons/react";
import { PasscodeDialog } from "@/components/shared/PasscodeDialog";
import type { Order } from "@/types";
import { PageHeader } from "@/components/page-header";
import { BadgeTag } from "@/components/badge-tag";
import { useToast } from "@/components/ui/use-toast";
import { LiveIndicator } from "@/components/live-indicator";

const ALERT_MINUTES = 8;

export default function KitchenPage() {
  const [passcode, setPasscode] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const { toast } = useToast();

  const audioRef = useRef<AudioContext | null>(null);
  const seenIds = useRef<Set<string>>(new Set());
  const alertedIds = useRef<Set<string>>(new Set());

  const beep = (freq: number, durationMs: number) => {
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (!audioRef.current) audioRef.current = new Ctx();
      const ctx = audioRef.current;
      if (ctx.state === "suspended") ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationMs / 1000);
      osc.start();
      osc.stop(ctx.currentTime + durationMs / 1000);
    } catch {
      /* audio not available */
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/orders?status=pending,preparing', { cache: 'no-store' });
      const { orders: data } = await res.json();
      if (!res.ok) throw new Error();
      setLastSync(Date.now());

      // New-order chime + overdue alert
      const added = data.filter((d: any) => !seenIds.current.has(d.id));
      if (added.length > 0) beep(880, 180);
      const now = Date.now();
      for (const d of data) {
        const ageMin = (now - new Date(d.created_at).getTime()) / 60000;
        if (ageMin > ALERT_MINUTES && !alertedIds.current.has(d.id)) {
          alertedIds.current.add(d.id);
          beep(440, 450);
        }
      }
      alertedIds.current = new Set(
        [...alertedIds.current].filter((id) => data.some((d: any) => d.id === id))
      );
      seenIds.current = new Set(data.map((d: any) => d.id));

      setOrders(data as Order[]);
    } catch {
      setErrorMsg("Gagal mengambil data orders.");
    }
  };

  useEffect(() => {
    if (!passcode) return;
    // Unlock audio on the passcode gesture so alerts can play later.
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      audioRef.current = new Ctx();
      audioRef.current.resume().catch(() => {});
    } catch {
      /* ignore */
    }

    fetchOrders();
    // Offline: no realtime; poll every 2 seconds for near-live updates.
    const interval = setInterval(fetchOrders, 2000);

    return () => clearInterval(interval);
  }, [passcode]);

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
      fetchOrders(); // revert on failure
    }
  };

  const rejectItem = async (itemId: string, current: boolean, orderId: string) => {
    setOrders(prev => prev.map(o => o.id === orderId ? {
      ...o,
      order_items: o.order_items?.map(i => i.id === itemId ? { ...i, is_rejected: !current } : i)
    } : o));

    try {
      const res = await fetch('/api/orders/items/reject', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: itemId, is_rejected: !current, passcode })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);
    } catch (e: any) {
      setErrorMsg(e.message || "Gagal reject item.");
      setTimeout(() => setErrorMsg(null), 3000);
      fetchOrders();
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
      fetchOrders(); // revert
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

      <div className="fixed top-20 right-6 z-50">
        <BadgeTag variant="count">{orders.length} Active Orders</BadgeTag>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden p-6 bg-muted/20 relative">
        <div className="flex h-full gap-6 pb-4 mt-8">

        <LiveIndicator lastSync={lastSync} />
          <AnimatePresence mode="popLayout">
            {orders.map(order => {
              const allChecked = order.order_items?.every(item => item.is_rejected || item.is_checked);
              const isPreparing = order.status === 'preparing';
              const ageMin = (Date.now() - new Date(order.created_at).getTime()) / 60000;
              const overdue = ageMin > ALERT_MINUTES;
              
              return (
                <motion.div
                  key={order.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, filter: "blur(4px)" }}
                  className={`flex w-80 shrink-0 flex-col overflow-hidden rounded-2xl border bg-card ${
                    isPreparing ? 'border-[#e67e80]/30' : 'border-border'
                  }`}
                >
                  <div className={`flex items-center justify-between border-b border-border/50 p-5 ${isPreparing ? 'bg-[#e67e80]/10' : ''}`}>
                    <span className="text-3xl font-black tracking-tighter text-foreground">
                      #{order.order_number}
                    </span>
                    <div className="flex items-center gap-2">
                      {overdue && (
                        <span className="flex items-center gap-1 rounded-full bg-[#e67e80] px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-background">
                          <Clock weight="bold" className="h-3 w-3" /> {Math.floor(ageMin)}m
                        </span>
                      )}
                      <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest ${
                        isPreparing ? 'bg-[#e67e80] text-background' : 'bg-muted text-muted-foreground'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-5">
                    <div className="space-y-2">
                      {order.order_items?.map(item => (
                        <div
                          key={item.id}
                          className={`flex w-full items-start gap-3 rounded-xl border p-3 transition-all ${
                            item.is_rejected
                              ? 'border-dashed border-[#e67e80] bg-[#e67e80]/5 opacity-70'
                              : !isPreparing
                                ? 'border-border/50 bg-muted/20 opacity-60'
                                : item.is_checked
                                  ? 'border-[#e67e80]/30 bg-[#e67e80]/10 opacity-70'
                                  : 'border-border bg-background'
                          }`}
                        >
                          <button
                            onClick={() => isPreparing && toggleItemCheck(item.id, item.is_checked, order.id)}
                            disabled={!isPreparing || item.is_rejected}
                            className="shrink-0 disabled:cursor-not-allowed"
                          >
                            {item.is_checked ? (
                              <CheckSquare weight="fill" className="h-5 w-5 text-[#e67e80]" />
                            ) : (
                              <Square weight="bold" className="h-5 w-5 text-muted-foreground/50" />
                            )}
                          </button>
                          <div className="flex-1 font-semibold leading-tight text-foreground">
                            <span className={`mr-2 font-black text-[#e67e80] ${item.is_rejected ? 'line-through' : ''}`}>
                              {item.qty}x
                            </span>
                            <span className={item.is_rejected ? 'line-through' : ''}>{item.menus?.name}</span>
                            {item.selected_options && item.selected_options.length > 0 && (
                              <p className="mt-0.5 text-[11px] font-normal text-muted-foreground">
                                {item.selected_options.map((o) => o.choice).join(" + ")}
                              </p>
                            )}
                            {item.is_rejected && (
                              <span className="ml-1 rounded bg-[#e67e80] px-1.5 py-0.5 text-[9px] font-bold uppercase text-background">
                                Habis
                              </span>
                            )}
                          </div>
                          {isPreparing && (
                            <button
                              onClick={() => rejectItem(item.id, !!item.is_rejected, order.id)}
                              title={item.is_rejected ? "Batalkan reject" : "Tandai habis"}
                              className={`shrink-0 rounded-lg border p-2 transition-colors active:scale-95 ${
                                item.is_rejected
                                  ? "border-[#e67e80] bg-[#e67e80] text-background hover:bg-[#e67e80]/80"
                                  : "border-border bg-background text-muted-foreground hover:border-[#e67e80] hover:bg-[#e67e80]/10 hover:text-[#e67e80]"
                              }`}
                            >
                              <XCircle weight="bold" className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-border/50 p-5">
                    {!isPreparing ? (
                      <button
                        onClick={() => updateOrderStatus(order.id, 'preparing')}
                        className="w-full rounded-xl bg-foreground py-4 text-sm font-black tracking-wide text-background transition-transform active:scale-[0.98]"
                      >
                        Start Preparing
                      </button>
                    ) : (
                      <button
                        onClick={() => updateOrderStatus(order.id, 'ready')}
                        disabled={!allChecked}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#e67e80] py-4 text-sm font-black tracking-wide text-background transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
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
