"use client";

import Link from "next/link";
import { useState } from "react";
import { categories, currency, type Door } from "@/lib/doors";
import { DoorPhoto } from "./door-photo";
import { Icon } from "./ui";

export function Catalog({ doors }: { doors: Door[] }) {
  const [category, setCategory] = useState("Бүгд");
  const [query, setQuery] = useState("");
  const tokens = query.trim().toLocaleLowerCase("mn").split(/\s+/).filter(Boolean);
  const visible = doors.filter((door) => {
    const searchable = [door.title, door.description, door.category, door.size, door.opening,
      ...door.specifications, ...door.benefits].join(" ").toLocaleLowerCase("mn");
    return (category === "Бүгд" || door.category === category)
      && tokens.every((token) => searchable.includes(token));
  });

  return <>
    <div className="catalog-controls">
      <div className="filters" role="group" aria-label="Хаалганы төрөл">
        {["Бүгд", ...categories].map((item) => <button key={item} type="button" aria-pressed={category === item}
          onClick={() => setCategory(item)}>{item}</button>)}
      </div>
      <label className="search"><Icon name="search" size={19} />
        <input type="search" placeholder="Хаалга хайх…" aria-label="Хаалга хайх" value={query} onChange={(event) => setQuery(event.target.value)} />
      </label>
    </div>
    {visible.length ? <div className="door-grid">
      {visible.map((door) => <article className="door-card" key={door.id}>
        <Link href={`/doors/${door.id}`} className="card-photo" aria-label={`${door.title} дэлгэрэнгүй`}>
          <DoorPhoto door={door} sizes="(max-width: 620px) 100vw, (max-width: 900px) 50vw, 400px" />
          <span className="category-tag">{door.sample ? "Жишээ бараа" : door.category}</span>
        </Link>
        <div className="card-body">
          <h3><Link href={`/doors/${door.id}`}>{door.title}</Link></h3>
          <p>{door.description}</p>
          <span className="card-size"><Icon name="ruler" size={18} />{door.size}</span>
          <div className="card-bottom">
            <strong>{currency(door.price)}</strong>
            <Link href={`/doors/${door.id}`} aria-label={`${door.title} дэлгэрэнгүй`}>Дэлгэрэнгүй</Link>
          </div>
        </div>
      </article>)}
    </div> : <div className="empty" role="status">
      <Icon name="search" size={27} />
      <h3>Хаалга олдсонгүй</h3>
      {(query || category !== "Бүгд") && <button className="button outline" onClick={() => { setCategory("Бүгд"); setQuery(""); }}>Шүүлт цэвэрлэх</button>}
    </div>}
  </>;
}
