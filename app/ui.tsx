import Link from "next/link";
import { phoneLabel, phoneLink, shop } from "@/lib/doors";

const icons = {
  phone: "M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72l.48 2.81a2 2 0 0 1-.45 2L7.87 9.8a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2-.45l2.81.48A2 2 0 0 1 22 16.92Z",
  grid: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
  shield: "M12 22s7-3 7-10V5l-7-3-7 3v7c0 7 7 10 7 10zM9 12l2 2 4-4",
  snow: "M12 2v20M3.34 7l17.32 10M3.34 17 20.66 7M9 4l3 3 3-3M9 20l3-3 3 3M3.6 10.6l4.1-1.1-1.1-4.1M17.4 18.6l-1.1-4.1 4.1-1.1M3.6 13.4l4.1 1.1-1.1 4.1M17.4 5.4l-1.1 4.1 4.1 1.1",
  truck: "M1 4h14v13H1zM15 9h4l4 4v4h-8M7 19a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm14 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z",
  search: "M16 16l5 5M18 11a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z",
  ruler: "M3 7h18v10H3zM7 7v4m4-4v3m4-3v4m4-4v3",
  pin: "M20 10c0 6-8 11-8 11s-8-5-8-11a8 8 0 1 1 16 0ZM15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  mail: "M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm-2 2 10 6 10-6",
  facebook: "M12 1a11 11 0 1 0 0 22 11 11 0 0 0 0-22Zm1.5 22h-3V14H8v-3h2.5V9.5c0-2.6 1.5-4 3.9-4 1 0 1.8.1 2.1.2v2.7H15c-1.2 0-1.5.5-1.5 1.5V11h2.9l-.4 3h-2.5Z",
  map: "m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Zm6-3v15m6-12v15",
  door: "M5 21V3h12v18M3 21h18M9 21V6l8-3m-4 9h1",
  lock: "M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4m-4 4v2",
  plus: "M12 5v14M5 12h14",
  check: "M5 12l4 4L19 6",
} as const;

export function Icon({ name, size = 20 }: { name: keyof typeof icons; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={icons[name]} />
    </svg>
  );
}

export function Brand() {
  return <Link className="brand" href="/">
    <span className="brand-mark"><Icon name="door" size={24} /></span>
    <span><strong>Бүргэд хаалга</strong><small>Хаалганы худалдаа</small></span>
  </Link>;
}

export function Header({ admin = false }: { admin?: boolean }) {
  return <header className="site-header">
    <div className="wrap header-inner">
      <Brand />
      {admin ? <Link className="button outline" href="/">Каталог үзэх</Link> :
        <nav aria-label="Үндсэн цэс">
          <Link href="/" className="nav-home">Нүүр</Link>
          <Link href="/#catalog">Каталог</Link>
          <Link href="/orders">Захиалга шалгах</Link>
          <Link href="/#contact">Холбоо барих</Link>
        </nav>}
    </div>
  </header>;
}

export function Footer() {
  return <footer id="contact" className="site-footer">
    <Brand />
    <section className="footer-contact">
      <h2>Холбоо барих</h2>
      <div className="footer-item">
        <Icon name="phone" size={18} />
        <div className="footer-phones">
          {[shop.phone, shop.secondPhone].map((phone) =>
            <a href={phoneLink(phone)} key={phone}>{phoneLabel(phone)}</a>
          )}
        </div>
      </div>
      <a className="footer-item footer-email" href={`mailto:${shop.email}`}>
        <Icon name="mail" size={18} /><span>{shop.email}</span>
      </a>
      <a className="footer-item footer-facebook" href={shop.facebook}>
        <Icon name="facebook" size={20} /><span>Facebook</span>
      </a>
    </section>
    <section className="footer-location">
      <h2>Дэлгүүрийн хаяг</h2>
      <a className="footer-item footer-address" href={shop.mapsUrl}>
        <Icon name="pin" size={19} />
        <span>
          {shop.address}
          <span className="footer-map-label"><Icon name="map" size={15} /> Газрын зураг дээр харах</span>
        </span>
      </a>
    </section>
  </footer>;
}
