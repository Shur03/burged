import { randomBytes } from "node:crypto";
import type { BankAccount, Order } from "./orders";
import { db, getDoor } from "./store";

type OrderRecord = { record: string };

export function bankAccount(): BankAccount | undefined {
  const name = process.env.DOOR_BANK_NAME?.trim();
  const account = process.env.DOOR_BANK_ACCOUNT?.trim();
  const holder = process.env.DOOR_BANK_HOLDER?.trim();
  if (account) return { name, account, holder };
}

export function getOrder(id: string) {
  const row = db().prepare<OrderRecord>("SELECT record FROM orders WHERE id = ?").get(id);
  return row ? JSON.parse(row.record) as Order : undefined;
}

export function getOrderByQPayCallback(token: string) {
  const row = db().prepare<OrderRecord>("SELECT record FROM orders WHERE json_extract(record, '$.payment.callbackToken') = ?").get(token);
  return row ? JSON.parse(row.record) as Order : undefined;
}

export function listOrders() {
  return db().prepare<OrderRecord>("SELECT record FROM orders ORDER BY created_at DESC, rowid DESC").all()
    .map(({ record }) => JSON.parse(record) as Order);
}

type NewOrder = Pick<Order, "id" | "quantity" | "fulfillment" | "customer"> & {
  doorId: string; size: string; opening: string;
};

export function orderOptions(text: string) {
  return [...new Set(text.split(/[,\n]/).map((value) => value.trim()).filter(Boolean))];
}

export function createOrder(input: NewOrder) {
  const database = db();
  database.exec("BEGIN IMMEDIATE");
  try {
    const prior = getOrder(input.id);
    if (prior) {
      database.exec("COMMIT");
      return prior.id;
    }
    const door = getDoor(input.doorId);
    if (!door || door.sample || !orderOptions(door.size).includes(input.size)
      || !orderOptions(door.opening).includes(input.opening)) {
      database.exec("ROLLBACK");
      return;
    }
    const unitPrice = input.fulfillment === "pickup" ? door.pickupPrice ?? door.price : door.price;
    const quotedTotal = unitPrice * input.quantity;
    if (!Number.isSafeInteger(quotedTotal)) {
      database.exec("ROLLBACK");
      return;
    }
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
    database.prepare("INSERT INTO orders (id, reference, created_at, status, record) VALUES (?, ?, ?, ?, ?)")
      .run(order.id, order.reference, order.createdAt, order.status, JSON.stringify(order));
    database.exec("COMMIT");
    return order.id;
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

export function updateOrder(order: Order, previous: Order) {
  const reference = order.payment?.transaction;
  const transaction = reference && order.payment?.method === "qpay" ? `qpay:${reference}` : reference ?? null;
  return db().prepare(`
    UPDATE orders SET status = ?, record = ?, bank_transaction = ?
    WHERE id = ? AND record = ? AND NOT EXISTS (
      SELECT 1 FROM orders WHERE bank_transaction = ? AND id <> ?
    )
  `).run(order.status, JSON.stringify(order), transaction, order.id, JSON.stringify(previous), transaction, order.id).changes;
}
