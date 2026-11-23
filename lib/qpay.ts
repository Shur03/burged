import type { QPayInvoice } from "./orders";

const sandboxOrigin = "https://merchant-sandbox.qpay.mn";

export function qpaySandboxEnabled() {
  return process.env.QPAY_MODE === "sandbox";
}

function credentials() {
  const id = process.env.QPAY_CLIENT_ID?.trim();
  const secret = process.env.QPAY_CLIENT_SECRET?.trim();
  if (qpaySandboxEnabled() && id && secret) return { id, secret };
}

function invoiceConfig() {
  const code = process.env.QPAY_INVOICE_CODE?.trim();
  const address = process.env.QPAY_CALLBACK_URL?.trim();
  if (!code || !address || !URL.canParse(address)) return;
  const callback = new URL(address);
  if (callback.protocol !== "https:" || callback.username || callback.password || callback.search || callback.hash) return;
  return { code, callback: callback.href.replace(/\/$/, "") };
}

export function qpaySandboxConfigured() {
  return Boolean(credentials() && invoiceConfig());
}

class QPayHttpError extends Error {
  constructor(readonly status: number, readonly code: unknown) {
    super(`QPay HTTP ${status}`);
  }
}

async function http(path: string, authorization: string, method: "POST" | "DELETE" = "POST", body?: object) {
  const response = await fetch(`${sandboxOrigin}${path}`, {
    method,
    headers: { Authorization: authorization, "Content-Type": "application/json" },
    body: body && JSON.stringify(body),
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => undefined);
    throw new QPayHttpError(response.status, error?.error);
  }
  return response;
}

type AccessToken = { value: string; expiresAt: number };
let cachedToken: AccessToken | undefined;
let tokenRequest: Promise<AccessToken> | undefined;

async function fetchToken(): Promise<AccessToken> {
  const config = credentials();
  if (!config) throw new Error("QPay sandbox credentials are missing");
  const basic = Buffer.from(`${config.id}:${config.secret}`).toString("base64");
  const data = await (await http("/v2/auth/token", `Basic ${basic}`)).json();
  if (typeof data?.access_token !== "string" || !data.access_token || !Number.isFinite(data.expires_in)) {
    throw new Error("Invalid QPay access token response");
  }
  return { value: data.access_token, expiresAt: data.expires_in * 1000 };
}

async function token(rejected?: AccessToken) {
  if (rejected && cachedToken === rejected) cachedToken = undefined;
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) return cachedToken;
  tokenRequest ??= fetchToken().then((value) => {
    cachedToken = value;
    return value;
  }).finally(() => { tokenRequest = undefined; });
  return tokenRequest;
}

async function withToken<T>(request: (authorization: string) => Promise<T>) {
  const access = await token();
  try {
    return await request(`Bearer ${access.value}`);
  } catch (error) {
    if (!(error instanceof QPayHttpError) || (error.status !== 401 && error.status !== 403)) throw error;
    return request(`Bearer ${(await token(access)).value}`);
  }
}

function bankLinks(data: unknown): QPayInvoice["links"] {
  if (!Array.isArray(data)) return [];
  return data.flatMap((entry) => {
    if (typeof entry?.name !== "string" || typeof entry.link !== "string" || !URL.canParse(entry.link)) return [];
    const protocol = new URL(entry.link).protocol;
    if (["javascript:", "data:", "vbscript:", "file:", "blob:", "about:", "http:"].includes(protocol)) return [];
    return [{ name: entry.name, url: entry.link }];
  });
}

export async function createQPayInvoice(reference: string, total: number, callbackToken: string): Promise<
  { invoice: QPayInvoice } | { error: "rejected" | "unknown" }
> {
  const config = invoiceConfig();
  if (!config) return { error: "rejected" };
  let submitted = false;
  try {
    const data = await withToken(async (authorization) => {
      submitted = true;
      const response = await http("/v2/invoice", authorization, "POST", {
        invoice_code: config.code,
        sender_invoice_no: reference,
        invoice_receiver_code: "terminal",
        invoice_description: `Захиалга ${reference}`,
        amount: total,
        callback_url: `${config.callback}/${callbackToken}`,
      });
      return response.json();
    });
    const qr = typeof data?.qr_image === "string" ? data.qr_image.replace(/^data:image\/png;base64,/, "") : "";
    if (typeof data?.invoice_id !== "string" || !data.invoice_id || !/^iVBORw0KGgo[A-Za-z0-9+/]*={0,2}$/.test(qr)) {
      return { error: "unknown" };
    }
    return { invoice: { id: data.invoice_id, qrImage: qr, links: bankLinks(data.urls) } };
  } catch (error) {
    if (!submitted || (error instanceof QPayHttpError && [401, 403, 404, 422].includes(error.status))) {
      return { error: "rejected" };
    }
    if (error instanceof QPayHttpError && error.status === 400
      && ["INVALID_AMOUNT", "INVOICE_CODE_INVALID", "INVOICE_CODE_NOTFOUND", "INVOICE_RECEIVER_DATA_REQUIRED"].includes(String(error.code))) {
      return { error: "rejected" };
    }
    return { error: "unknown" };
  }
}

function matchesAmount(value: unknown, total: number) {
  if (typeof value === "number") return value === total;
  return typeof value === "string" && /^\d+(?:\.0+)?$/.test(value) && Number(value) === total;
}

export async function checkQPayPayment(invoiceId: string, total: number) {
  const data = await (await withToken((authorization) => http("/v2/payment/check", authorization, "POST", {
    object_type: "INVOICE",
    object_id: invoiceId,
    offset: { page_number: 1, page_limit: 10 },
  }))).json();
  if (!matchesAmount(data?.paid_amount, total) || !Array.isArray(data.rows)) return;
  const paid = data.rows.filter((row: { payment_status?: string } | null) => row?.payment_status === "PAID");
  const row = paid[0];
  if (paid.length === 1 && row.payment_currency === "MNT" && matchesAmount(row.payment_amount, total)
    && typeof row.payment_id === "string" && row.payment_id.trim()) return row.payment_id as string;
}

export async function cancelQPayInvoice(invoiceId: string) {
  try {
    await withToken((authorization) => http(`/v2/invoice/${encodeURIComponent(invoiceId)}`, authorization, "DELETE"));
  } catch (error) {
    if (!(error instanceof QPayHttpError) || error.code !== "INVOICE_ALREADY_CANCELED") throw error;
  }
}
