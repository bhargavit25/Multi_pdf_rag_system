import mongoose from 'mongoose';

const quizQuestionSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true },
    question: { type: String, required: true },
    type: {
      type: String,
      enum: ['mcq', 'true_false'],
      required: true,
    },
    options: [{ type: String, required: true }],
    correctAnswer: { type: String, required: true },
    explanation: { type: String, default: '' },
    source: {
      documentId: { type: String, default: '' },
      filename: { type: String, default: '' },
      pageNumber: { type: Number, default: 1 },
    },
  },
  { _id: false }
);

const userResponseSchema = new mongoose.Schema(
  {
    questionIndex: { type: Number, required: true },
    selectedAnswer: { type: String, default: '' },
    isCorrect: { type: Boolean, default: false },
  },
  { _id: false }
);

const quizSchema = new mongoose.Schema(
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
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
    },
    questionType: {
      type: String,
      enum: ['mcq', 'true_false', 'mixed'],
      default: 'mcq',
    },
    questionCount: {
      type: Number,
      required: true,
    },
    questions: [quizQuestionSchema],
    userResponses: [userResponseSchema],
    score: {
      type: Number,
      default: 0,
    },
    percentage: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['generated', 'completed'],
      default: 'generated',
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

quizSchema.index({ userId: 1, createdAt: -1 });

export const Quiz = mongoose.model('Quiz', quizSchema);

