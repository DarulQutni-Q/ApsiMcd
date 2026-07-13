"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import { DownloadSimple, TrendUp, Coin, CheckCircle, Package, Receipt as ReceiptIcon, ForkKnife, PencilSimple, Trash, Plus, X, Printer, PencilLine } from "@phosphor-icons/react/dist/ssr";
import { PasscodeDialog } from "@/components/shared/PasscodeDialog";
import type { Menu, MenuOption, MenuOptionGroup } from "@/types";
import { format, parseISO, startOfDay, endOfDay } from "date-fns";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { LiveIndicator } from "@/components/live-indicator";
import { Receipt } from "@/components/receipt";

// Lazy load Recharts since it's quite heavy
const AreaChart = dynamic(() => import('recharts').then(mod => mod.AreaChart), { ssr: false });
const Area = dynamic(() => import('recharts').then(mod => mod.Area), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(mod => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(mod => mod.YAxis), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then(mod => mod.CartesianGrid), { ssr: false });
const PieChart = dynamic(() => import('recharts').then(mod => mod.PieChart), { ssr: false });
const Pie = dynamic(() => import('recharts').then(mod => mod.Pie), { ssr: false });

const COLORS = ['#a7c080', '#e67e80', '#dbbc7f', '#7fbbb3', '#d699b6', '#83c092'];

export function AdminClient() {
  const [passcode, setPasscode] = useState<string | null>(null);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [productData, setProductData] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [summary, setSummary] = useState({ totalRevenue: 0, totalOrders: 0, itemsSold: 0 });
  const [menus, setMenus] = useState<Menu[]>([]);
  const [editingMenu, setEditingMenu] = useState<Menu | null>(null);
  const [showMenuForm, setShowMenuForm] = useState(false);
  const [showMenuManager, setShowMenuManager] = useState(false);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const prevTopId = useRef<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const lastSig = useRef<string>("");

  const loadMenus = useCallback(async () => {
    try {
      const res = await fetch('/api/menus', { cache: 'no-store' });
      const { menus: data } = await res.json();
      if (res.ok && data) setMenus(data);
    } catch {
      // offline read error; ignore
    }
  }, []);

  useEffect(() => {
    if (!passcode) return;

    fetchData();
    loadMenus();
    // Offline: poll every 3 seconds instead of realtime.
    const interval = setInterval(fetchData, 3000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passcode, loadMenus]);

  const fetchData = async () => {
    const res = await fetch('/api/orders', { cache: 'no-store' });
    const { orders: ordersData } = await res.json();
    if (!ordersData) return;

    // "Total Orders" = number of orders ever created, which matches the
    // global order-number sequence (e.g. latest #531), not the surviving rows.
    const completed = ordersData.filter((o: any) => o.status === 'completed');
    const totalAll = ordersData.length > 0
      ? Math.max(...ordersData.map((o: any) => o.order_number))
      : 0;

    // Newest first for the recent-transactions table
    const sorted = [...completed].sort(
      (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // Highlight a brand-new order when it appears at the top.
    const topId = sorted[0]?.id ?? null;
    if (topId && prevTopId.current && topId !== prevTopId.current) {
      setHighlightId(topId);
      setTimeout(() => setHighlightId((cur) => (cur === topId ? null : cur)), 3000);
    }
    prevTopId.current = topId;

    let totalRev = 0;
    const grouped = sorted.reduce((acc: any, order: any) => {
      const date = format(parseISO(order.created_at), 'MMM dd');
      if (!acc[date]) acc[date] = 0;
      acc[date] += Number(order.total_price);
      totalRev += Number(order.total_price);
      return acc;
    }, {});
    const formattedData = Object.keys(grouped)
      .map(date => ({ date, revenue: grouped[date] }))
      .reverse();

    let totalItems = 0;
    const itemCounts: Record<string, number> = {};
    for (const order of ordersData) {
      for (const item of order.order_items || []) {
        const name = item.menus?.name || 'Unknown Item';
        itemCounts[name] = (itemCounts[name] || 0) + item.qty;
        totalItems += item.qty;
      }
    }
    const sortedProducts = Object.keys(itemCounts)
      .map(name => ({ name, value: itemCounts[name] }))
      .sort((a, b) => b.value - a.value);

    // Only push state when something actually changed, so the charts don't
    // re-render/re-animate on every 3s poll.
    const sig = JSON.stringify({
      r: formattedData,
      p: sortedProducts,
      o: sorted.map((o: any) => o.id),
      rev: totalRev,
      ord: sorted.length,
      items: totalItems,
      all: totalAll,
    });
    if (sig === lastSig.current) return;
    lastSig.current = sig;

    setRevenueData(formattedData);
    setRecentOrders(sorted);
    setProductData(sortedProducts);
    setSummary({ totalRevenue: totalRev, totalOrders: totalAll, itemsSold: totalItems });
    setLastSync(Date.now());
  };

  const saveMenu = async (form: Omit<Menu, 'id'> & { id?: string }) => {
    const method = form.id ? 'PATCH' : 'POST';
    const res = await fetch('/api/menus', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, passcode }),
    });
    if (res.ok) {
      setShowMenuForm(false);
      setEditingMenu(null);
      loadMenus();
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error || 'Gagal menyimpan menu');
    }
  };

  const deleteMenuItem = async (id: string) => {
    if (!confirm('Hapus menu ini?')) return;
    const res = await fetch('/api/menus', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, passcode }),
    });
    if (res.ok) loadMenus();
    else alert('Gagal menghapus menu');
  };

  const exportCSV = async () => {
    const res = await fetch('/api/orders?status=completed', { cache: 'no-store' });
    const { orders: data } = await res.json();
    if (!data) return;

    const headers = ['Order Number', 'Date', 'Subtotal', 'Tax', 'Discount', 'Total', 'Payment Method'];
    const rows = data.map((order: any) => [
      order.order_number,
      order.created_at,
      order.subtotal,
      order.tax_amount,
      order.discount_amount,
      order.total_price,
      order.payment_method || 'Cash'
    ].join(','));

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `revenue_export_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  const formatIDR = (price: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(price);
  };

  // ---- Date range filter ----
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filteredOrders = useMemo(() => {
    if (!dateFrom && !dateTo) return recentOrders;
    return recentOrders.filter((o: any) => {
      const d = parseISO(o.created_at);
      if (dateFrom && d < startOfDay(parseISO(dateFrom))) return false;
      if (dateTo && d > endOfDay(parseISO(dateTo))) return false;
      return true;
    });
  }, [recentOrders, dateFrom, dateTo]);

  const filteredStats = useMemo(() => {
    let rev = 0, items = 0;
    const counts: Record<string, number> = {};
    for (const o of filteredOrders) {
      rev += Number(o.total_price);
      for (const it of o.order_items || []) {
        const n = it.menus?.name || 'Unknown';
        counts[n] = (counts[n] || 0) + it.qty;
        items += it.qty;
      }
    }
    const top = Object.keys(counts).map(n => ({ name: n, value: counts[n] })).sort((a, b) => b.value - a.value);
    return { rev, items, orders: filteredOrders.length, top };
  }, [filteredOrders]);

  // ---- Per-order actions ----
  const [printOrder, setPrintOrder] = useState<any | null>(null);
  const [editOrder, setEditOrder] = useState<any | null>(null);
  const [reportOpen, setReportOpen] = useState(false);

  const printReceipt = (order: any) => {
    setPrintOrder(order);
    setTimeout(() => window.print(), 300);
  };

  const saveOrderEdit = async (orderId: string, items: { id?: string; menu_id: string; qty: number; options?: { group: string; choice: string }[] }[]) => {
    const res = await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, passcode }),
    });
    if (res.ok) {
      setEditOrder(null);
      fetchData();
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error || 'Gagal edit pesanan');
    }
  };

  if (!passcode) {
    return <PasscodeDialog isOpen={true} role="admin" onSuccess={setPasscode} />;
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border p-3 rounded-lg shadow-lg">
          <p className="font-bold text-foreground mb-1">{label || payload[0].name}</p>
          <p className="text-primary font-bold">
            {payload[0].name === 'revenue' 
              ? formatIDR(payload[0].value)
              : `${payload[0].value} units sold`
            }
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex min-h-[100dvh] w-full flex-col bg-background relative overflow-hidden">
      <div className="relative z-20 flex w-full justify-between items-center bg-card/80 border-b border-border/50">
        <PageHeader title="Admin Dashboard" backHref="/" />
        <div className="absolute right-[140px] top-3 flex items-center gap-2 pr-4 z-30">
          <button onClick={() => setShowMenuManager(true)} className="flex items-center gap-2 rounded-lg bg-[#a7c080]/15 text-[#83a35f] px-4 py-2 text-sm font-bold transition-all hover:bg-[#a7c080] hover:text-white shadow-sm active:scale-95">
            <ForkKnife weight="bold" /> Kelola Menu
          </button>
          <button onClick={exportCSV} className="flex items-center gap-2 rounded-lg bg-primary/10 text-primary px-4 py-2 text-sm font-bold transition-all hover:bg-primary hover:text-white shadow-sm active:scale-95">
            <DownloadSimple weight="bold" /> Export CSV
          </button>
          <button onClick={() => setReportOpen(true)} className="flex items-center gap-2 rounded-lg bg-[#a7c080]/15 text-[#83a35f] px-4 py-2 text-sm font-bold transition-all hover:bg-[#a7c080] hover:text-white shadow-sm active:scale-95">
            <Printer weight="bold" /> Export PDF
          </button>
        </div>
      </div>

      <LiveIndicator lastSync={lastSync} />

      <div className="mx-auto w-full max-w-7xl flex-1 p-6 md:p-8 z-10 bg-background/50">
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
           <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
             <Card className="border-border/60 shadow-sm bg-card hover:bg-muted/10 transition-colors">
               <CardContent className="p-6 flex items-center justify-between">
                 <div>
                   <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-1">Total Revenue</p>
                   <h3 className="text-3xl font-black text-foreground">{formatIDR(summary.totalRevenue)}</h3>
                 </div>
                 <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                   <Coin weight="duotone" className="h-7 w-7" />
                 </div>
               </CardContent>
             </Card>
           </motion.div>

           <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
             <Card className="border-border/60 shadow-sm bg-card hover:bg-muted/10 transition-colors">
               <CardContent className="p-6 flex items-center justify-between">
                 <div>
                   <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-1">Total Orders</p>
                   <h3 className="text-3xl font-black text-foreground">{summary.totalOrders}</h3>
                 </div>
                 <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                   <CheckCircle weight="duotone" className="h-7 w-7" />
                 </div>
               </CardContent>
             </Card>
           </motion.div>

           <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
             <Card className="border-border/60 shadow-sm bg-card hover:bg-muted/10 transition-colors">
               <CardContent className="p-6 flex items-center justify-between">
                 <div>
                   <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-1">Items Sold</p>
                   <h3 className="text-3xl font-black text-foreground">{summary.itemsSold}</h3>
                 </div>
                 <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                   <Package weight="duotone" className="h-7 w-7" />
                 </div>
               </CardContent>
             </Card>
           </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }} className="lg:col-span-2">
            <Card className="border-border/60 shadow-sm h-[450px] flex flex-col bg-card">
              <CardHeader className="pb-2 border-b border-border/40">
                <div className="flex items-center gap-2">
                  <TrendUp weight="bold" className="text-primary h-5 w-5" />
                  <CardTitle className="text-lg font-black tracking-tight text-foreground">Revenue Trends</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-6">
                {revenueData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#a7c080" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#a7c080" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} axisLine={false} tickLine={false} dy={10} />
                      <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(val) => new Intl.NumberFormat("id-ID", { notation: "compact", maximumFractionDigits: 1 }).format(val)} width={80} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="revenue" stroke="#a7c080" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground font-medium">
                    No revenue data available yet.
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }}>
            <Card className="border-border/60 shadow-sm h-[450px] flex flex-col bg-card">
              <CardHeader className="pb-2 border-b border-border/40">
                <CardTitle className="text-lg font-black tracking-tight text-foreground">Top Selling Items</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 p-6 flex flex-col overflow-hidden">
                {productData.length > 0 ? (
                  <>
                    <div className="relative h-[200px] shrink-0 mb-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={productData.slice(0, 5).map((entry, index) => ({
                              ...entry,
                              fill: COLORS[index % COLORS.length],
                            }))}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                            label={({ name, percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`}
                            labelLine={false}
                          />
                          <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-black text-foreground">
                          {productData.slice(0, 5).reduce((s: number, p: any) => s + p.value, 0)}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Top 5 Units</span>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                       {productData.slice(0, 5).map((prod, idx) => (
                         <div key={prod.name} className="flex items-center justify-between text-sm">
                           <div className="flex items-center gap-2">
                             <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                             <span className="font-semibold text-foreground truncate max-w-[140px]" title={prod.name}>{prod.name}</span>
                           </div>
                           <span className="font-black text-muted-foreground bg-muted px-2 py-0.5 rounded-md">{prod.value}</span>
                         </div>
                       ))}
                    </div>
                  </>
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground font-medium">
                    No product data available yet.
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <Card className="border-border/60 shadow-sm overflow-hidden bg-card">
            <CardHeader className="bg-muted/10 border-b border-border/40">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <ReceiptIcon weight="bold" className="text-primary h-5 w-5" />
                  <CardTitle className="text-lg font-black tracking-tight text-foreground">Recent Transactions</CardTitle>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Dari
                    <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                      className="rounded-lg border border-border bg-background px-2 py-1 text-sm font-medium text-foreground outline-none focus:border-primary" />
                  </label>
                  <label className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Sampai
                    <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                      className="rounded-lg border border-border bg-background px-2 py-1 text-sm font-medium text-foreground outline-none focus:border-primary" />
                  </label>
                  {(dateFrom || dateTo) && (
                    <button onClick={() => { setDateFrom(""); setDateTo(""); }}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground hover:bg-muted">Reset</button>
                  )}
                </div>
              </div>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-muted/30 text-muted-foreground">
                  <tr>
                    <th className="px-6 py-4 font-bold">Order No</th>
                    <th className="px-6 py-4 font-bold">Date & Time</th>
                    <th className="px-6 py-4 font-bold">Amount</th>
                    <th className="px-6 py-4 font-bold text-center">Payment Method</th>
                    <th className="px-6 py-4 font-bold text-right">Status</th>
                    <th className="px-6 py-4 font-bold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredOrders.length > 0 ? (
                    filteredOrders.slice(0, 50).map((order) => (
                      <tr
                        key={order.id}
                        className={`bg-card hover:bg-muted/20 transition-colors ${highlightId === order.id ? 'highlight-new' : ''}`}
                      >
                        <td className="px-6 py-4 font-black text-foreground">#{order.order_number}</td>
                        <td className="px-6 py-4 font-medium text-muted-foreground">
                          {format(parseISO(order.created_at), 'MMM dd, yyyy HH:mm')}
                        </td>
                        <td className="px-6 py-4 font-bold text-primary">
                          {formatIDR(order.total_price)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-muted text-muted-foreground border border-border/50 shadow-sm">
                            {order.payment_method || 'Cash'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary">
                            {order.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => printReceipt(order)} title="Cetak struk" className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-primary transition-colors">
                              <Printer weight="bold" className="h-4 w-4" />
                            </button>
                            <button onClick={() => setEditOrder(order)} title="Edit pesanan" className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-primary transition-colors">
                              <PencilLine weight="bold" className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground font-medium">No transactions found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </motion.div>

      </div>

      {/* Menu Management modal */}
      {showMenuManager && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/80 backdrop-blur-sm p-4 md:p-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-5xl my-auto"
          >
          <Card className="border-border/60 shadow-2xl overflow-hidden bg-card">
            <CardHeader className="bg-muted/10 border-b border-border/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ForkKnife weight="bold" className="text-primary h-5 w-5" />
                  <CardTitle className="text-lg font-black tracking-tight text-foreground">Kelola Menu</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setEditingMenu(null); setShowMenuForm(true); }}
                    className="flex items-center gap-2 rounded-lg bg-primary/10 text-primary px-4 py-2 text-sm font-bold transition-all hover:bg-primary hover:text-white shadow-sm active:scale-95"
                  >
                    <Plus weight="bold" /> Tambah Menu
                  </button>
                  <button
                    onClick={() => setShowMenuManager(false)}
                    className="flex items-center gap-2 rounded-lg bg-muted px-4 py-2 text-sm font-bold text-muted-foreground transition-all hover:bg-muted/70 active:scale-95"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </CardHeader>
            <div className="max-h-[70vh] overflow-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-muted/30 text-muted-foreground">
                  <tr>
                    <th className="px-6 py-4 font-bold">Foto</th>
                    <th className="px-6 py-4 font-bold">Nama</th>
                    <th className="px-6 py-4 font-bold">Kategori</th>
                    <th className="px-6 py-4 font-bold">Harga</th>
                    <th className="px-6 py-4 font-bold text-center">Aktif</th>
                    <th className="px-6 py-4 font-bold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {menus.length > 0 ? menus.map((menu) => (
                    <tr key={menu.id} className="bg-card hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-3">
                        <div className="h-10 w-10 rounded-lg bg-muted/40 overflow-hidden flex items-center justify-center">
                          {menu.image_url
                            ? <img src={menu.image_url} alt={menu.name} className="h-full w-full object-contain" />
                            : <span className="opacity-40">🍔</span>}
                        </div>
                      </td>
                      <td className="px-6 py-3 font-bold text-foreground">
                        <div className="flex items-center gap-2">
                          {menu.option_groups && menu.option_groups.length > 0 && (
                            <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-primary">Pilihan</span>
                          )}
                          {menu.name}
                        </div>
                      </td>
                      <td className="px-6 py-3 text-muted-foreground">{menu.category}</td>
                      <td className="px-6 py-3 font-bold text-primary">{formatIDR(menu.price)}</td>
                      <td className="px-6 py-3 text-center">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${menu.is_active ? 'bg-[#a7c080]/15 text-[#83a35f]' : 'bg-muted text-muted-foreground'}`}>
                          {menu.is_active ? 'Ya' : 'Tidak'}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => { setEditingMenu(menu); setShowMenuForm(true); }} className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" title="Edit">
                            <PencilSimple weight="bold" className="h-4 w-4" />
                          </button>
                          <button onClick={() => deleteMenuItem(menu.id)} className="p-2 rounded-lg text-[#e67e80] hover:bg-[#e67e80]/10 transition-colors" title="Hapus">
                            <Trash weight="bold" className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground font-medium">Belum ada menu.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
          </motion.div>
        </div>
      )}

      {showMenuForm && (
        <MenuFormModal
          menu={editingMenu}
          allMenus={menus}
          onClose={() => { setShowMenuForm(false); setEditingMenu(null); }}
          onSave={saveMenu}
        />
      )}

      {editOrder && (
        <EditOrderModal order={editOrder} onClose={() => setEditOrder(null)} onSave={saveOrderEdit} />
      )}
      {printOrder && (
        <div className="fixed left-[-9999px] top-0">
          <Receipt order={printOrder} />
        </div>
      )}
      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        stats={filteredStats}
        orders={filteredOrders}
        dateFrom={dateFrom}
        dateTo={dateTo}
        formatIDR={formatIDR}
      />
    </div>
  );
}

function MenuFormModal({
  menu,
  allMenus,
  onClose,
  onSave,
}: {
  menu: Menu | null;
  allMenus: Menu[];
  onClose: () => void;
  onSave: (form: Omit<Menu, 'id'> & { id?: string }) => void;
}) {
  const [name, setName] = useState(menu?.name ?? "");
  const [category, setCategory] = useState(menu?.category ?? "");
  const [price, setPrice] = useState(menu?.price?.toString() ?? "");
  const [imageUrl, setImageUrl] = useState(menu?.image_url ?? "");
  const [isActive, setIsActive] = useState(menu?.is_active ?? true);
  const [optionGroups, setOptionGroups] = useState<MenuOptionGroup[]>(
    () => (menu?.option_groups ?? []).map(g => ({
      name: g.name,
      required: g.required,
      options: g.options.map(o => ({ ...o })),
    }))
  );

  const addGroup = () => setOptionGroups(g => [...g, { name: "", required: true, options: [{ label: "", price_delta: 0 }] }]);
  const removeGroup = (gi: number) => setOptionGroups(g => g.filter((_, i) => i !== gi));
  const updateGroup = (gi: number, patch: Partial<MenuOptionGroup>) =>
    setOptionGroups(g => g.map((grp, i) => (i === gi ? { ...grp, ...patch } : grp)));
  const addOption = (gi: number) =>
    setOptionGroups(g => g.map((grp, i) => (i === gi ? { ...grp, options: [...grp.options, { label: "", price_delta: 0 }] } : grp)));
  const removeOption = (gi: number, oi: number) =>
    setOptionGroups(g => g.map((grp, i) => (i === gi ? { ...grp, options: grp.options.filter((_, j) => j !== oi) } : grp)));
  const updateOption = (gi: number, oi: number, patch: Partial<MenuOption>) =>
    setOptionGroups(g => g.map((grp, i) => (i === gi ? {
      ...grp,
      options: grp.options.map((o, j) => (j === oi ? { ...o, ...patch } : o)),
    } : grp)));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !category.trim()) { alert("Nama dan kategori wajib diisi"); return; }
    const priceNum = Number(price);
    if (!Number.isFinite(priceNum) || priceNum < 0) { alert("Harga tidak valid"); return; }
    const cleanGroups: MenuOptionGroup[] = [];
    for (const g of optionGroups) {
      const gname = g.name.trim();
      if (!gname) { alert("Nama grup pilihan wajib diisi"); return; }
      const opts: MenuOption[] = [];
      for (const o of g.options) {
        const label = o.label.trim();
        if (!label) { alert(`Label opsi di grup "${gname}" wajib diisi`); return; }
        const delta = Number(o.price_delta) || 0;
        if (delta < 0) { alert("Tambahan harga tidak boleh negatif"); return; }
        opts.push({ label, price_delta: delta });
      }
      if (opts.length === 0) { alert(`Grup "${gname}" butuh minimal 1 opsi`); return; }
      cleanGroups.push({ name: gname, required: g.required, options: opts });
    }
    onSave({
      id: menu?.id,
      name: name.trim(),
      category: category.trim(),
      price: priceNum,
      image_url: imageUrl.trim(),
      is_active: isActive,
      option_groups: cleanGroups,
    });
  };

  const inputCls = "w-full rounded-lg border border-border bg-background p-3 text-foreground outline-none focus:border-primary";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-black text-foreground">{menu ? "Edit Menu" : "Tambah Menu"}</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-muted-foreground hover:bg-muted"><X weight="bold" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Nama Menu</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="cth: Big Mac" autoFocus />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Kategori</label>
            <input value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls} placeholder="Burgers / Chicken / Sides / Beverages / Desserts" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Harga (IDR)</label>
            <input value={price} onChange={(e) => setPrice(e.target.value)} type="number" min="0" className={inputCls} placeholder="35000" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">URL Foto</label>
            <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className={inputCls} placeholder="/images/big-mac.png" />
            {imageUrl && (
              <div className="mt-2 h-16 w-16 rounded-lg bg-muted/40 overflow-hidden flex items-center justify-center">
                <img src={imageUrl} alt="preview" className="h-full w-full object-contain" />
              </div>
            )}
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 accent-primary" />
            <span className="text-sm font-medium text-foreground">Aktif (tampil di kiosk)</span>
          </label>

          <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-bold text-foreground">Grup Pilihan (opsi)</span>
              <button type="button" onClick={addGroup} className="rounded-md bg-primary/15 px-2 py-1 text-xs font-bold text-primary hover:bg-primary/25">+ Grup</button>
            </div>
            <p className="mb-3 text-[11px] text-muted-foreground">cth: Daging, Ukuran, Rasa. Setiap grup wajib dipilih pelanggan di kiosk.</p>
            <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
              {optionGroups.length === 0 && (
                <p className="text-center text-xs text-muted-foreground/60 py-2">Belum ada grup pilihan.</p>
              )}
              {optionGroups.map((g, gi) => (
                <div key={gi} className="rounded-lg border border-border/60 bg-background p-2.5">
                  <div className="mb-2 flex items-center gap-2">
                    <input
                      value={g.name}
                      onChange={(e) => updateGroup(gi, { name: e.target.value })}
                      placeholder="Nama grup (cth: Ukuran)"
                      className="flex-1 rounded-md border border-border bg-card px-2 py-1.5 text-sm text-foreground outline-none focus:border-primary"
                    />
                    <button type="button" onClick={() => removeGroup(gi)} className="p-1.5 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="Hapus grup">
                      <Trash weight="bold" className="h-4 w-4" />
                    </button>
                  </div>
                  <label className="mb-2 flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={g.required} onChange={(e) => updateGroup(gi, { required: e.target.checked })} className="h-3.5 w-3.5 accent-primary" />
                    <span className="text-[11px] font-medium text-muted-foreground">Wajib dipilih</span>
                  </label>
                  <div className="space-y-1.5">
                    {g.options.map((o, oi) => (
                      <div key={oi} className="flex items-center gap-1.5">
                        <input
                          value={o.label}
                          onChange={(e) => updateOption(gi, oi, { label: e.target.value })}
                          placeholder="Opsi (cth: Large)"
                          className="flex-1 rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground outline-none focus:border-primary"
                        />
                        <div className="flex items-center gap-0.5">
                          <span className="text-[10px] text-muted-foreground">+Rp</span>
                          <input
                            value={o.price_delta}
                            onChange={(e) => updateOption(gi, oi, { price_delta: Number(e.target.value) || 0 })}
                            type="number" min="0"
                            className="w-20 rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground outline-none focus:border-primary"
                          />
                        </div>
                        <button type="button" onClick={() => removeOption(gi, oi)} className="p-1 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                          <X weight="bold" className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                    <button type="button" onClick={() => addOption(gi)} className="text-[11px] font-bold text-primary hover:underline">+ Tambah opsi</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-border py-3 font-bold text-muted-foreground hover:bg-muted transition-colors">Batal</button>
            <button type="submit" className="flex-1 rounded-lg bg-primary py-3 font-bold text-white hover:opacity-90 transition-opacity">Simpan</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditOrderModal({
  order,
  onClose,
  onSave,
}: {
  order: any;
  onClose: () => void;
  onSave: (id: string, items: { id?: string; menu_id: string; qty: number; options?: { group: string; choice: string }[] }[]) => void;
}) {
  const [items, setItems] = useState<{ id: string; menu_id: string; qty: number; options: { group: string; choice: string }[] }[]>(
    (order?.order_items ?? []).map((i: any) => ({
      id: i.id,
      menu_id: i.menu_id,
      qty: i.qty,
      options: (i.selected_options ?? []).map((o: any) => ({ group: o.group, choice: o.choice })),
    }))
  );
  if (!order) return null;

  const updateQty = (id: string, q: number) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, qty: Math.max(1, q) } : it)));
  const remove = (id: string) => setItems((prev) => prev.filter((it) => it.id !== id));
  const setChoice = (id: string, group: string, choice: string) =>
    setItems((prev) => prev.map((it) => {
      if (it.id !== id) return it;
      const others = it.options.filter((o) => o.group !== group);
      return { ...it, options: [...others, { group, choice }] };
    }));

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-black text-foreground">Edit Pesanan #{order.order_number}</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-muted-foreground hover:bg-muted"><X weight="bold" /></button>
        </div>
        <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
          {items.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">Tidak ada item.</p>}
          {items.map((it) => {
            const srcItem = order.order_items.find((o: any) => o.id === it.id);
            const name = srcItem?.menus?.name || 'Item';
            const groups: MenuOptionGroup[] = srcItem?.menus?.option_groups ?? [];
            return (
              <div key={it.id} className="rounded-lg border border-border/60 bg-background p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-bold text-foreground">{name}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => updateQty(it.id!, it.qty - 1)} className="h-7 w-7 rounded-md bg-muted font-bold text-foreground hover:bg-border">−</button>
                    <span className="w-7 text-center text-sm font-bold">{it.qty}</span>
                    <button onClick={() => updateQty(it.id!, it.qty + 1)} className="h-7 w-7 rounded-md bg-muted font-bold text-foreground hover:bg-border">+</button>
                    <button onClick={() => remove(it.id!)} className="ml-1 rounded-md p-1 text-[#e67e80] hover:bg-[#e67e80]/10"><Trash weight="bold" className="h-4 w-4" /></button>
                  </div>
                </div>
                {groups.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {groups.map((g) => (
                      <div key={g.name} className="flex items-center gap-2">
                        <span className="w-20 shrink-0 text-[11px] font-bold uppercase text-muted-foreground">{g.name}</span>
                        <select
                          value={it.options.find((o) => o.group === g.name)?.choice ?? ""}
                          onChange={(e) => setChoice(it.id!, g.name, e.target.value)}
                          className="flex-1 rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground outline-none focus:border-primary"
                        >
                          <option value="">— pilih —</option>
                          {g.options.map((o) => (
                            <option key={o.label} value={o.label}>
                              {o.label}{o.price_delta > 0 ? ` (+${o.price_delta})` : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-5 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-lg border border-border py-3 font-bold text-muted-foreground hover:bg-muted transition-colors">Batal</button>
          <button onClick={() => onSave(order.id, items)} className="flex-1 rounded-lg bg-primary py-3 font-bold text-white hover:opacity-90 transition-opacity">Simpan Perubahan</button>
        </div>
      </div>
    </div>
  );
}

function ReportModal({
  open,
  onClose,
  stats,
  orders,
  dateFrom,
  dateTo,
  formatIDR,
}: {
  open: boolean;
  onClose: () => void;
  stats: { rev: number; items: number; orders: number; top: { name: string; value: number }[] };
  orders: any[];
  dateFrom: string;
  dateTo: string;
  formatIDR: (n: number) => string;
}) {
  if (!open) return null;
  const rangeLabel = `${dateFrom || 'Awal'} – ${dateTo || 'Sekarang'}`;
  const maxTop = stats.top[0]?.value || 1;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-background/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="my-8 w-full max-w-3xl rounded-2xl border border-border bg-card p-4 shadow-2xl">
        <div className="no-print mb-3 flex items-center justify-between">
          <h2 className="text-lg font-black text-foreground">Preview Laporan</h2>
          <div className="flex items-center gap-2">
            <button onClick={() => window.print()} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:opacity-90">
              <Printer weight="bold" /> Cetak / Simpan PDF
            </button>
            <button onClick={onClose} className="p-2 rounded-lg text-muted-foreground hover:bg-muted"><X weight="bold" /></button>
          </div>
        </div>

        <div id="report-print" className="bg-white p-8 text-slate-900">
          <div className="border-b-2 border-slate-900 pb-4">
            <h1 className="text-2xl font-black tracking-tight">EVERFOREST DRIVE-THRU</h1>
            <p className="text-sm text-slate-500">Jl. Makan Enak No. 123, Jakarta • +62 21 555 0199</p>
            <p className="mt-2 text-sm font-bold">Laporan Penjualan</p>
            <p className="text-sm text-slate-500">Periode: {rangeLabel} • Dicetak: {format(new Date(), 'dd MMM yyyy HH:mm')}</p>
          </div>

          <div className="my-6 grid grid-cols-3 gap-4">
            {[
              { label: 'Total Pendapatan', value: formatIDR(stats.rev) },
              { label: 'Total Pesanan', value: stats.orders },
              { label: 'Item Terjual', value: stats.items },
            ].map((c) => (
              <div key={c.label} className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500">{c.label}</p>
                <p className="mt-1 text-xl font-black text-slate-900">{c.value}</p>
              </div>
            ))}
          </div>

          <h2 className="mb-3 text-lg font-black text-slate-900">Produk Terlaris</h2>
          <div className="space-y-2">
            {stats.top.slice(0, 8).map((p, i) => (
              <div key={p.name} className="flex items-center gap-3">
                <span className="w-40 truncate text-sm font-medium text-slate-700">{p.name}</span>
                <div className="h-4 flex-1 overflow-hidden rounded bg-slate-100">
                  <div className="h-full rounded bg-[#a7c080]" style={{ width: `${(p.value / maxTop) * 100}%` }} />
                </div>
                <span className="w-12 text-right text-sm font-bold text-slate-900">{p.value}</span>
              </div>
            ))}
            {stats.top.length === 0 && <p className="text-sm text-slate-400">Belum ada data.</p>}
          </div>

          <h2 className="mb-2 mt-6 text-lg font-black text-slate-900">Daftar Transaksi</h2>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-slate-900 text-left text-xs uppercase text-slate-500">
                <th className="py-2">No</th>
                <th className="py-2">Tanggal</th>
                <th className="py-2 text-right">Total</th>
                <th className="py-2 text-right">Bayar</th>
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, 50).map((o) => (
                <tr key={o.id} className="border-b border-slate-100">
                  <td className="py-1.5 font-bold">#{o.order_number}</td>
                  <td className="py-1.5 text-slate-600">{format(parseISO(o.created_at), 'dd MMM yy HH:mm')}</td>
                  <td className="py-1.5 text-right font-bold">{formatIDR(o.total_price)}</td>
                  <td className="py-1.5 text-right text-slate-600">{o.payment_method || 'Cash'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
