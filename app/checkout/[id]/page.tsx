import { randomUUID } from "node:crypto";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { orderOptions } from "@/lib/order-store";
import { getDoor } from "@/lib/store";
import { Header, Footer } from "../../ui";
import { submitOrder } from "../actions";
import { CheckoutForm } from "../form";

export const metadata: Metadata = { title: "Захиалга өгөх", robots: { index: false, follow: false } };

async function Checkout({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const door = getDoor(id);
  if (!door || door.sample) notFound();
  return <main className="wrap admin-main order-page">
    <Link className="back-link" href={`/doors/${door.id}`}>‹ Барааны дэлгэрэнгүй</Link>
    <div className="admin-panel admin-editor">
      <h1>Захиалга өгөх</h1>
      <p className="order-title">{door.title}</p>
      <CheckoutForm sizeOptions={orderOptions(door.size)} openingOptions={orderOptions(door.opening)}
        price={door.price} pickupPrice={door.pickupPrice} action={submitOrder.bind(null, randomUUID(), door.id)} />
    </div>
  </main>;
}

export default function CheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  return <><Header /><Suspense fallback={<p className="wrap empty">Уншиж байна…</p>}>
    <Checkout params={params} />
  </Suspense><Footer /></>;
}
