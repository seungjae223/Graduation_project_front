// Process photos in the browser before any network request. No HEIC/video support in V8.
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
export const MAX_PHOTOS = 5;
export const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;
const MAX_INPUT_BYTES = 12 * 1024 * 1024;
const MAX_EDGE = 1600;

export async function prepareReviewPhoto(file) {
  if (!ALLOWED_TYPES.has(file?.type) || file.size <= 0 || file.size > MAX_INPUT_BYTES) {
    throw new Error("JPEG, PNG, WebP 사진(원본 12MB 이하)만 선택할 수 있어요.");
  }
  const objectUrl = URL.createObjectURL(file);
  try {
    const photo = new Image();
    photo.src = objectUrl;
    await photo.decode();
    const scale = Math.min(1, MAX_EDGE / Math.max(photo.naturalWidth, photo.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(photo.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(photo.naturalHeight * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("이미지 변환을 지원하지 않는 브라우저입니다.");
    ctx.drawImage(photo, 0, 0, canvas.width, canvas.height);
    const output = await new Promise(resolve => canvas.toBlob(resolve, "image/webp", 0.78));
    if (!output || output.type !== "image/webp" || output.size === 0 || output.size > MAX_UPLOAD_BYTES) {
      throw new Error("사진 용량을 줄이지 못했어요. 다른 사진을 선택해 주세요.");
    }
    const name = (file.name || "사진").replace(/\.[^.]+$/, "").slice(0, 70) + ".webp";
    return new File([output], name, { type: "image/webp" });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function validatePhotoSelection(files, currentCount = 0) {
  if (files.length + currentCount > MAX_PHOTOS) throw new Error("리뷰 사진은 최대 5장까지 올릴 수 있어요.");
  for (const photo of files) {
    if (!ALLOWED_TYPES.has(photo.type) || !photo.size || photo.size > MAX_INPUT_BYTES) {
      throw new Error("JPEG, PNG, WebP 사진(원본 12MB 이하)만 선택할 수 있어요.");
    }
  }
}
