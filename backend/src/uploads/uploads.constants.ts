export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
export const UPLOAD_URL_PREFIX = '/uploads/images';
export const IMAGE_UPLOAD_DIR = 'uploads/images';

export const ALLOWED_IMAGE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};
