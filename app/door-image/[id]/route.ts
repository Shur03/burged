import { getDoorImage } from "@/lib/store";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = getDoorImage(id, new URL(request.url).searchParams.get("photo"));
  if (!row?.image || !row.mime) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(row.image), {
    headers: { "Content-Type": row.mime, "X-Content-Type-Options": "nosniff", "Cache-Control": "no-store" },
  });
}
