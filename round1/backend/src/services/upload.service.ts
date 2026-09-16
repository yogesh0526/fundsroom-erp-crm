import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { ENV } from '../config/env';

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer disk storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (_req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only image files (JPEG, JPG, PNG, WEBP, GIF) are allowed'));
  },
});

export class UploadService {
  static async processImageUpload(file: Express.Multer.File): Promise<string> {
    const s3Enabled =
      Boolean(ENV.AWS_ACCESS_KEY_ID) &&
      Boolean(ENV.AWS_SECRET_ACCESS_KEY) &&
      Boolean(ENV.AWS_S3_BUCKET_NAME);

    if (s3Enabled) {
      try {
        const s3 = new S3Client({
          region: ENV.AWS_REGION,
          credentials: {
            accessKeyId: ENV.AWS_ACCESS_KEY_ID,
            secretAccessKey: ENV.AWS_SECRET_ACCESS_KEY,
          },
        });

        const fileStream = fs.createReadStream(file.path);
        const s3Key = `products/${Date.now()}-${file.originalname}`;

        const uploadParams = {
          Bucket: ENV.AWS_S3_BUCKET_NAME,
          Key: s3Key,
          Body: fileStream,
          ContentType: file.mimetype,
        };

        await s3.send(new PutObjectCommand(uploadParams));

        // Optionally remove local file after S3 upload
        fs.unlink(file.path, () => {});

        const s3Url = `https://${ENV.AWS_S3_BUCKET_NAME}.s3.${ENV.AWS_REGION}.amazonaws.com/${s3Key}`;
        return s3Url;
      } catch (error) {
        console.warn('AWS S3 upload failed, falling back to local storage URL:', error);
      }
    }

    // Local storage URL fallback
    return `/uploads/${file.filename}`;
  }
}
