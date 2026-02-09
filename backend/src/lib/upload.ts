import multer from 'multer';
import path from 'path';
import { ValidationError } from './errors';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const receiptUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      cb(new ValidationError('Only JPEG, PNG, WebP and HEIC images are allowed'));
      return;
    }
    cb(null, true);
  },
});
