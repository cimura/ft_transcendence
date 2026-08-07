export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
export const UPLOAD_URL_PREFIX = '/uploads/images';
export const IMAGE_UPLOAD_DIR = 'uploads/images';

// 削除しきれず孤児化した画像資産を運用ログから grep するためのマーカー
export const ORPHANED_IMAGE_LOG_PREFIX = '[ORPHANED_IMAGE]';

export const ALLOWED_IMAGE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};
