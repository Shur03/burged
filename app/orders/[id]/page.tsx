import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { currency } from "@/lib/doors";
import { getOrder } from "@/lib/order-store";
import { fulfillmentLabels, orderLabels, type OrderStatus } from "@/lib/orders";
import { Footer, Header } from "../../ui";
import { RefreshOrder } from "../refresh";

export const metadata: Metadata = {
  title: "Захиалгын төлөв", robots: { index: false, follow: false }, referrer: "no-referrer",
};

const statusMessages: Record<OrderStatus, string> = {
  new: "Захиалгыг хүлээн авлаа. Дэлгүүр утсаар холбогдож, захиалга болон эцсийн дүнг баталгаажуулна.",
  awaiting_payment: "Доорх дүнг шилжүүлж, гүйлгээний утгад захиалгын дугаараа бичнэ үү.",
  paid: "Таны төлбөр баталгаажлаа.",
  completed: "Захиалга биелсэн байна.",
  cancelled: "Захиалга цуцлагдсан.",
};

async function Receipt({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) notFound();
  const payment = order.payment;
  const qpay = payment?.method === "qpay" ? payment.invoice : undefined;
  const awaiting = order.status === "awaiting_payment";
  return <main className="wrap admin-main order-page">
    {(order.status === "new" || (awaiting && qpay)) && <RefreshOrder />}
    <Link href="/#catalog" className="back-link">‹ Каталог руу буцах</Link>
    <section className="admin-panel admin-editor">
      <h1>Захиалгын төлөв</h1>
      <p className="order-title">{order.door.title}</p>
      <span className={`order-status status-${order.status}`}>{orderLabels[order.status]}</span>
      <p className="order-message">{awaiting && qpay ? "QR код уншуулах эсвэл банкны апп-аараа төлнө үү." : statusMessages[order.status]}</p>
      <dl className="dimensions order-facts">
        <div><dt>Захиалгын дугаар</dt><dd>{order.reference}</dd></div>
        <div><dt>Сонголт</dt><dd>{order.door.size} · {order.door.opening} · {order.quantity} ш</dd></div>
        <div><dt>Авах хэлбэр</dt><dd>{fulfillmentLabels[order.fulfillment]}</dd></div>
        <div><dt>{payment && order.status !== "new" ? "Баталгаажсан дүн" : "Урьдчилсан дүн"}</dt><dd>{currency(order.status === "new" ? order.quotedTotal : payment?.total ?? order.quotedTotal)}</dd></div>
      </dl>
      {awaiting && qpay && <section className="bank-details qpay-details">
        <h2>QPay sandbox төлбөр</h2>
        <Image src={`data:image/png;base64,${qpay.qrImage}`} width={256} height={256}
          alt="QPay нэхэмжлэхийн QR код" unoptimized />
        {qpay.links.length > 0 && <div className="admin-actions" aria-label="Банкны апп">
          {qpay.links.map(({ url, name }, index) => <a className="button outline" href={url} key={index}>{name}</a>)}
        </div>}
      </section>}
      {awaiting && payment && payment.method !== "qpay" && <section className="bank-details">
        <h2>Шилжүүлэг хийх мэдээлэл</h2>
        <dl className="dimensions">
          {payment.bank.name && <div><dt>Банк</dt><dd>{payment.bank.name}</dd></div>}
          <div><dt>Дансны дугаар</dt><dd>{payment.bank.account}</dd></div>
          {payment.bank.holder && <div><dt>Хүлээн авагч</dt><dd>{payment.bank.holder}</dd></div>}
          <div><dt>Гүйлгээний утга</dt><dd>{order.reference}</dd></div>
        </dl>
      </section>}
      <p className="order-note">Захиалгын төлөвөө дахин харахын тулд энэ хуудасны холбоосыг хадгалаарай.</p>
    </section>
  </main>;
}

export default function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  return <><Header /><Suspense fallback={<p className="wrap empty">Уншиж байна…</p>}>
    <Receipt params={params} />
  </Suspense><Footer /></>;
}
