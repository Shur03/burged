"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { formatOrderDate, orderLabels } from "@/lib/orders";
import { checkOrder } from "./actions";

export function OrderLookupForm() {
  const [{ error, orders }, submit, pending] = useActionState(checkOrder, {});
  const [phone, setPhone] = useState("");
  const [reference, setReference] = useState("");
  const codeOption = useRef<HTMLDetailsElement>(null);
  const codeInput = useRef<HTMLInputElement>(null);

  return <>
    <form className="admin-form" action={submit} onReset={(event) => event.preventDefault()}>
      <label>Утасны дугаар
        <input name="phone" type="tel" autoComplete="tel" required maxLength={24} placeholder="99112233"
          value={phone} onChange={(event) => setPhone(event.target.value)} />
      </label>
      <details ref={codeOption} className="order-code-option" onToggle={(event) => {
        if (!event.currentTarget.open) setReference("");
      }}>
        <summary>Захиалгын кодоор нэмэх</summary>
        <label>Захиалгын код
          <input ref={codeInput} name="reference" autoCapitalize="characters" autoComplete="off" spellCheck={false}
            maxLength={24} placeholder="BG-0123456789ABCDEF"
            value={reference} onChange={(event) => setReference(event.target.value)} />
        </label>
      </details>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button primary" type="submit" disabled={pending}>
        {pending ? "Шалгаж байна…" : "Захиалгууд харах"}
      </button>
    </form>
    {!pending && orders && <section className="order-lookup-results" aria-label="Таны захиалгууд">
      <h2>Таны захиалгууд</h2>
      {orders.length === 0 && <>
        <p className="order-note" role="status">
          Энэ дугаарын захиалга уг хөтөчид хадгалагдаагүй байна. Өмнөх захиалгаа кодоор нь нэмэх эсвэл хадгалсан холбоосоо нээгээд «Захиалга шалгах» товчийг дарна уу.
        </p>
        <button className="text-button order-lookup-link" type="button" onClick={() => {
          if (codeOption.current) codeOption.current.open = true;
          codeInput.current?.focus();
        }}>Кодоор хайх</button>
      </>}
      {orders.map(({ id, title, reference, createdAt, status }) =>
        <Link className="order-row" href={`/orders/${id}`} key={id} prefetch={false}>
          <div><h3>{title}</h3><p>{reference} · {formatOrderDate(createdAt)}</p></div>
          <span className={`order-status status-${status}`}>{orderLabels[status]}</span>
        </Link>
      )}
    </section>}
  </>;
}
