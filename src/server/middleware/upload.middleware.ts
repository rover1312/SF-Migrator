import multer from 'multer';
import path from 'node:path';
import { config } from '../utils/config';

const ALLOWED_EXTENSIONS = new Set(['.json', '.yaml', '.yml', '.csv']);

/**
 * Multer upload handler for config files (JSON/YAML) and CSV data.
 * Files land in `data/temp/` and should be moved/processed promptly.
 */
export const configUpload = multer({
  dest: config.tempDir,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB per file
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_EXTENSIONS.has(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${ext}. Use .json, .yaml, .yml, or .csv`));
    }
  },
});
