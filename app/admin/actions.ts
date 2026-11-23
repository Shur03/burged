"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAdmin, signIn, signOut } from "@/lib/admin";
import { categories, maxDoorPhotoBytes, maxDoorPhotos, type Category, type Door } from "@/lib/doors";
import { deleteDoor, saveDoor } from "@/lib/store";

export async function login(_: string, data: FormData) {
  if (!await signIn(String(data.get("password") ?? ""))) return "Нууц үг буруу байна.";
  redirect("/admin");
}

export async function logout() {
  await signOut();
  redirect("/admin");
}

function photoMime(bytes: Buffer) {
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "image/png";
  if (bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255]))) return "image/jpeg";
  if (bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
}

export async function submitDoor(id: string | null, _: string, data: FormData) {
  if (!await isAdmin()) redirect("/admin");

  const value = (key: string) => String(data.get(key) ?? "").trim();
  const lines = (key: string) => value(key).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const textLimits = { title: 100, description: 400, size: 100, opening: 100,
    specifications: 1800, benefits: 1800, delivery: 300, promotion: 300, phone: 32, secondPhone: 32, address: 240 };
  if (Object.entries(textLimits).some(([key, limit]) => value(key).length > limit)) return "Зарим талбарын бичвэр хэт урт байна.";

  const title = value("title");
  const category = value("category") as Category;
  const size = value("size");
  const opening = value("opening");
  const price = Number(value("price"));
  const pickupPrice = value("pickupPrice") ? Number(value("pickupPrice")) : null;
  if (!title || !size || !opening || !categories.includes(category)) return "Барааны нэр, төрөл, хэмжээ болон онгойх чиглэлийг оруулна уу.";
  const validPrice = (amount: number) => Number.isSafeInteger(amount) && amount > 0;
  if (!validPrice(price) || (pickupPrice !== null && !validPrice(pickupPrice))) return "Үнийг эерэг бүхэл тоогоор оруулна уу.";
  const phone = value("phone");
  const secondPhone = value("secondPhone");
  const invalidPhone = (number: string) => number && !/^\+?\d{8,15}$/.test(number.replace(/[ -]/g, ""));
  if ([phone, secondPhone].some(invalidPhone)) return "Утасны дугаарыг шалгана уу.";

  const files = data.getAll("image").filter((file): file is File => file instanceof File && file.name !== "");
  if (files.length > maxDoorPhotos) return `Нэг бараанд ${maxDoorPhotos} хүртэл зураг оруулна уу.`;
  const uploads: { bytes: Buffer; mime: string }[] = [];
  for (const file of files) {
    if (file.size > maxDoorPhotoBytes) return "Зураг тус бүр 4 МБ хүртэл хэмжээтэй байна.";
    const bytes = Buffer.from(await file.arrayBuffer());
    const mime = photoMime(bytes);
    if (!mime) return "JPG, PNG эсвэл WebP зураг оруулна уу.";
    uploads.push({ bytes, mime });
  }

  const doorId = id ?? randomUUID();
  const door: Door = {
    id: doorId, title, category, size, opening, price, pickupPrice, phone, secondPhone,
    description: value("description"), specifications: lines("specifications"), benefits: lines("benefits"),
    delivery: value("delivery"), promotion: value("promotion"), address: value("address"),
    image: "",
    sample: data.get("sample") === "on",
  };
  const removals = new Set(data.getAll("removePhoto").filter((value) => typeof value === "string"));
  const result = saveDoor(door, Boolean(id), uploads, removals);
  if (result === "missing") return "Энэ бараа каталогоос устсан байна.";
  if (result === "too-many-photos") return `Нэг бараанд ${maxDoorPhotos} хүртэл зураг хадгалах боломжтой.`;
  revalidatePath("/");
  revalidatePath(`/doors/${doorId}`);
  redirect("/admin?status=saved");
}

export async function removeDoor(id: string) {
  if (!await isAdmin()) redirect("/admin");
  deleteDoor(id);
  revalidatePath("/");
  revalidatePath(`/doors/${id}`);
  redirect("/admin?status=deleted");
}
