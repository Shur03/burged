import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { adminConfigured, isAdmin } from "@/lib/admin";
import { currency } from "@/lib/doors";
import { getDoor, listDoors } from "@/lib/store";
import { DoorPhoto } from "../door-photo";
import { Header, Icon } from "../ui";
import { logout } from "./actions";
import { DeleteForm, DoorForm, LoginForm } from "./forms";

export const metadata: Metadata = { title: "Админ", robots: { index: false, follow: false } };

type AdminParams = { edit?: string; new?: string; status?: string };

async function AdminContent({ searchParams }: { searchParams: Promise<AdminParams> }) {
  if (!await isAdmin()) return <main className="wrap admin-login">
    <div className="admin-panel">
      <span className="service-icon"><Icon name="lock" size={24} /></span>
      <h1>Админ нэвтрэх</h1>
      {adminConfigured() ? <LoginForm /> : <p>Админы нууц үгийг сервер дээр тохируулна уу.</p>}
    </div>
  </main>;

  const { edit, new: creating, status } = await searchParams;
  if (edit || creating) {
    const door = edit ? getDoor(edit) : undefined;
    if (edit && !door) notFound();
    return <main className="wrap admin-main">
      <Link className="back-link" href="/admin">‹  Барааны жагсаалт</Link>
      <div className="admin-panel admin-editor">
        <h1>{door ? "Бараа засах" : "Шинэ бараа бүртгэх"}</h1>
        <DoorForm key={door?.id ?? "new"} door={door} />
      </div>
    </main>;
  }

  const doors = listDoors();
  return <main className="wrap admin-main">
    <div className="admin-heading">
      <div><h1>Барааны бүртгэл</h1><p>{doors.length} бараа</p></div>
      <div className="admin-actions">
        <Link className="button outline" href="/admin/orders">Захиалгууд</Link>
        <form action={logout}><button className="button outline" type="submit">Гарах</button></form>
        <Link href="/admin?new=1" className="button primary"><Icon name="plus" size={18} /> Бараа нэмэх</Link>
      </div>
    </div>
    {status === "saved" && <p className="form-success" role="status">Барааг хадгаллаа.</p>}
    {status === "deleted" && <p className="form-success" role="status">Барааг каталогоос устгалаа.</p>}
    <div className="admin-panel admin-list">
      {doors.length ? doors.map((door) => <article className="admin-row" key={door.id}>
        <div className="admin-thumb"><DoorPhoto door={door} sizes="62px" /></div>
        <div className="admin-product"><h2><Link href={`/doors/${door.id}`}>{door.title}</Link></h2>
          <p>{door.category}{door.sample && " · Жишээ бараа"}</p></div>
        <strong>{currency(door.price)}</strong>
        <div className="admin-actions">
          <Link href={`/admin?edit=${door.id}`} className="text-button">Засах</Link>
          <DeleteForm door={door} />
        </div>
      </article>) : <p className="empty">Бараа бүртгэгдээгүй байна.</p>}
    </div>
  </main>;
}

export default function AdminPage({ searchParams }: { searchParams: Promise<AdminParams> }) {
  return <><Header admin /><Suspense fallback={<p className="wrap empty">Уншиж байна…</p>}>
    <AdminContent searchParams={searchParams} />
  </Suspense></>;
}
