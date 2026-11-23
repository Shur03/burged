import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { isAdmin } from "@/lib/admin";
import { currency, phoneLink } from "@/lib/doors";
import { bankAccount, getOrder } from "@/lib/order-store";
import { formatOrderDate, fulfillmentLabels, orderLabels } from "@/lib/orders";
import { qpaySandboxConfigured, qpaySandboxEnabled } from "@/lib/qpay";
import { Header } from "../../../ui";
import { RefreshOrder } from "../../../orders/refresh";
import { OrderActionForm } from "../forms";

export const metadata: Metadata = { title: "Захиалгын дэлгэрэнгүй", robots: { index: false, follow: false } };
type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ updated?: string }> };

async function OrderDetails({ params, searchParams }: Props) {
  if (!await isAdmin()) redirect("/admin");
  const { id } = await params;
  const order = getOrder(id);
  if (!order) notFound();
  const { updated } = await searchParams;
  const total = order.payment?.total ?? order.quotedTotal;
  const { status } = order;
  const qpay = order.payment?.method === "qpay" ? order.payment : undefined;
  const sandbox = qpaySandboxEnabled();
  const canCancel = (status === "new" && !qpay) || status === "awaiting_payment";
  return <main className="wrap admin-main order-page">
    {status === "awaiting_payment" && qpay && <RefreshOrder />}
    <Link className="back-link" href="/admin/orders">‹ Захиалгын жагсаалт</Link>
    {updated === "1" && <p className="form-success" role="status">Захиалгын төлөвийг шинэчиллээ.</p>}
    <div className="admin-panel admin-editor">
      <div className="order-header">
        <div><h1>{order.reference}</h1><p className="order-title">{order.door.title}</p></div>
        <span className={`order-status status-${status}`}>{orderLabels[status]}</span>
      </div>
      <dl className="dimensions order-facts">
        <div><dt>Захиалга өгсөн</dt><dd>{formatOrderDate(order.createdAt)}</dd></div>
        <div><dt>Захиалагч</dt><dd>{order.customer.name}</dd></div>
        <div><dt>Утас</dt><dd><a href={phoneLink(order.customer.phone)}>{order.customer.phone}</a></dd></div>
        <div><dt>Сонголт</dt><dd>{order.door.size} · {order.door.opening} · {order.quantity} ш</dd></div>
        <div><dt>Авах хэлбэр</dt><dd>{fulfillmentLabels[order.fulfillment]}</dd></div>
        {order.customer.address && <div><dt>Хүргэлтийн хаяг</dt><dd>{order.customer.address}</dd></div>}
        <div><dt>Урьдчилсан дүн</dt><dd>{currency(order.quotedTotal)}</dd></div>
        {order.payment && status !== "new" && <div><dt>Баталгаажсан дүн</dt><dd>{currency(order.payment.total)}</dd></div>}
        {qpay?.invoice && <div><dt>QPay sandbox нэхэмжлэх</dt><dd>{qpay.invoice.id}</dd></div>}
        {order.payment?.transaction && <div><dt>{qpay ? "QPay гүйлгээний дугаар" : "Банкны гүйлгээний дугаар"}</dt><dd>{order.payment.transaction}</dd></div>}
        {order.payment?.paidAt && <div><dt>Төлбөр баталгаажуулсан</dt><dd>{formatOrderDate(order.payment.paidAt)}</dd></div>}
      </dl>
      <div className="order-operations" key={status}>
        {status === "new" && qpay && <p className="form-error">QPay нэхэмжлэх үүсэхийг хүлээж байна. Хэвээр байвал захиалгын дугаараар QPay дээр шалгана уу.</p>}
        {status === "new" && !qpay && ((sandbox ? qpaySandboxConfigured() : bankAccount())
          ? <OrderActionForm id={id} status={status} operation="approve" total={total} qpay={sandbox} />
          : <p className="form-error">{sandbox ? "QPay sandbox тохиргоог гүйцээнэ үү." : "Шилжүүлэг хүлээн авах дансны мэдээлэл тохируулаагүй байна."}</p>)}
        {status === "awaiting_payment" && <OrderActionForm id={id} status={status} operation={qpay ? "check-qpay" : "mark-paid"} total={total} />}
        {status === "paid" && <OrderActionForm id={id} status={status} operation="complete" total={total} />}
        {canCancel && <OrderActionForm id={id} status={status} operation="cancel" total={total} />}
      </div>
    </div>
  </main>;
}

export default function OrderDetailsPage(props: Props) {
  return <><Header admin /><Suspense fallback={<p className="wrap empty">Уншиж байна…</p>}>
    <OrderDetails {...props} />
  </Suspense></>;
}
