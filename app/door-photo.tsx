import Image from "next/image";
import type { Door } from "@/lib/doors";
import { Icon } from "./ui";

export function DoorPhoto({ door, sizes, preload }: { door: Pick<Door, "title" | "image">; sizes: string; preload?: boolean }) {
  return door.image
    ? <Image alt={door.title} src={door.image} fill sizes={sizes} preload={preload} unoptimized={door.image.startsWith("/door-image/")} />
    : <div className="photo-placeholder"><Icon name="door" size={62} /><span>Зураг оруулаагүй</span></div>;
}
