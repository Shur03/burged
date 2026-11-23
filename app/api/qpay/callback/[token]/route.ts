import { getOrderByQPayCallback } from "@/lib/order-store";
import { reconcileQPayOrder } from "@/lib/qpay-orders";

export async function POST(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const headers = { "Cache-Control": "no-store" };
  if (!/^[a-f0-9]{48}$/.test(token)) return new Response(null, { status: 404, headers });
  const order = getOrderByQPayCallback(token);
  if (!order || order.payment?.method !== "qpay") return new Response(null, { status: 404, headers });
  if (order.status === "cancelled") return new Response("SUCCESS", { headers });

  // The callback is a notification. Confirm payment against our stored invoice via QPay.
  try {
    if (await reconcileQPayOrder(order)) return new Response("SUCCESS", { headers });
  } catch {
    return new Response("Payment verification unavailable", { status: 503, headers });
  }
  return new Response("Payment not verified", { status: 503, headers });
}

export const GET = POST;
