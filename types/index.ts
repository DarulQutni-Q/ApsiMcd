export type UserRole = 'kitchen' | 'cashier' | 'admin';
export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'completed';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  // passcode is INTENTIONALLY omitted from the client interface for security
}

export interface Menu {
  id: string;
  name: string;
  category: string;
  price: number;
  image_url: string;
  is_active: boolean;
}

export interface Promo {
  id: string;
  name: string;
  discount_percent: number;
  valid_days: string[]; // e.g., ["Saturday", "Sunday"]
  is_active: boolean;
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_id: string;
  qty: number;
  subtotal_price: number;
  is_checked: boolean; // For Kitchen interactive checklist
  menus?: Menu; // Relational JOIN mapping
}

export interface Order {
  id: string;
  order_number: number; // Short human-readable number (e.g., #42)
  subtotal: number;
  tax_amount: number; // e.g., 10% PB1 F&B tax
  discount_amount: number;
  total_price: number;
  status: OrderStatus;
  created_at: string;
  order_items?: OrderItem[]; // Relational JOIN mapping
}
