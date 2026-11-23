"use client";

import { useActionState } from "react";
import { currency } from "@/lib/doors";
import type { OrderStatus } from "@/lib/orders";
import { advanceOrder } from "./actions";

type Operation = "approve" | "mark-paid" | "check-qpay" | "complete" | "cancel";

const labels: Record<Operation, string> = {
  approve: "Шилжүүлгийн мэдээлэл харуулах",
  "mark-paid": "Төлбөр баталгаажуулах",
  "check-qpay": "QPay төлбөр шалгах",
  complete: "Биелсэн гэж тэмдэглэх",
  cancel: "Захиалга цуцлах",
};

export function OrderActionForm({ id, status, operation, total, qpay = false }: {
  id: string; status: OrderStatus; operation: Operation; total: number; qpay?: boolean;
}) {
  const [error, submit, pending] = useActionState(advanceOrder.bind(null, id, status), "");
  const confirmMessage = {
    "mark-paid": `Дансанд ${currency(total)} орсныг тулгаж шалгасан уу?`,
    cancel: "Энэ захиалгыг цуцлах уу?",
  };

  return <form className="admin-form" action={submit} onSubmit={(event) => {
    if ((operation === "cancel" || operation === "mark-paid") && !window.confirm(confirmMessage[operation])) {
      event.preventDefault();
    }
  }}>
    <input type="hidden" name="operation" value={operation} />
    {operation === "approve" && <label>Эцсийн дүн (₮)
      <input name="total" type="number" min={1} max={Number.MAX_SAFE_INTEGER} step={1} required defaultValue={total} />
      <small>Барааны бэлэн байдал, хүргэлт, суулгалтыг захиалагчтай тохироод дүнг баталгаажуулна.</small>
    </label>}
    {operation === "mark-paid" && <label>Банкны гүйлгээний дугаар
      <input name="transaction" required maxLength={80} />
      <small>Дансны орлогын дүн болон гүйлгээний утгыг тулгаж шалгана.</small>
    </label>}
    {error && <p className="form-error" role="alert">{error}</p>}
    <button type="submit" className={`button ${operation === "cancel" ? "outline" : "primary"}`} disabled={pending}>
      {pending ? "Хүлээнэ үү…" : qpay && operation === "approve" ? "Дүн баталж QPay QR үүсгэх" : labels[operation]}
    </button>
  </form>;
}
