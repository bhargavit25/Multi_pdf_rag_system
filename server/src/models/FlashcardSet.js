import mongoose from 'mongoose';

const flashcardCardSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    front: { type: String, required: true },
    back: { type: String, required: true },
    source: {
      documentId: { type: String, default: '' },
      filename: { type: String, default: '' },
      pageNumber: { type: Number, default: 1 },
    },
    status: {
      type: String,
      enum: ['unreviewed', 'known', 'need_practice'],
      default: 'unreviewed',
    },
    lastReviewedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

const flashcardSetSchema = new mongoose.Schema(
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
    documentNames: [{ type: String }],
    title: {
      type: String,
      required: true,
      trim: true,
    },
    cards: [flashcardCardSchema],
    totalCards: {
      type: Number,
      default: 0,
    },
    knownCount: {
      type: Number,
      default: 0,
    },
    needPracticeCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

flashcardSetSchema.index({ userId: 1, createdAt: -1 });

export const FlashcardSet = mongoose.model('FlashcardSet', flashcardSetSchema);

