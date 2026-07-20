export type UserRole = 'kitchen' | 'cashier' | 'pickup' | 'admin';
export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'paid' | 'completed' | 'cancelled';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  // passcode is INTENTIONALLY omitted from the client interface for security
}

export interface MenuOption {
  label: string;
  price_delta: number; // add-on to base price; 0 = no change
}

export interface MenuOptionGroup {
  name: string; // e.g. "Daging", "Ukuran", "Rasa"
  required: boolean;
  options: MenuOption[];
}

export interface Menu {
  id: string;
  name: string;
  category: string;
  price: number;
  image_url: string;
  is_active: boolean;
  option_groups?: MenuOptionGroup[]; // configurable choices shown at kiosk
}

export interface SelectedOption {
  group: string;
  choice: string;
  price_delta: number;
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
  selected_options?: SelectedOption[]; // chosen modifiers (meat/size/flavor)
  menus?: Menu; // Relational JOIN mapping
}

/** Out-of-stock warning raised by the kitchen and shown to the admin. */
export interface StockAlert {
  id: string;
  menu_id: string;
  menu_name: string;
  created_at: string;
  resolved: boolean;
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
  payment_method?: string; // Set when cashier completes the order
  order_items?: OrderItem[]; // Relational JOIN mapping
}
