import mongoose from 'mongoose';

const chunkMetadataSchema = new mongoose.Schema(
  {
    chunkId: { type: String, required: true },
    pageNumber: { type: Number, required: true },
    textLength: { type: Number, required: true },
    previewText: { type: String, default: '' },
  },
  { _id: false }
);

const documentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    filename: {
      type: String,
      required: [true, 'Filename is required'],
      trim: true,
    },
    storedFilename: {
      type: String,
      required: true,
    },
    filepath: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    mimeType: {
      type: String,
      default: 'application/pdf',
    },
    pageCount: {
      type: Number,
      default: 0,
    },
    chunkCount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['Uploading', 'Processing', 'Embedding', 'Ready', 'Failed'],
      default: 'Uploading',
      index: true,
    },
    errorMessage: {
      type: String,
      default: null,
    },
    chunks: [chunkMetadataSchema],
  },
  {
    timestamps: true,
  }
);

// Compound index for querying user documents sorted by creation date
documentSchema.index({ userId: 1, createdAt: -1 });

export const Document = mongoose.model('Document', documentSchema);
