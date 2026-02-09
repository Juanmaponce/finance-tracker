const MAX_WIDTH = 1200;
const MAX_HEIGHT = 1200;
const QUALITY = 0.8;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Compress an image file using Canvas API.
 * Returns a compressed File object (JPEG) under 5MB.
 */
export async function compressImage(file: File): Promise<File> {
  if (file.size <= MAX_FILE_SIZE && file.type === 'image/jpeg') {
    return file;
  }

  const bitmap = await createImageBitmap(file);
  const { width, height } = calculateDimensions(bitmap.width, bitmap.height);

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: QUALITY });
  return new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
    type: 'image/jpeg',
  });
}

function calculateDimensions(w: number, h: number): { width: number; height: number } {
  if (w <= MAX_WIDTH && h <= MAX_HEIGHT) return { width: w, height: h };

  const ratio = Math.min(MAX_WIDTH / w, MAX_HEIGHT / h);
  return {
    width: Math.round(w * ratio),
    height: Math.round(h * ratio),
  };
}

/**
 * Validate that a file is an allowed image type and under max size.
 */
export function validateImageFile(file: File): string | null {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
  if (!allowedTypes.includes(file.type)) {
    return 'Solo se permiten imagenes JPEG, PNG o WebP';
  }
  if (file.size > 20 * 1024 * 1024) {
    return 'La imagen es demasiado grande (max 20MB antes de compresion)';
  }
  return null;
}
