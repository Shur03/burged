"use client";

import { useActionState } from "react";
import { categories, doorPhotos, maxDoorPhotoBytes, maxDoorPhotos, maxDoorPhotoSourceBytes, type Door } from "@/lib/doors";
import { login, removeDoor, submitDoor } from "./actions";
import { DoorPhoto } from "../door-photo";
import { Icon } from "../ui";
import { preparePhotos } from "./prepare-photos";

export function LoginForm() {
  const [error, action, pending] = useActionState(login, "");
  return <form action={action} className="admin-form">
    <label>Нууц үг<input type="password" name="password" autoComplete="current-password" required maxLength={512} /></label>
    {error && <p className="form-error" role="alert">{error}</p>}
    <button type="submit" className="button primary" disabled={pending}>{pending ? "Шалгаж байна…" : "Нэвтрэх"}</button>
  </form>;
}

export function DoorForm({ door, compactUploads }: { door?: Door; compactUploads: boolean }) {
  const submit = submitDoor.bind(null, door?.id ?? null);
  const [error, action, pending] = useActionState(compactUploads ? async (state: string, data: FormData) => {
    try {
      await preparePhotos(data);
    } catch {
      return "Зургийг бэлтгэж чадсангүй. JPG, PNG эсвэл WebP файл сонгоод дахин оролдоно уу.";
    }
    return submit(state, data);
  } : submit, "");
  const photos = door ? doorPhotos(door) : [];
  const maxBytes = compactUploads ? maxDoorPhotoSourceBytes : maxDoorPhotoBytes;
  return <form className="admin-form" action={action}>
    <div className="form-grid">
      <label>Барааны нэр<input name="title" required maxLength={100} defaultValue={door?.title} /></label>
      <label>Ангилал<select name="category" defaultValue={door?.category}>
        {categories.map((category) => <option key={category}>{category}</option>)}
      </select></label>
      <label>Үндсэн үнэ (₮)<input type="number" name="price" required min={1} step={1} defaultValue={door?.price} /></label>
      <label>Хүргэлт, суулгалтгүй үнэ (₮)<input type="number" name="pickupPrice" min={1} step={1} defaultValue={door?.pickupPrice ?? ""} /></label>
      <label>Хэмжээ<input name="size" required maxLength={100} placeholder="96 × 205 см, 86 × 205 см" defaultValue={door?.size} /></label>
      <label>Онгойх чиглэл<input name="opening" required maxLength={100} placeholder="Баруун, зүүн" defaultValue={door?.opening} /></label>
      <label className="full">Товч тайлбар<textarea name="description" rows={2} maxLength={400} defaultValue={door?.description} /></label>
      <label>Үзүүлэлт <small>Мөр бүрд нэг үзүүлэлт</small><textarea name="specifications" rows={4} maxLength={1800} defaultValue={door?.specifications.join("\n")} /></label>
      <label>Давуу тал <small>Мөр бүрд нэг давуу тал</small><textarea name="benefits" rows={4} maxLength={1800} defaultValue={door?.benefits.join("\n")} /></label>
      <label>Хүргэлт, суулгалтын нөхцөл<textarea name="delivery" rows={2} maxLength={300} defaultValue={door?.delivery} /></label>
      <label>Урамшуулал<textarea name="promotion" rows={2} maxLength={300} defaultValue={door?.promotion} /></label>
      <label>Холбоо барих утас<input name="phone" type="tel" maxLength={32} defaultValue={door?.phone} /></label>
      <label>Нэмэлт утас<input name="secondPhone" type="tel" maxLength={32} defaultValue={door?.secondPhone} /></label>
      <label className="full">Хаяг<input name="address" maxLength={240} defaultValue={door?.address} /></label>
      <label className="full">Барааны зургууд <small>Нийт {maxDoorPhotos} хүртэл зураг · JPG, PNG, WebP · Тус бүр {maxBytes / 1024 ** 2} МБ хүртэл{compactUploads && " · Том зургууд автоматаар шахагдана"}</small>
        <input name="image" type="file" multiple accept="image/png,image/jpeg,image/webp" onChange={(event) => {
          const files = Array.from(event.currentTarget.files ?? []);
          const error = files.length > maxDoorPhotos ? `Нэг бараанд ${maxDoorPhotos} хүртэл зураг оруулна уу.`
            : files.some((file) => file.size > maxBytes) ? `Зураг тус бүр ${maxBytes / 1024 ** 2} МБ хүртэл хэмжээтэй байна.` : "";
          event.currentTarget.setCustomValidity(error);
        }} />
      </label>
    </div>
    {door && photos.length > 0 && <fieldset className="admin-photos">
      <legend>Одоо байгаа зургууд</legend>
      <ul>
        {photos.map((image, index) => <li key={image}>
          <div className="admin-thumb"><DoorPhoto door={{ title: door.title, image }} sizes="105px" /></div>
          <small>{index === 0 ? "Нүүр зураг" : `Зураг ${index + 1}`}</small>
          <label className="checkbox"><input type="checkbox" name="removePhoto" value={image} aria-label={`Зураг ${index + 1} устгах`} /> Устгах</label>
        </li>)}
      </ul>
    </fieldset>}
    {door && <label className="checkbox"><input name="sample" type="checkbox" defaultChecked={door.sample} /> Жишээ бараа гэж тэмдэглэх</label>}
    {error && <p className="form-error" role="alert">{error}</p>}
    <button className="button primary" type="submit" disabled={pending}><Icon name="check" size={18} /> {pending ? (compactUploads ? "Зургийг бэлтгэж, хадгалж байна…" : "Хадгалж байна…") : "Хадгалах"}</button>
  </form>;
}

export function DeleteForm({ door }: { door: Pick<Door, "id" | "title"> }) {
  return <form action={removeDoor.bind(null, door.id)} onSubmit={(event) => {
    if (!window.confirm(`«${door.title}» барааг каталогоос устгах уу?`)) event.preventDefault();
  }}>
    <button className="text-button danger" type="submit">Устгах</button>
  </form>;
}
