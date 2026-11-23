import { compactDoorPhotoBytes, maxDoorPhotos, maxDoorPhotoSourceBytes } from "@/lib/doors";

async function compactPhoto(file: File) {
  if (file.size <= compactDoorPhotoBytes) return file;
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  try {
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas is unavailable");

    let edge = Math.min(1600, Math.max(bitmap.width, bitmap.height));
    for (let attempt = 0; attempt < 7; attempt++) {
      const scale = edge / Math.max(bitmap.width, bitmap.height);
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const quality = attempt === 0 ? 0.86 : 0.75;
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
      if (blob && blob.size <= compactDoorPhotoBytes) {
        const extension = blob.type === "image/webp" ? "webp" : "png";
        return new File([blob], `photo.${extension}`, { type: blob.type });
      }
      edge *= 0.78;
    }
    throw new Error("Image exceeds the upload size limit");
  } finally {
    bitmap.close();
  }
}

export async function preparePhotos(data: FormData) {
  const files = data.getAll("image").filter((file): file is File => file instanceof File && file.name !== "");
  if (files.length > maxDoorPhotos || files.some((file) => file.size > maxDoorPhotoSourceBytes)) {
    throw new Error("Invalid upload size");
  }
  data.delete("image");
  for (const file of files) data.append("image", await compactPhoto(file));
}
