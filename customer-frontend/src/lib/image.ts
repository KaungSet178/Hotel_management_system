import type { PaymentProof } from '@/types';

/**
 * Turn an uploaded file into a compressed {@link PaymentProof}.
 *
 * Images are downscaled (max 1200px on the long edge) and re-encoded as JPEG so
 * the resulting data URL stays small enough to persist in localStorage. This is
 * a client-side mock of the "upload receipt" step; a real backend would receive
 * the file via multipart upload instead.
 */
export async function fileToPaymentProof(file: File): Promise<PaymentProof> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please upload an image (PNG or JPG screenshot of your payment).');
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error('That image is larger than 8 MB. Please upload a smaller screenshot.');
  }

  const dataUrl = await compressImage(file);
  return {
    fileName: file.name,
    mimeType: file.type,
    dataUrl,
    uploadedAt: new Date().toISOString(),
  };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('We could not read that image. Please try another file.'));
    image.src = src;
  });
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('We could not read that file.'));
    reader.readAsDataURL(file);
  });
}

async function compressImage(file: File): Promise<string> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(objectUrl);
    const maxEdge = 1200;
    const scale = Math.min(1, maxEdge / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return await readAsDataUrl(file);
    context.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', 0.72);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
