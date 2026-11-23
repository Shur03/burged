import { Suspense } from "react";
import Image from "next/image";
import { connection } from "next/server";
import { listDoors } from "@/lib/store";
import { phoneLink, shop } from "@/lib/doors";
import { Catalog } from "./catalog";
import { Footer, Header, Icon } from "./ui";

const services = [
  { icon: "shield", title: "Смарт цоож", description: "Камер, код болон чиптэй сонголт" },
  { icon: "snow", title: "Өвлийн дулаалга", description: "Давхар жийрэгтэй ган хаалга" },
  { icon: "truck", title: "Орон нутагт хүргэнэ", description: "Хүргэлтийн нөхцөлийг утсаар лавлах" },
] as const;

async function DoorCatalog() {
  await connection();
  return <Catalog doors={await listDoors()} />;
}

export default function Home() {
  return <>
    <Header />
    <main>
      <section className="hero">
        <Image className="hero-photo" src="/doors/hero.webp" alt="" fill sizes="100vw" preload />
        <div className="wrap hero-inner">
          <span className="hero-label"><Icon name="shield" size={17} /> СМАРТ ЦООЖТОЙ ГАН ХААЛГА</span>
          <h1>Таны гэрийн<br /><span>найдвартай хаалга.</span></h1>
          <p>Өвлийн дулаалгатай, смарт цоожтой болон орон сууцны хаалганы сонголтууд.</p>
          <div className="hero-actions">
            <a className="button primary" href="#catalog"><Icon name="grid" size={18} /> Каталог үзэх</a>
            <a className="button ghost" href={phoneLink(shop.phone)}><Icon name="phone" size={17} /> Утсаар лавлах</a>
          </div>
        </div>
      </section>
      <div className="services">
        <div className="wrap services-inner">
          {services.map((service) => <div className="service" key={service.icon}>
            <span className="service-icon"><Icon name={service.icon} size={24} /></span>
            <div><strong>{service.title}</strong><p>{service.description}</p></div>
          </div>)}
        </div>
      </div>
      <section className="wrap catalog" id="catalog">
        <div className="section-heading"><h2>Хаалганы каталог</h2><p>Үнэ, хэмжээ болон үзүүлэлтээр нь сонгоорой.</p></div>
        <Suspense fallback={<p className="empty">Каталог уншиж байна…</p>}><DoorCatalog /></Suspense>
      </section>
    </main>
    <Footer />
  </>;
}
