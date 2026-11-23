import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { isAdmin } from "@/lib/admin";
import { currency } from "@/lib/doors";
import { bankAccount, listOrders } from "@/lib/order-store";
import { formatOrderDate, orderLabels } from "@/lib/orders";
import { qpaySandboxConfigured, qpaySandboxEnabled } from "@/lib/qpay";
import { Header } from "../../ui";
import { logout } from "../actions";

export const metadata: Metadata = { title: "Захиалгын удирдлага", robots: { index: false, follow: false } };

async function Orders({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  if (!await isAdmin()) redirect("/admin");
  const { status } = await searchParams;
  const sandbox = qpaySandboxEnabled();
  const orders = listOrders().filter((order) => !status || !Object.hasOwn(orderLabels, status) || order.status === status);
  return <main className="wrap admin-main">
    <div className="admin-heading">
      <div><h1>Захиалгын удирдлага</h1><p>{orders.length} захиалга</p></div>
      <div className="admin-actions">
        <Link className="button outline" href="/admin">Барааны бүртгэл</Link>
        <form action={logout}><button className="button outline" type="submit">Гарах</button></form>
      </div>
    </div>
    {sandbox ? <p className={`order-notice ${qpaySandboxConfigured() ? "order-note" : "form-error"}`}>
      {qpaySandboxConfigured() ? "QPay sandbox идэвхтэй байна." : "QPay sandbox тохиргоог гүйцээнэ үү."}
    </p> : !bankAccount() && <p className="form-error order-notice">Шилжүүлэг хүлээн авах дансны мэдээлэл тохируулаагүй байна.</p>}
    <nav className="filters order-filters" aria-label="Захиалгын төлөв">
      <Link className="button outline" aria-current={!status ? "page" : undefined} href="/admin/orders">Бүгд</Link>
      {Object.entries(orderLabels).map(([key, label]) => (
        <Link className="button outline" key={key} href={`/admin/orders?status=${key}`} aria-current={key === status ? "page" : undefined}>
          {label}
        </Link>
      ))}
    </nav>
    <div className="admin-panel admin-list">
      {orders.length ? orders.map((order) => (
        <Link className="order-row" key={order.id} href={`/admin/orders/${order.id}`} prefetch={false}>
          <div className="admin-product"><h2>{order.door.title}</h2><p>{order.reference} · {formatOrderDate(order.createdAt)}</p></div>
          <span className={`order-status status-${order.status}`}>{orderLabels[order.status]}</span>
          <strong>{currency(order.payment?.total ?? order.quotedTotal)}</strong>
        </Link>
      )) : <p className="empty">Захиалга байхгүй байна.</p>}
    </div>
  </main>;
}

export default function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  return <><Header admin /><Suspense fallback={<p className="wrap empty">Уншиж байна…</p>}>
    <Orders searchParams={searchParams} />
  </Suspense></>;
}
