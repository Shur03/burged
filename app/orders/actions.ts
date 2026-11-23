"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { rememberedOrderIds, rememberOrder } from "@/lib/order-access";
import { allowOrderLookup } from "@/lib/order-lookup-limit";
import { findOrderId, listRememberedOrders } from "@/lib/order-store";
import { normalizeOrderPhone, type OrderSummary } from "@/lib/orders";

type LookupState = { error?: string; orders?: OrderSummary[] };

export async function rememberReceipt(id: string) {
  await rememberOrder(id);
  redirect("/orders");
}

export async function checkOrder(_: LookupState, data: FormData): Promise<LookupState> {
  const rawPhone = data.get("phone");
  const rawReference = data.get("reference") ?? "";
  const phone = typeof rawPhone === "string" && rawPhone.length <= 24 ? normalizeOrderPhone(rawPhone) : "";
  if (!/^\d{8}$/.test(phone)) return { error: "Монголын 8 оронтой утасны дугаар оруулна уу." };
  if (typeof rawReference !== "string" || rawReference.length > 24) {
    return { error: "Захиалгын кодоо шалгаад дахин оруулна уу." };
  }

  if (rawReference.trim()) {
    const reference = /^(?:BG-?)?([0-9A-F]{16})$/i.exec(rawReference.trim())?.[1];
    if (!reference) return { error: "Захиалгын кодоо шалгаад дахин оруулна уу." };
    if (!await allowOrderLookup(await headers())) {
      return { error: "Хэт олон удаа оролдлоо. Түр хүлээгээд дахин шалгана уу." };
    }
    const id = await findOrderId(`BG-${reference.toUpperCase()}`, phone);
    if (!id) return { error: "Тохирох захиалга олдсонгүй. Утасны дугаар болон кодоо шалгана уу." };
    await rememberOrder(id);
  }

  return { orders: await listRememberedOrders(phone, await rememberedOrderIds()) };
}
