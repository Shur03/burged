import type { Metadata } from "next";
import { Footer, Header } from "../ui";
import { OrderLookupForm } from "./lookup-form";

export const metadata: Metadata = { title: "Захиалга шалгах" };

export default function OrderLookupPage() {
  return <><Header />
    <main className="wrap admin-main order-page">
      <section className="admin-panel admin-editor">
        <h1>Захиалга шалгах</h1>
        <p className="order-title">Энэ хөтөч дээрх захиалгуудаа захиалга өгөхдөө бичсэн утасны дугаараараа хараарай.</p>
        <OrderLookupForm />
      </section>
    </main>
    <Footer /></>;
}
