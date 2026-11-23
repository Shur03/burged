import { cookies } from "next/headers";

const prefix = "door_order_";
const retainedOrders = 25;
const maxAge = 180 * 24 * 60 * 60;
const orderIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function orderAccessEntries(entries: { name: string; value: string }[]) {
  return entries
    .filter(({ name, value }) => name.startsWith(prefix) && orderIdPattern.test(name.slice(prefix.length))
      && /^\d{13}$/.test(value))
    .sort((a, b) => Number(b.value) - Number(a.value));
}

export async function rememberedOrderIds() {
  const entries = orderAccessEntries((await cookies()).getAll());
  return entries.slice(0, retainedOrders).map(({ name }) => name.slice(prefix.length));
}

export async function rememberOrder(id: string) {
  if (!orderIdPattern.test(id)) return;
  const cookieStore = await cookies();
  const name = prefix + id;
  const otherOrders = orderAccessEntries(cookieStore.getAll()).filter((entry) => entry.name !== name);
  // Each receipt ID is already an unguessable access token. Separate cookies avoid lost updates
  // when two checkouts finish in the same browser at the same time.
  const options = { path: "/", httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" } as const;
  for (const entry of otherOrders.slice(retainedOrders - 1)) {
    cookieStore.set(entry.name, "", { ...options, maxAge: 0 });
  }
  cookieStore.set(name, String(Date.now()), { ...options, maxAge });
}
