import fs from 'fs/promises';
import path from 'path';
import { Document } from '../models/Document.js';
import { extractPdfText } from '../services/pdf/extractor.js';
import { chunkDocumentPages } from '../services/pdf/chunker.js';
import { embeddingService } from '../services/embeddings/embeddingService.js';
import { getVectorStore } from '../services/vector/index.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { logger } from '../utils/logger.js';

/**
 * Background worker to process uploaded PDF
 */
async function processDocumentAsync(documentId, userId, userPreferences = {}) {
  try {
    const doc = await Document.findById(documentId);
    if (!doc) return;

    // 1. Update status to Processing
    doc.status = 'Processing';
    await doc.save();
    logger.info(`Starting text extraction for document ${doc.filename} (${doc._id})`);

    // 2. Extract text with page numbers preserved
    const { pageCount, pages } = await extractPdfText(doc.filepath);
    doc.pageCount = pageCount;

    // 3. Chunk text with page number preserved
    const chunks = chunkDocumentPages(pages, {
      documentId: doc._id.toString(),
      userId: userId.toString(),
      filename: doc.filename,
    });

    if (chunks.length === 0) {
      throw new Error('No readable text could be extracted from this PDF. It may be scanned or empty.');
    }

    // 4. Update status to Embedding
    doc.status = 'Embedding';
    doc.chunkCount = chunks.length;
    doc.chunks = chunks.map((c) => ({
      chunkId: c.chunkId,
      pageNumber: c.pageNumber,
      textLength: c.text.length,
      previewText: c.text.slice(0, 100),
    }));
    await doc.save();
    logger.info(`Generating embeddings for ${chunks.length} chunks of ${doc.filename}`);

    // 5. Generate embeddings for each chunk
    const chunkTexts = chunks.map((c) => c.text);
    const embeddings = await embeddingService.generateEmbeddings(chunkTexts, userPreferences);

    // 6. Store in Vector Store (ChromaDB / Local)
    const vectorStore = await getVectorStore();
    const ids = chunks.map((c) => `${doc._id}_${c.chunkId}`);
    const metadatas = chunks.map((c) => ({
      documentId: doc._id.toString(),
      userId: userId.toString(),
      filename: doc.filename,
      pageNumber: c.pageNumber,
      chunkId: c.chunkId,
    }));

    await vectorStore.addDocuments({
      ids,
      embeddings,
      documents: chunkTexts,
      metadatas,
    });

    // 7. Mark as Ready
    doc.status = 'Ready';
    doc.errorMessage = null;
    await doc.save();
    logger.info(`Document ${doc.filename} successfully processed and marked Ready!`);
  } catch (error) {
    logger.error(`Error processing document ${documentId}: ${error.message}`);
    await Document.findByIdAndUpdate(documentId, {
      status: 'Failed',
      errorMessage: error.message,
    });
  }
}

export const uploadDocuments = async (req, res, next) => {
  try {
    const files = req.files || (req.file ? [req.file] : []);

    if (!files || files.length === 0) {
      return sendError(res, 'No PDF files were uploaded.', 400);
    }

    const createdDocs = [];

    for (const file of files) {
      const doc = await Document.create({
        userId: req.user.id,
        filename: file.originalname,
        storedFilename: file.filename,
        filepath: file.path,
        fileSize: file.size,
        mimeType: file.mimetype,
        status: 'Uploading',
      });

      createdDocs.push(doc);

      // Trigger asynchronous background processing
      processDocumentAsync(doc._id, req.user.id, req.user.apiKeyPreferences).catch((err) => {
        logger.error(`Background processing uncaught error: ${err.message}`);
      });
    }

    return sendSuccess(
      res,
      { documents: createdDocs },
      `Successfully uploaded ${createdDocs.length} document(s). Processing in background.`,
      201
    );
  } catch (error) {
    next(error);
  }
};

export const getDocuments = async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 50 } = req.query;
    const query = { userId: req.user.id };

    if (status) {
      query.status = status;
    }

    if (search) {
      query.filename = { $regex: search, $options: 'i' };
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await Document.countDocuments(query);
    const documents = await Document.find(query)
      .select('-chunks')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    return sendSuccess(res, {
      documents,
      pagination: {
        total,
        page: parseInt(page, 10),
        pages: Math.ceil(total / parseInt(limit, 10)),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getDocumentById = async (req, res, next) => {
  try {
    const doc = await Document.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!doc) {
      return sendError(res, 'Document not found or access denied.', 404);
    }

    return sendSuccess(res, { document: doc });
  } catch (error) {
    next(error);
  }
};

export const downloadOrViewFile = async (req, res, next) => {
  try {
    const doc = await Document.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!doc) {
      return sendError(res, 'Document not found or access denied.', 404);
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.filename)}"`);
    return res.sendFile(path.resolve(doc.filepath));
  } catch (error) {
    next(error);
  }
};

export const deleteDocument = async (req, res, next) => {
  try {
    const doc = await Document.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!doc) {
      return sendError(res, 'Document not found or access denied.', 404);
    }

    // 1. Delete vectors from Vector Store (ChromaDB / Local)
    try {
      const vectorStore = await getVectorStore();
      await vectorStore.deleteDocumentVectors({
        documentId: doc._id.toString(),
        userId: req.user.id.toString(),
      });
    } catch (vecErr) {
      logger.warn(`Vector deletion warning: ${vecErr.message}`);
    }

    // 2. Delete file from disk safely
    try {
      await fs.unlink(doc.filepath);
    } catch (fsErr) {
      logger.warn(`File unlink warning: ${fsErr.message}`);
    }

    // 3. Remove document from MongoDB
    await Document.findByIdAndDelete(doc._id);

    return sendSuccess(res, { id: doc._id }, 'Document and associated vectors deleted successfully.');
  } catch (error) {
    next(error);
  }
};
