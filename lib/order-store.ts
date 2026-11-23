import { randomBytes } from "node:crypto";
import type { BankAccount, Order, OrderSummary } from "./orders";
import { db, getDoor, writeDatabase } from "./store";

export function bankAccount(): BankAccount | undefined {
  const name = process.env.DOOR_BANK_NAME?.trim();
  const account = process.env.DOOR_BANK_ACCOUNT?.trim();
  const holder = process.env.DOOR_BANK_HOLDER?.trim();
  if (account) return { name, account, holder };
}

export async function getOrder(id: string) {
  const { rows: [row] } = await (await db()).execute("SELECT record FROM orders WHERE id = ?", [id]);
  return row ? JSON.parse(String(row.record)) as Order : undefined;
}

export async function findOrderId(reference: string, phone: string) {
  const { rows: [row] } = await (await db()).execute(
    "SELECT id FROM orders WHERE reference = ? AND json_extract(record, '$.customer.phone') = ?",
    [reference, phone],
  );
  return row ? String(row.id) : undefined;
}

export async function listRememberedOrders(phone: string, ids: string[]): Promise<OrderSummary[]> {
  if (!ids.length) return [];
  const { rows } = await (await db()).execute(`
    SELECT id, reference, created_at, status, json_extract(record, '$.door.title') AS title
    FROM orders
    WHERE id IN (${ids.map(() => "?").join(", ")})
      AND json_extract(record, '$.customer.phone') = ?
    ORDER BY created_at DESC, rowid DESC
  `, [...ids, phone]);
  return rows.map((row) => ({
    id: String(row.id),
    reference: String(row.reference),
    createdAt: String(row.created_at),
    status: row.status as Order["status"],
    title: String(row.title),
  }));
}

export async function getOrderByQPayCallback(token: string) {
  const { rows: [row] } = await (await db()).execute("SELECT record FROM orders WHERE json_extract(record, '$.payment.callbackToken') = ?", [token]);
  return row ? JSON.parse(String(row.record)) as Order : undefined;
}

export async function listOrders() {
  return (await (await db()).execute("SELECT record FROM orders ORDER BY created_at DESC, rowid DESC")).rows
    .map(({ record }) => JSON.parse(String(record)) as Order);
}

type NewOrder = Pick<Order, "id" | "quantity" | "fulfillment" | "customer"> & {
  doorId: string; size: string; opening: string;
};

export function orderOptions(text: string) {
  return [...new Set(text.split(/[,\n]/).map((value) => value.trim()).filter(Boolean))];
}

export function createOrder(input: NewOrder) {
  return writeDatabase(async (tx) => {
    const prior = await tx.execute({ sql: "SELECT id FROM orders WHERE id = ?", args: [input.id] });
    if (prior.rows.length) return input.id;
    const door = await getDoor(input.doorId, tx);
    if (!door || door.sample || !orderOptions(door.size).includes(input.size)
      || !orderOptions(door.opening).includes(input.opening)) {
      return;
    }
    const unitPrice = input.fulfillment === "pickup" ? door.pickupPrice ?? door.price : door.price;
    const quotedTotal = unitPrice * input.quantity;
    if (!Number.isSafeInteger(quotedTotal)) return;
    const order: Order = {
      id: input.id,
      reference: `BG-${randomBytes(8).toString("hex").toUpperCase()}`,
      createdAt: new Date().toISOString(),
      status: "new",
      door: { id: door.id, title: door.title, size: input.size, opening: input.opening, unitPrice },
      quantity: input.quantity,
      fulfillment: input.fulfillment,
      customer: input.customer,
      quotedTotal,
    };
    await tx.execute({ sql: "INSERT INTO orders (id, reference, created_at, status, record) VALUES (?, ?, ?, ?, ?)",
      args: [order.id, order.reference, order.createdAt, order.status, JSON.stringify(order)] });
    return order.id;
  });
}

export async function updateOrder(order: Order, previous: Order) {
  const reference = order.payment?.transaction;
  const transaction = reference && order.payment?.method === "qpay" ? `qpay:${reference}` : reference ?? null;
  return (await (await db()).execute(`
    UPDATE orders SET status = ?, record = ?, bank_transaction = ?
    WHERE id = ? AND record = ? AND NOT EXISTS (
      SELECT 1 FROM orders WHERE bank_transaction = ? AND id <> ?
    )
  `, [order.status, JSON.stringify(order), transaction, order.id, JSON.stringify(previous), transaction, order.id])).rowsAffected;
}
