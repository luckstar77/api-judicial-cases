import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { memoryStorage } from 'multer';
import { ApiException } from '../common/api/api.exception';
import { ErrorCodes } from '../common/api/error-codes';
import { ALLOWED_IMAGE_TYPES } from '../storage/storage.service';

export const CASE_IMAGE_FIELD = 'images';
export const MAX_CASE_IMAGES = 10;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** 圖片先放在記憶體，通過驗證後才上傳 S3 */
export const CASE_UPLOAD_OPTIONS: MulterOptions = {
  storage: memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: MAX_CASE_IMAGES },
  fileFilter: (_request, file, callback) => {
    if (file.mimetype in ALLOWED_IMAGE_TYPES) {
      callback(null, true);
      return;
    }
    callback(new ApiException(ErrorCodes.VALIDATION_ERROR, 'images must be jpeg, png, webp or gif'), false);
  },
};
