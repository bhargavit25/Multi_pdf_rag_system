import mongoose from 'mongoose';

const sourceCitationSchema = new mongoose.Schema(
  {
    documentId: { type: String, required: true },
    filename: { type: String, required: true },
    pageNumber: { type: Number, required: true },
    chunkId: { type: String, required: true },
    previewText: { type: String, default: '' },
    score: { type: Number, default: 0 },
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ['user', 'assistant', 'system'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    sources: [sourceCitationSchema],
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const chatSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      default: 'New Conversation',
      trim: true,
    },
    documentIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document',
      },
    ],
    messages: [messageSchema],
  },
  {
    timestamps: true,
  }
);

chatSessionSchema.index({ userId: 1, updatedAt: -1 });

export const ChatSession = mongoose.model('ChatSession', chatSessionSchema);
