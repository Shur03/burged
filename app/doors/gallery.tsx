"use client";

import { useRef, useState, type PointerEvent } from "react";
import { DoorPhoto } from "../door-photo";
import "./gallery.css";

export function DoorGallery({ title, photos, sample, illustrative }: {
  title: string; photos: string[]; sample?: boolean; illustrative?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const viewport = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; left: number } | null>(null);
  const active = index % Math.max(photos.length, 1);
  const image = photos[active] ?? "";
  const multiple = photos.length > 1;

  function show(target: number, animate = true) {
    viewport.current?.scrollTo({
      left: target * viewport.current.clientWidth,
      behavior: animate && !window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "smooth" : "instant",
    });
  }

  function move(step: number) {
    const target = (active + photos.length + step) % photos.length;
    show(target, Math.abs(target - active) === 1);
  }

  function finishDrag(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    const track = event.currentTarget;
    const { x, left } = drag.current;
    const width = track.clientWidth;
    const start = Math.round(left / width);
    const distance = x - event.clientX;
    const step = event.type === "pointercancel" || Math.abs(distance) < 30 ? 0
      : Math.sign(distance) * Math.max(1, Math.round(Math.abs(distance) / width));
    drag.current = null;
    delete track.dataset.dragging;
    show(Math.max(0, Math.min(photos.length - 1, start + step)));
  }

  return <figure>
    <div className="detail-photo" role="group" aria-label="Барааны зургууд" onKeyDown={(event) => {
      if (!multiple || (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) return;
      event.preventDefault();
      move(event.key === "ArrowLeft" ? -1 : 1);
    }}>
      <div ref={viewport} className={multiple ? "gallery-track scrollable" : "gallery-track"}
        onScroll={(event) => {
          const { scrollLeft, clientWidth } = event.currentTarget;
          if (clientWidth) setIndex(Math.max(0, Math.min(photos.length - 1, Math.round(scrollLeft / clientWidth))));
        }}
        onDragStart={(event) => { if (multiple) event.preventDefault(); }}
        onPointerDown={(event) => {
          if (!multiple || event.pointerType !== "mouse" || event.button !== 0) return;
          const track = event.currentTarget;
          drag.current = { x: event.clientX, left: track.scrollLeft };
          track.dataset.dragging = "";
          track.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (drag.current) event.currentTarget.scrollLeft = drag.current.left + drag.current.x - event.clientX;
        }}
        onPointerUp={finishDrag} onPointerCancel={finishDrag}>
        {(photos.length ? photos : [""]).map((photo, slide) => <div className="gallery-slide" key={photo}
          aria-hidden={slide !== active}>
          <DoorPhoto door={{ title, image: photo }} sizes="(max-width: 760px) 100vw, 560px" preload={slide === 0} />
        </div>)}
      </div>
      {multiple && <>
        <button type="button" className="gallery-arrow previous" aria-label="Өмнөх зураг" onClick={() => move(-1)} />
        <button type="button" className="gallery-arrow next" aria-label="Дараагийн зураг" onClick={() => move(1)} />
        <span className="gallery-position" aria-live="polite" aria-atomic="true">Зураг {active + 1} / {photos.length}</span>
      </>}
    </div>
    {image && (sample || (illustrative && image.startsWith("/doors/"))) && <figcaption>Үзүүлэнгийн зураг</figcaption>}
  </figure>;
}
