"use client";

import { useState } from "react";

export function CopyOrder({ reference, path }: { reference: string; path: string }) {
  const [result, setResult] = useState<{ message: string; manualValue?: string }>();

  async function copy(kind: "code" | "link") {
    const value = kind === "code" ? reference : new URL(path, window.location.origin).href;
    try {
      await navigator.clipboard.writeText(value);
      setResult({ message: kind === "code" ? "Захиалгын кодыг хууллаа." : "Захиалгын холбоосыг хууллаа." });
    } catch {
      setResult({ message: "Доорх утгыг сонгоод хуулна уу.", manualValue: value });
    }
  }

  return <div className="admin-form order-copy">
    <div className="admin-actions">
      <button className="button outline" type="button" onClick={() => copy("code")}>Код хуулах</button>
      <button className="button outline" type="button" onClick={() => copy("link")}>Холбоос хуулах</button>
    </div>
    <p className="order-note" role="status">{result?.message}</p>
    {result?.manualValue && <input aria-label="Хуулах утга" readOnly value={result.manualValue}
      onFocus={(event) => event.currentTarget.select()} />}
  </div>;
}
