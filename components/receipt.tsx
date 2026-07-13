import type { Order } from "@/types";

const formatIDR = (price: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(price);

const STORE_NAME = "EVERFOREST DRIVE-THRU";
const STORE_ADDRESS = "Jl. Contoh No. 123, Jakarta";

export function Receipt({
  order,
  storeName = STORE_NAME,
  storeAddress = STORE_ADDRESS,
  paymentMethod,
}: {
  order: Order;
  storeName?: string;
  storeAddress?: string;
  paymentMethod?: string;
}) {
  const method = paymentMethod || order.payment_method || "Cash";
  const items = (order.order_items || []).filter((i) => !i.is_rejected);
  const created = new Date(order.created_at);
  const dateStr = created.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const timeStr = created.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

  return (
    <div
      id="print-receipt"
      className="mx-auto w-[320px] bg-white p-5 font-mono text-[12px] leading-tight text-black"
    >
      <div className="text-center">
        <p className="text-[15px] font-bold tracking-widest">{storeName}</p>
        <p className="mt-0.5 text-[10px]">{storeAddress}</p>
        <p className="mt-0.5 text-[10px]">Telp: (021) 1234-5678</p>
      </div>

      <div className="my-3 border-t-2 border-dashed border-black" />

      <div className="flex justify-between text-[11px]">
        <span>No: #{order.order_number}</span>
        <span>{dateStr}</span>
      </div>
      <div className="flex justify-between text-[11px]">
        <span>Kasir: Everforest</span>
        <span>{timeStr}</span>
      </div>

      <div className="my-3 border-t-2 border-dashed border-black" />

      <div className="space-y-1.5">
        {items.map((item) => (
          <div key={item.id}>
            <div className="flex justify-between">
              <span className="font-bold">
                {item.qty}x {item.menus?.name}
              </span>
              <span>{formatIDR(item.subtotal_price)}</span>
            </div>
            {item.selected_options && item.selected_options.length > 0 && (
              <p className="pl-3 text-[9px] text-gray-600">
                ({item.selected_options.map((o) => o.choice).join(", ")})
              </p>
            )}
          </div>
        ))}
        {items.length === 0 && <p className="text-center text-gray-500">— pesanan dibatalkan —</p>}
      </div>

      <div className="my-3 border-t-2 border-dashed border-black" />

      <div className="space-y-1">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{formatIDR(order.subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span>Pajak (10%)</span>
          <span>{formatIDR(order.tax_amount)}</span>
        </div>
        {order.discount_amount > 0 && (
          <div className="flex justify-between">
            <span>Diskon</span>
            <span>-{formatIDR(order.discount_amount)}</span>
          </div>
        )}
        <div className="my-1 border-t border-dashed border-gray-400" />
        <div className="flex justify-between text-[13px] font-bold">
          <span>TOTAL</span>
          <span>{formatIDR(order.total_price)}</span>
        </div>
        <div className="flex justify-between">
          <span>Bayar ({method})</span>
          <span>{formatIDR(order.total_price)}</span>
        </div>
      </div>

      <div className="my-3 border-t-2 border-dashed border-black" />

      <p className="text-center text-[10px]">~ Terima kasih atas kunjungan Anda ~</p>
      <p className="text-center text-[9px] text-gray-600">Simpan struk ini sebagai bukti pembelian</p>
    </div>
  );
}
