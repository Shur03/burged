import { revalidatePath } from "next/cache";
import { getOrder, updateOrder } from "./order-store";
import type { Order } from "./orders";
import { checkQPayPayment } from "./qpay";

export function refreshOrderPages(id: string) {
  revalidatePath(`/orders/${id}`);
  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin/orders");
}

export async function reconcileQPayOrder(order: Order) {
  if (order.payment?.method !== "qpay") return false;
  if (order.status === "paid" || order.status === "completed") return true;
  if (order.status !== "awaiting_payment" || !order.payment.invoice) return false;
  const transaction = await checkQPayPayment(order.payment.invoice.id, order.payment.total);
  if (!transaction) return false;

  const updated = await updateOrder({
    ...order,
    status: "paid",
    payment: { ...order.payment, transaction, paidAt: new Date().toISOString() },
  }, order);
  if (updated) {
    refreshOrderPages(order.id);
    return true;
  }
  // A duplicate callback can finish the transition while this check is in flight.
  const current = await getOrder(order.id);
  return current?.payment?.transaction === transaction
    && (current.status === "paid" || current.status === "completed");
}
