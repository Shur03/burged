"use client";

import { useActionState, useState } from "react";
import { currency } from "@/lib/doors";
import { fulfillmentLabels, type Fulfillment } from "@/lib/orders";
import type { CheckoutState } from "./actions";

type Props = {
  sizeOptions: string[];
  openingOptions: string[];
  price: number;
  pickupPrice: number | null;
  action: (state: CheckoutState, data: FormData) => Promise<CheckoutState>;
};

export function CheckoutForm({ sizeOptions, openingOptions, price, pickupPrice, action }: Props) {
  const [{ error, values }, submit, pending] = useActionState(action, {});
  const [fulfillment, setFulfillment] = useState<Fulfillment>("pickup");
  const [quantity, setQuantity] = useState("1");
  const total = (fulfillment === "pickup" ? pickupPrice ?? price : price) * Number(quantity);

  // Keep the selected fulfillment and entered address when the action returns a validation error.
  return <form className="admin-form" action={submit} onReset={(event) => event.preventDefault()}>
    <div className="form-grid">
      <label>Хэмжээ<select name="size" defaultValue={values?.size}>{sizeOptions.map((size) => <option key={size}>{size}</option>)}</select></label>
      <label>Онгойх чиглэл<select name="opening" defaultValue={values?.opening}>{openingOptions.map((opening) => <option key={opening}>{opening}</option>)}</select></label>
      <label>Тоо ширхэг<input name="quantity" type="number" required min={1} max={99} step={1} value={quantity} onChange={(event) => setQuantity(event.target.value)} /></label>
      <label>Авах хэлбэр<select name="fulfillment" value={fulfillment} onChange={(event) => setFulfillment(event.target.value as Fulfillment)}>
        <option value="pickup">{fulfillmentLabels.pickup}</option><option value="delivery">{fulfillmentLabels.delivery}</option>
      </select></label>
      <label>Нэр<input name="name" autoComplete="name" required maxLength={80} defaultValue={values?.name} /></label>
      <label>Утас<input type="tel" name="phone" autoComplete="tel" required maxLength={24} placeholder="99112233" defaultValue={values?.phone} /></label>
      <label className="full">
        {fulfillment === "delivery" ? "Хүргэлтийн хаяг" : "Хаяг (Хүргүүлэх бол заавал бөглөнө үү)"}
        <textarea name="address" autoComplete="street-address" required={fulfillment === "delivery"} rows={2}
          maxLength={240} defaultValue={values?.address} />
      </label>
    </div>
    <div className="order-amount"><span>Урьдчилсан дүн</span><strong>{Number.isSafeInteger(total) && total > 0 ? currency(total) : "—"}</strong></div>
    <p className="order-note">Дэлгүүр захиалга, эцсийн дүнг баталгаажуулсны дараа төлбөрийн мэдээлэл харагдана.</p>
    {error && <p className="form-error" role="alert">{error}</p>}
    <button className="button primary" type="submit" disabled={pending}>{pending ? "Илгээж байна…" : "Захиалга илгээх"}</button>
  </form>;
}
