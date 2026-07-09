import { create } from 'zustand';
import { isWeekend } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import type { Menu, Promo, Order } from '@/types';

const JAKARTA_TZ = 'Asia/Jakarta';

interface CartItem {
  menu: Menu;
  qty: number;
}

interface KioskState {
  items: CartItem[];
  activePromo: Promo | null;
  isWeekendActive: boolean;
  activeCategory: string | null;
  selectedMenuId: string | null;
  
  addItem: (menu: Menu) => void;
  removeItem: (menuId: string) => void;
  updateQty: (menuId: string, qty: number) => void;
  clearCart: () => void;
  
  checkWeekendPromo: (promo: Promo) => void;
  getSubtotal: () => number;
  getTax: () => number;
  getDiscount: () => number;
  getTotal: () => number;

  setActiveCategory: (cat: string) => void;
  setSelectedMenuId: (id: string | null) => void;
}

const TAX_RATE = 0.10;

export const useKioskStore = create<KioskState>((set, get) => ({
  items: [],
  activePromo: null,
  isWeekendActive: false,
  activeCategory: null,
  selectedMenuId: null,

  setActiveCategory: (cat) => set({ activeCategory: cat }),
  setSelectedMenuId: (id) => set({ selectedMenuId: id }),

  addItem: (menu) => set((state) => {
    const existing = state.items.find(i => i.menu.id === menu.id);
    if (existing) {
      const newQty = Math.min(existing.qty + 1, 99);
      return { items: state.items.map(i => i.menu.id === menu.id ? { ...i, qty: newQty } : i) };
    }
    return { items: [...state.items, { menu, qty: 1 }] };
  }),

  removeItem: (menuId) => set((state) => ({
    items: state.items.filter(i => i.menu.id !== menuId)
  })),

  updateQty: (menuId, qty) => set((state) => {
    if (qty <= 0) return { items: state.items.filter(i => i.menu.id !== menuId) };
    const safeQty = Math.min(Math.floor(qty), 99);
    return { items: state.items.map(i => i.menu.id === menuId ? { ...i, qty: safeQty } : i) };
  }),

  clearCart: () => set({ items: [] }),

  checkWeekendPromo: (promo) => {
    const nowJakarta = toZonedTime(new Date(), JAKARTA_TZ);
    const weekend = isWeekend(nowJakarta);
    set({ activePromo: weekend ? promo : null, isWeekendActive: weekend });
  },

  getSubtotal: () => {
    return get().items.reduce((sum, item) => sum + (item.menu.price * item.qty), 0);
  },

  getTax: () => {
    return get().getSubtotal() * TAX_RATE;
  },

  getDiscount: () => {
    const state = get();
    if (!state.activePromo || !state.isWeekendActive) return 0;
    const subtotal = state.getSubtotal();
    return subtotal * (state.activePromo.discount_percent / 100);
  },

  getTotal: () => {
    const state = get();
    return Math.max(0, state.getSubtotal() + state.getTax() - state.getDiscount());
  }
}));

interface KitchenState {
  orders: Order[];
  setOrders: (orders: Order[]) => void;
  upsertOrder: (order: Partial<Order> & { id: string }) => void;
  upsertItem: (item: any) => void;
}

export const useKitchenStore = create<KitchenState>((set) => ({
  orders: [],
  setOrders: (orders) => set({ orders }),
  upsertOrder: (newOrder) => set((state) => {
    const exists = state.orders.find(o => o.id === newOrder.id);
    if (exists) {
      return {
        orders: state.orders.map(o => o.id === newOrder.id ? { ...o, ...newOrder } : o)
      };
    }
    return { orders: [...state.orders, newOrder as Order] };
  }),
  upsertItem: (item) => set((state) => ({
    orders: state.orders.map(o => o.id === item.order_id ? {
      ...o,
      order_items: o.order_items?.map(i => i.id === item.id ? { ...i, ...item } : i)
    } : o)
  }))
}));

interface CashierState {
  orders: Order[];
  setOrders: (orders: Order[]) => void;
  upsertOrder: (order: Partial<Order> & { id: string }) => void;
  removeOrder: (orderId: string) => void;
}

export const useCashierStore = create<CashierState>((set) => ({
  orders: [],
  setOrders: (orders) => set({ orders }),
  upsertOrder: (newOrder) => set((state) => {
    const exists = state.orders.find(o => o.id === newOrder.id);
    if (exists) {
      return {
        orders: state.orders.map(o => o.id === newOrder.id ? { ...o, ...newOrder } : o)
      };
    }
    const newArr = [...state.orders, newOrder as Order];
    return { orders: newArr.sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) };
  }),
  removeOrder: (orderId) => set((state) => ({
    orders: state.orders.filter(o => o.id !== orderId)
  }))
}));
