"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { rememberOrder } from "@/lib/order-access";
import { createOrder } from "@/lib/order-store";
import { normalizeOrderPhone } from "@/lib/orders";

export type CheckoutState = { error?: string; values?: Record<string, string> };

export async function submitOrder(id: string, doorId: string, _: CheckoutState, data: FormData): Promise<CheckoutState> {
  const read = (key: string) => String(data.get(key) ?? "").trim();
  const values = {
    name: read("name"), phone: read("phone"), address: read("address"),
    quantity: read("quantity"), fulfillment: read("fulfillment"), size: read("size"), opening: read("opening"),
  };
  const fail = (error: string) => ({ error, values });
  const { name, address, fulfillment, size, opening } = values;
  const phone = normalizeOrderPhone(values.phone);
  const quantity = Number(values.quantity);
  if (!name || name.length > 80) return fail("Нэрээ 80 тэмдэгтэд багтааж оруулна уу.");
  if (!/^\d{8}$/.test(phone)) return fail("Монголын 8 оронтой утасны дугаар оруулна уу.");
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) return fail("Тоо ширхгийг 1–99 хооронд оруулна уу.");
  if (fulfillment !== "delivery" && fulfillment !== "pickup") return fail("Бараагаа авах хэлбэрээ сонгоно уу.");
  if (fulfillment === "delivery" && !address) return fail("Хүргэлтийн хаягаа оруулна уу.");
  if (address.length > 240) return fail("Хаягаа 240 тэмдэгтэд багтааж оруулна уу.");
  if (!size || !opening || size.length > 100 || opening.length > 100) return fail("Хэмжээ болон онгойх чиглэлээ сонгоно уу.");

  const orderId = await createOrder({
    id, doorId, size, opening, quantity, fulfillment,
    customer: { name, phone, address },
  });
  if (!orderId) return fail("Барааны мэдээлэл өөрчлөгдсөн байна. Каталогоос бараагаа дахин сонгоно уу.");

  await rememberOrder(orderId);
  revalidatePath("/admin/orders");
  redirect(`/orders/${orderId}`);
}
