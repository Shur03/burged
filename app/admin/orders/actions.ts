"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { bankAccount, getOrder, updateOrder } from "@/lib/order-store";
import type { Order, OrderStatus, QPayPayment } from "@/lib/orders";
import { cancelQPayInvoice, createQPayInvoice, qpaySandboxConfigured, qpaySandboxEnabled } from "@/lib/qpay";
import { reconcileQPayOrder, refreshOrderPages } from "@/lib/qpay-orders";

export async function advanceOrder(id: string, expected: OrderStatus, _: string, form: FormData) {
  if (!await isAdmin()) redirect("/admin");
  const order = getOrder(id);
  if (!order) return "Захиалга олдсонгүй.";
  if (order.status !== expected) return "Захиалгын төлөв өөрчлөгдсөн байна. Хуудсаа шинэчилнэ үү.";

  let next: Order;
  const operation = form.get("operation");
  if (operation === "approve" && order.status === "new") {
    if (order.payment) return "QPay нэхэмжлэхийн төлөвийг шалгана уу.";
    const total = Number(form.get("total"));
    if (!Number.isSafeInteger(total) || total < 1) return "Эцсийн дүнг эерэг бүхэл төгрөгөөр оруулна уу.";
    if (qpaySandboxEnabled()) {
      if (!qpaySandboxConfigured()) return "QPay sandbox тохиргоог гүйцээнэ үү.";
      const payment: QPayPayment = { method: "qpay", total, callbackToken: randomBytes(24).toString("hex") };
      const reserved = { ...order, payment };
      // Reserve this order before calling QPay, so a second approval cannot create another invoice.
      if (!updateOrder(reserved, order)) return "Захиалгын төлөв өөрчлөгдсөн байна. Хуудсаа шинэчилнэ үү.";
      const result = await createQPayInvoice(order.reference, total, payment.callbackToken);
      if ("error" in result) {
        if (result.error === "rejected") {
          updateOrder(order, reserved);
          return "QPay нэхэмжлэх үүсгэж чадсангүй. Sandbox тохиргоогоо шалгаад дахин оролдоно уу.";
        }
        refreshOrderPages(id);
        return "QPay нэхэмжлэх үүссэн эсэх тодорхойгүй байна. Захиалгын дугаараар QPay дээр шалгана уу.";
      }
      const awaiting: Order = { ...reserved, status: "awaiting_payment", payment: { ...payment, invoice: result.invoice } };
      if (!updateOrder(awaiting, reserved)) return "QPay нэхэмжлэхийг захиалгад холбож чадсангүй.";
      refreshOrderPages(id);
      redirect(`/admin/orders/${id}?updated=1`);
    }
    const bank = bankAccount();
    if (!bank) return "Шилжүүлэг хүлээн авах дансны тохиргоог гүйцээнэ үү.";
    next = { ...order, status: "awaiting_payment", payment: { method: "bank", total, bank } };
  } else if (operation === "mark-paid" && order.status === "awaiting_payment"
    && order.payment && order.payment.method !== "qpay") {
    const transaction = String(form.get("transaction") ?? "").trim().replace(/\s+/g, " ").toUpperCase();
    if (!transaction || transaction.length > 80) return "Банкны гүйлгээний дугаарыг 80 тэмдэгтэд багтааж оруулна уу.";
    next = { ...order, status: "paid", payment: { ...order.payment, transaction, paidAt: new Date().toISOString() } };
  } else if (operation === "check-qpay" && order.status === "awaiting_payment" && order.payment?.method === "qpay") {
    try {
      if (!await reconcileQPayOrder(order)) return "QPay бүтэн дүнгийн төлбөрийг хараахан баталгаажуулаагүй байна.";
    } catch {
      return "QPay төлбөрийг одоогоор шалгаж чадсангүй.";
    }
    redirect(`/admin/orders/${id}?updated=1`);
  } else if (operation === "complete" && order.status === "paid") {
    next = { ...order, status: "completed" };
  } else if (operation === "cancel" && (order.status === "new" || order.status === "awaiting_payment")) {
    if (order.payment?.method === "qpay") {
      if (!order.payment.invoice) return "Эхлээд QPay нэхэмжлэхийн төлөвийг шалгана уу.";
      let paid: boolean;
      try {
        paid = await reconcileQPayOrder(order);
        if (!paid) await cancelQPayInvoice(order.payment.invoice.id);
      } catch {
        return "QPay нэхэмжлэхийг цуцалж чадсангүй. Төлбөрийн төлөвийг шалгана уу.";
      }
      if (paid) redirect(`/admin/orders/${id}?updated=1`);
    }
    next = { ...order, status: "cancelled" };
  } else {
    return "Энэ үйлдлийг одоогийн төлөвт хийх боломжгүй.";
  }

  if (!updateOrder(next, order)) {
    return "Захиалгын төлөв өөрчлөгдсөн эсвэл банкны гүйлгээний дугаар бүртгэгдсэн байна.";
  }
  refreshOrderPages(id);
  redirect(`/admin/orders/${id}?updated=1`);
}
