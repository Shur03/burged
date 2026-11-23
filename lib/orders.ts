export const orderLabels = {
  new: "Шинэ",
  awaiting_payment: "Төлбөр хүлээж буй",
  paid: "Төлбөр баталгаажсан",
  completed: "Дууссан",
  cancelled: "Цуцлагдсан",
} as const;

export type OrderStatus = keyof typeof orderLabels;

export const fulfillmentLabels = {
  pickup: "Өөрөө авах",
  delivery: "Хүргэлтээр авах",
} as const;

export type Fulfillment = keyof typeof fulfillmentLabels;
export type BankAccount = { name?: string; account: string; holder?: string };
export type BankPayment = { method?: "bank"; total: number; bank: BankAccount; transaction?: string; paidAt?: string };
export type QPayInvoice = { id: string; qrImage: string; links: { name: string; url: string }[] };
export type QPayPayment = {
  method: "qpay"; total: number; callbackToken: string; invoice?: QPayInvoice; transaction?: string; paidAt?: string;
};

export type Order = {
  id: string;
  reference: string;
  createdAt: string;
  status: OrderStatus;
  door: { id: string; title: string; size: string; opening: string; unitPrice: number };
  quantity: number;
  fulfillment: Fulfillment;
  customer: { name: string; phone: string; address: string };
  quotedTotal: number;
  payment?: BankPayment | QPayPayment;
};

export type OrderSummary = Pick<Order, "id" | "reference" | "createdAt" | "status"> & { title: string };

export function normalizeOrderPhone(phone: string) {
  return phone.replace(/[\s-]/g, "").replace(/^\+976(?=\d{8}$)/, "");
}

export function formatOrderDate(date: string) {
  return new Intl.DateTimeFormat("mn-MN", {
    dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Ulaanbaatar",
  }).format(new Date(date));
}
