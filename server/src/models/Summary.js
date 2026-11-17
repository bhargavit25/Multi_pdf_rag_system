import mongoose from 'mongoose';

const sourceCitationSchema = new mongoose.Schema(
  {
    documentId: { type: String, required: true },
    filename: { type: String, required: true },
    pageNumber: { type: Number, required: true },
    previewText: { type: String, default: '' },
  },
  { _id: false }
);

const summarySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    documentIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document',
      },
    ],
    documentNames: [
      {
        type: String,
      },
    ],
    title: {
      type: String,
      required: true,
      trim: true,
    },
    summaryType: {
      type: String,
      enum: ['short', 'detailed', 'chapter', 'key_points'],
      default: 'short',
    },
    content: {
      type: String,
      required: true,
    },
    sources: [sourceCitationSchema],
  },
  {
    timestamps: true,
  }
);

summarySchema.index({ userId: 1, createdAt: -1 });

export const Summary = mongoose.model('Summary', summarySchema);

