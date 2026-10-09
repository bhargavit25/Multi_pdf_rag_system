import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { config } from '../config/env.js';

// Ensure uploads directory exists
if (!fs.existsSync(config.uploadsDir)) {
  fs.mkdirSync(config.uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique, sanitized filename: timestamp-random-originalName
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const sanitizedOriginal = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${uniqueSuffix}-${sanitizedOriginal}`);
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const isPdfExt = ext === '.pdf';
  const isPdfMime = file.mimetype === 'application/pdf' || file.mimetype === 'application/x-pdf';

  if (isPdfExt || isPdfMime) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file format. Only PDF files (.pdf) are allowed.'), false);
  }
};

export const uploadPdf = multer({
  storage,
  limits: {
    fileSize: config.maxFileSize, // 20 MB default
  },
  fileFilter,
});
