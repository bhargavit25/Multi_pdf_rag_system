import express from 'express';
import {
  uploadDocuments,
  getDocuments,
  getDocumentById,
  downloadOrViewFile,
  deleteDocument,
} from '../controllers/documentController.js';
import { protect } from '../middleware/auth.js';
import { uploadPdf } from '../middleware/upload.js';

const router = express.Router();

router.use(protect); // All document routes require authentication

router.post('/upload', uploadPdf.array('files', 10), uploadDocuments);
router.get('/', getDocuments);
router.get('/:id', getDocumentById);
router.get('/:id/file', downloadOrViewFile);
router.delete('/:id', deleteDocument);

export default router;
