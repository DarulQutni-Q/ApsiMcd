"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { DownloadSimple, TrendUp, Coin, CheckCircle, Package, Receipt } from "@phosphor-icons/react/dist/ssr";
import { PasscodeDialog } from "@/components/shared/PasscodeDialog";
import { createClient } from "@/lib/supabase/client";
import { format, parseISO } from "date-fns";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";

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
const Cell = dynamic(() => import('recharts').then(mod => mod.Cell), { ssr: false });

const COLORS = ['#a7c080', '#e67e80', '#dbbc7f', '#7fbbb3', '#d699b6', '#83c092'];

export function AdminClient() {
  const [passcode, setPasscode] = useState<string | null>(null);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [productData, setProductData] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [summary, setSummary] = useState({ totalRevenue: 0, totalOrders: 0, itemsSold: 0 });

  useEffect(() => {
    if (!passcode) return;

    const supabase = createClient();

    const fetchData = async () => {
      const { data: ordersData } = await supabase
        .from('orders')
        .select('id, created_at, total_price, order_number, status')
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      const { data: itemsData } = await supabase
        .from('order_items')
        .select('qty, menus(name, category), orders!inner(status)')
        .eq('orders.status', 'completed');

      if (ordersData) {
        setRecentOrders(ordersData);
        
        let totalRev = 0;
        const grouped = ordersData.reduce((acc: any, order: any) => {
          const date = format(parseISO(order.created_at), 'MMM dd');
          if (!acc[date]) acc[date] = 0;
          acc[date] += Number(order.total_price);
          totalRev += Number(order.total_price);
          return acc;
        }, {});

        const formattedData = Object.keys(grouped).map(date => ({
          date,
          revenue: grouped[date]
        })).reverse();
        
        setRevenueData(formattedData);
        setSummary(prev => ({ ...prev, totalRevenue: totalRev, totalOrders: ordersData.length }));
      }

      if (itemsData) {
        let totalItems = 0;
        const itemCounts = itemsData.reduce((acc: any, item: any) => {
           const name = item.menus?.name || 'Unknown Item';
           if (!acc[name]) acc[name] = 0;
           acc[name] += item.qty;
           totalItems += item.qty;
           return acc;
        }, {});

        const sortedProducts = Object.keys(itemCounts)
           .map(name => ({ name, value: itemCounts[name] }))
           .sort((a, b) => b.value - a.value);

        setProductData(sortedProducts);
        setSummary(prev => ({ ...prev, itemsSold: totalItems }));
      }
    };

    fetchData();

    const channel = supabase.channel('admin_stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => {
        fetchData();
      })
      .subscribe();

    const interval = setInterval(fetchData, 10000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [passcode]);

  const exportCSV = async () => {
    const supabase = createClient();
    const { data } = await supabase.from('orders').select('*, order_items(*)').eq('status', 'completed');
    
    if (!data) return;

    const headers = ['Order Number', 'Date', 'Subtotal', 'Tax', 'Discount', 'Total', 'Payment Method'];
    const rows = data.map(order => [
      order.order_number,
      order.created_at,
      order.subtotal,
      order.tax_amount,
      order.discount_amount,
      order.total_price,
      'Cash'
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

  if (!passcode) {
    return <PasscodeDialog isOpen={true} role="admin" onSuccess={setPasscode} />;
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border p-3 rounded-lg shadow-lg">
          <p className="font-bold text-foreground mb-1">{label || payload[0].name}</p>
          <p className="text-[#d699b6] font-bold">
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
        <div className="absolute right-[140px] top-3 flex items-center pr-4 z-30">
          <button onClick={exportCSV} className="flex items-center gap-2 rounded-lg bg-[#d699b6]/10 text-[#d699b6] px-4 py-2 text-sm font-bold transition-all hover:bg-[#d699b6] hover:text-white shadow-sm active:scale-95">
            <DownloadSimple weight="bold" /> Export CSV
          </button>
        </div>
      </div>

      <div className="mx-auto w-full max-w-7xl flex-1 p-6 md:p-8 z-10 bg-background/50">
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
           <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
             <Card className="border-border/60 shadow-sm bg-card hover:bg-muted/10 transition-colors">
               <CardContent className="p-6 flex items-center justify-between">
                 <div>
                   <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-1">Total Revenue</p>
                   <h3 className="text-3xl font-black text-foreground">{formatIDR(summary.totalRevenue)}</h3>
                 </div>
                 <div className="h-12 w-12 rounded-full bg-[#d699b6]/10 flex items-center justify-center text-[#d699b6]">
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
                 <div className="h-12 w-12 rounded-full bg-[#d699b6]/10 flex items-center justify-center text-[#d699b6]">
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
                 <div className="h-12 w-12 rounded-full bg-[#d699b6]/10 flex items-center justify-center text-[#d699b6]">
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
                  <TrendUp weight="bold" className="text-[#d699b6] h-5 w-5" />
                  <CardTitle className="text-lg font-black tracking-tight text-foreground">Revenue Trends</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-6">
                {revenueData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#d699b6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#d699b6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} axisLine={false} tickLine={false} dy={10} />
                      <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(val) => new Intl.NumberFormat("id-ID", { notation: "compact", maximumFractionDigits: 1 }).format(val)} width={80} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="revenue" stroke="#d699b6" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
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
                    <div className="h-[200px] shrink-0 mb-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={productData.slice(0, 5)}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                          >
                            {productData.slice(0, 5).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                       {productData.map((prod, idx) => (
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
              <div className="flex items-center gap-2">
                <Receipt weight="bold" className="text-[#d699b6] h-5 w-5" />
                <CardTitle className="text-lg font-black tracking-tight text-foreground">Recent Transactions</CardTitle>
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {recentOrders.length > 0 ? (
                    recentOrders.slice(0, 10).map((order) => (
                      <tr key={order.id} className="bg-card hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-4 font-black text-foreground">#{order.order_number}</td>
                        <td className="px-6 py-4 font-medium text-muted-foreground">
                          {format(parseISO(order.created_at), 'MMM dd, yyyy HH:mm')}
                        </td>
                        <td className="px-6 py-4 font-bold text-[#d699b6]">
                          {formatIDR(order.total_price)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-muted text-muted-foreground border border-border/50 shadow-sm">
                            {'Cash'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#d699b6]/10 text-[#d699b6]">
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground font-medium">No transactions found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </motion.div>

      </div>
    </div>
  );
}
