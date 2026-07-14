"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CookingPot, CheckSquare, Square, Check, Info, Clock, Warning, Plus } from "@phosphor-icons/react";
import { PasscodeDialog } from "@/components/shared/PasscodeDialog";
import type { Menu, Order, StockAlert } from "@/types";
import { PageHeader } from "@/components/page-header";
import { BadgeTag } from "@/components/badge-tag";
import { useToast } from "@/components/ui/use-toast";
import { LiveIndicator } from "@/components/live-indicator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

const ALERT_MINUTES = 8;

export default function KitchenPage() {
  const [passcode, setPasscode] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const { toast } = useToast();

  // Out-of-stock warning dialog state
  const [stockOpen, setStockOpen] = useState(false);
  const [menuList, setMenuList] = useState<Menu[]>([]);
  const [selectedStock, setSelectedStock] = useState<string[]>([]);
  const [outOfStock, setOutOfStock] = useState<string[]>([]);

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

  const loadOutOfStock = async () => {
    try {
      const res = await fetch('/api/stock-alerts', { cache: 'no-store' });
      const { alerts } = await res.json();
      const active = (alerts as StockAlert[]).filter((a) => !a.resolved).map((a) => a.menu_id);
      setOutOfStock(active);
    } catch {
      /* ignore */
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
    loadOutOfStock();
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

  const openStockDialog = async () => {
    setSelectedStock([]);
    try {
      const res = await fetch('/api/menus', { cache: 'no-store' });
      const { menus } = await res.json();
      setMenuList(menus || []);
    } catch {
      setMenuList([]);
    }
    setStockOpen(true);
  };

  const toggleStockSelection = (id: string) => {
    setSelectedStock(prev =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const submitStockAlerts = async () => {
    if (selectedStock.length === 0) return;
    let ok = true;
    for (const menuId of selectedStock) {
      const res = await fetch('/api/stock-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ menu_id: menuId, passcode }),
      });
      if (!res.ok) ok = false;
    }
    if (ok) {
      toast({ title: "Peringatan dikirim", description: "Admin telah mendapat kabar stok habis." });
      await loadOutOfStock();
    } else {
      setErrorMsg("Gagal mengirim sebagian peringatan.");
      setTimeout(() => setErrorMsg(null), 3000);
    }
    setStockOpen(false);
    setSelectedStock([]);
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

      <div className="fixed top-20 right-6 z-50 flex items-center gap-3">
        <button
          onClick={openStockDialog}
          className="flex items-center gap-2 rounded-full border border-[#e67e80]/30 bg-[#e67e80]/10 px-4 py-2 text-xs font-bold text-[#e67e80] transition-colors hover:bg-[#e67e80]/20"
        >
          <Warning weight="bold" className="h-4 w-4" /> Laporkan Stok Habis
        </button>
        <BadgeTag variant="count">{orders.length} Active Orders</BadgeTag>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden p-6 bg-muted/20 relative">
        <div className="flex h-full gap-6 pb-4 mt-8">

          <LiveIndicator lastSync={lastSync} />
          <AnimatePresence mode="popLayout">
            {orders.map(order => {
              const allChecked = order.order_items?.every(item => item.is_checked);
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
                            !isPreparing
                              ? 'border-border/50 bg-muted/20 opacity-60'
                              : item.is_checked
                                ? 'border-[#e67e80]/30 bg-[#e67e80]/10 opacity-70'
                                : 'border-border bg-background'
                          }`}
                        >
                          <button
                            onClick={() => isPreparing && toggleItemCheck(item.id, item.is_checked, order.id)}
                            disabled={!isPreparing}
                            className="shrink-0 disabled:cursor-not-allowed"
                          >
                            {item.is_checked ? (
                              <CheckSquare weight="fill" className="h-5 w-5 text-[#e67e80]" />
                            ) : (
                              <Square weight="bold" className="h-5 w-5 text-muted-foreground/50" />
                            )}
                          </button>
                          <div className="flex-1 font-semibold leading-tight text-foreground">
                            <span className="mr-2 font-black text-[#e67e80]">
                              {item.qty}x
                            </span>
                            <span>{item.menus?.name}</span>
                            {item.selected_options && item.selected_options.length > 0 && (
                              <p className="mt-0.5 text-[11px] font-normal text-muted-foreground">
                                {item.selected_options.map((o) => o.choice).join(" + ")}
                              </p>
                            )}
                          </div>
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

      <Dialog open={stockOpen} onOpenChange={setStockOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Laporkan Stok Habis</DialogTitle>
            <DialogDescription>
              Pilih menu yang sedang tidak tersedia. Peringatan akan dikirim ke Admin.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-80 overflow-y-auto space-y-2">
            {menuList.map((menu) => {
              const checked = selectedStock.includes(menu.id);
              const alreadyOut = outOfStock.includes(menu.id);
              return (
                <button
                  key={menu.id}
                  onClick={() => toggleStockSelection(menu.id)}
                  className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors ${
                    checked ? "border-[#e67e80] bg-[#e67e80]/10" : "border-border bg-background hover:bg-muted"
                  }`}
                >
                  <span className="text-sm font-semibold text-foreground">
                    {menu.name}
                    {alreadyOut && (
                      <span className="ml-2 rounded-full bg-[#e67e80]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#e67e80]">
                        Sudah dilaporkan
                      </span>
                    )}
                  </span>
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                      checked ? "border-[#e67e80] bg-[#e67e80] text-background" : "border-border text-transparent"
                    }`}
                  >
                    <Check weight="bold" className="h-3.5 w-3.5" />
                  </span>
                </button>
              );
            })}
            {menuList.length === 0 && (
              <p className="text-center text-sm text-muted-foreground">Memuat menu...</p>
            )}
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <button className="h-11 rounded-full border border-border px-5 text-sm font-bold text-foreground">
                Batal
              </button>
            </DialogClose>
            <button
              onClick={submitStockAlerts}
              disabled={selectedStock.length === 0}
              className="flex h-11 items-center justify-center gap-2 rounded-full bg-[#e67e80] px-6 text-sm font-bold text-background transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus weight="bold" className="h-4 w-4" />
              Kirim Peringatan
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
