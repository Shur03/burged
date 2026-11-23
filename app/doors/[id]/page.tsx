import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDoor } from "@/lib/store";
import { currency, doorPhotos, phoneLabel, phoneLink } from "@/lib/doors";
import { Footer, Header, Icon } from "../../ui";
import { DoorGallery } from "../gallery";

async function DoorDetails({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const door = await getDoor(id);
  if (!door) notFound();

  return <main className="wrap detail">
    <Link href="/#catalog" className="back-link">‹  Каталог руу буцах</Link>
    <div className="detail-grid">
      <DoorGallery title={door.title} photos={doorPhotos(door)} sample={door.sample} illustrative={door.illustrative} />
      <div className="detail-info">
        <span className="detail-category">{door.category}{door.sample && " · Жишээ бараа"}</span>
        <h1>{door.title}</h1>
        {door.description && <p className="detail-description">{door.description}</p>}
        <div className="detail-prices">
          <div><span>Үндсэн үнэ</span><strong>{currency(door.price)}</strong></div>
          {door.pickupPrice !== null && <div><span>Хүргэлт, суулгалтгүй үнэ</span><strong>{currency(door.pickupPrice)}</strong></div>}
        </div>
        {door.promotion && <p className="promo">{door.promotion}</p>}
        <dl className="dimensions">
          <div><dt><Icon name="ruler" />Хэмжээ</dt><dd>{door.size}</dd></div>
          <div><dt><Icon name="door" />Онгойх чиглэл</dt><dd>{door.opening}</dd></div>
        </dl>
        <div className="admin-actions">
          {!door.sample && <Link className="button primary" href={`/checkout/${door.id}`} prefetch={false}>Захиалах</Link>}
          {door.phone && <a className="button outline" href={phoneLink(door.phone)}><Icon name="phone" size={17} /> {phoneLabel(door.phone)}</a>}
          {door.secondPhone && <a className="button outline" href={phoneLink(door.secondPhone)}><Icon name="phone" size={17} /> {phoneLabel(door.secondPhone)}</a>}
        </div>
        {door.address && <p className="info-line"><Icon name="pin" size={19} />{door.address}</p>}
        {door.delivery && <p className="info-line"><Icon name="truck" size={19} />{door.delivery}</p>}
      </div>
    </div>
    <div className="detail-notes">
      {([[door.specifications, "Үзүүлэлт"], [door.benefits, "Давуу тал"]] as const).map(([lines, title]) => (
        lines.length > 0 && <section key={title}>
          <h2>{title}</h2>
          <ul>{lines.map((line, index) => <li key={index}><Icon name="check" size={18} />{line}</li>)}</ul>
        </section>
      ))}
    </div>
  </main>;
}

export default function DoorPage({ params }: { params: Promise<{ id: string }> }) {
  return <><Header /><Suspense fallback={<p className="wrap empty">Бараа уншиж байна…</p>}>
    <DoorDetails params={params} />
  </Suspense><Footer /></>;
}
