import fs from 'fs/promises';
import path from 'path';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { connectDB } from '../config/db.js';
import { config } from '../config/env.js';
import { User } from '../models/User.js';
import { Document } from '../models/Document.js';
import { ChatSession } from '../models/ChatSession.js';
import { chunkDocumentPages } from '../services/pdf/chunker.js';
import { embeddingService } from '../services/embeddings/embeddingService.js';
import { getVectorStore } from '../services/vector/index.js';
import { logger } from './logger.js';

export async function seedDatabase() {
  try {
    await connectDB();
    logger.info('Connected to MongoDB for database seeding.');

    // 1. Create or retrieve demo user
    let user = await User.findOne({ email: 'demo@example.com' });
    if (!user) {
      user = await User.create({
        name: 'Demo Researcher',
        email: 'demo@example.com',
        password: 'demo1234',
        apiKeyPreferences: {
          llmProvider: 'gemini',
          llmModel: 'gemini-1.5-flash',
        },
      });
      logger.info('Demo user created: demo@example.com / demo1234');
    } else {
      logger.info('Demo user already exists: demo@example.com');
    }

    // 2. Check if demo user already has sample documents and indexed vectors
    const existingDoc = await Document.findOne({ userId: user._id });
    const vectorStore = await getVectorStore();
    let hasVectors = false;
    if (existingDoc) {
      const checkVectors = await vectorStore.similaritySearch({
        queryEmbedding: new Array(384).fill(0.1),
        topK: 1,
        filter: { userId: user._id.toString() },
      });
      hasVectors = checkVectors.length > 0;
    }

    if (!existingDoc || !hasVectors) {
      if (existingDoc && !hasVectors) {
        logger.info('Demo document exists in DB but vectors are missing in vector store. Re-indexing...');
        await Document.deleteOne({ _id: existingDoc._id });
        await ChatSession.deleteMany({ userId: user._id });
      }
      logger.info('Generating sample PDF document for demo user...');

      // Create uploads directory if needed
      await fs.mkdir(config.uploadsDir, { recursive: true });

      // Generate a clean 2-page sample PDF with pdf-lib
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      // Page 1: Quantum Computing Principles & Superposition
      const page1 = pdfDoc.addPage([600, 750]);
      page1.drawText('Quantum Computing: Principles and Architecture', {
        x: 50,
        y: 680,
        font: boldFont,
        size: 18,
        color: rgb(0.1, 0.15, 0.3),
      });

      page1.drawText('Section 1: Fundamental Principles and Qubits', {
        x: 50,
        y: 630,
        font: boldFont,
        size: 14,
        color: rgb(0.2, 0.2, 0.2),
      });

      const p1Text = `Quantum computing harnesses the fundamental laws of quantum mechanics to solve problems beyond classical computers. While a classical bit represents either 0 or 1, a quantum bit (qubit) exists in a continuous linear superposition of both basis states: |psi> = a|0> + b|1>.

This superposition capability enables parallel exploration of exponential state spaces. Prominent quantum algorithms such as Shor's algorithm for prime factorization and Grover's algorithm for unstructured database search provide proven super-polynomial and quadratic computational advantages over classical counterparts.`;

      page1.drawText(p1Text, {
        x: 50,
        y: 580,
        font,
        size: 11,
        lineHeight: 18,
        maxWidth: 500,
        color: rgb(0.2, 0.2, 0.25),
      });

      // Page 2: Quantum Entanglement & Decoherence
      const page2 = pdfDoc.addPage([600, 750]);
      page2.drawText('Section 2: Entanglement, Decoherence, and Error Correction', {
        x: 50,
        y: 680,
        font: boldFont,
        size: 16,
        color: rgb(0.1, 0.15, 0.3),
      });

      const p2Text = `Quantum entanglement describes a non-local correlation between two or more quantum particles such that the quantum state of each particle cannot be described independently of the others, regardless of spatial separation. Einstein referred to this phenomenon as "spooky action at a distance."

A critical engineering challenge in physical quantum systems is quantum decoherence, caused by unintentional interactions with the environment. Environmental thermal noise induces phase errors and bit flips. Quantum Error Correction (QEC) protocols, such as topological surface codes, preserve fragile quantum information by distributing logical quantum states across arrays of physical qubits.`;

      page2.drawText(p2Text, {
        x: 50,
        y: 620,
        font,
        size: 11,
        lineHeight: 18,
        maxWidth: 500,
        color: rgb(0.2, 0.2, 0.25),
      });

      const pdfBytes = await pdfDoc.save();
      const filename = 'Quantum_Computing_Primer.pdf';
      const storedFilename = `sample-${Date.now()}-${filename}`;
      const filePath = path.join(config.uploadsDir, storedFilename);
      await fs.writeFile(filePath, Buffer.from(pdfBytes));

      // 3. Create Document Record
      const doc = await Document.create({
        userId: user._id,
        filename,
        storedFilename,
        filepath: filePath,
        fileSize: pdfBytes.length,
        mimeType: 'application/pdf',
        pageCount: 2,
        status: 'Embedding',
      });

      // 4. Chunk Pages
      const pages = [
        {
          pageNumber: 1,
          text: `Quantum Computing: Principles and Architecture. Section 1: Fundamental Principles and Qubits. ${p1Text}`,
        },
        {
          pageNumber: 2,
          text: `Section 2: Entanglement, Decoherence, and Error Correction. ${p2Text}`,
        },
      ];

      const chunks = chunkDocumentPages(pages, {
        documentId: doc._id.toString(),
        userId: user._id.toString(),
        filename: doc.filename,
      });

      doc.chunkCount = chunks.length;
      doc.chunks = chunks.map((c) => ({
        chunkId: c.chunkId,
        pageNumber: c.pageNumber,
        textLength: c.text.length,
        previewText: c.text.slice(0, 100),
      }));

      // 5. Generate Embeddings & Store in Vector Store
      const chunkTexts = chunks.map((c) => c.text);
      const embeddings = await embeddingService.generateEmbeddings(chunkTexts);

      const vectorStore = await getVectorStore();
      const ids = chunks.map((c) => `${doc._id}_${c.chunkId}`);
      const metadatas = chunks.map((c) => ({
        documentId: doc._id.toString(),
        userId: user._id.toString(),
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

      doc.status = 'Ready';
      await doc.save();
      logger.info(`Sample PDF ${filename} indexed with ${chunks.length} chunks.`);

      // 6. Create Initial Demo Chat Session
      const sampleQuestion = 'What is quantum superposition and how do entangled particles behave?';
      const sampleAnswer = `Based on the **Quantum Computing Primer** document:

* **Quantum Superposition (Page 1)**: Unlike classical bits that exist strictly in state 0 or 1, a qubit exists in a continuous linear superposition of both basis states (|psi> = a|0> + b|1>). This enables quantum algorithms to explore exponential state spaces simultaneously.

* **Quantum Entanglement (Page 2)**: Entangled particles share non-local correlations such that the quantum state of each particle cannot be described independently of the others, regardless of the physical distance separating them.`;

      await ChatSession.create({
        userId: user._id,
        title: 'Quantum Computing Overview',
        documentIds: [doc._id],
        messages: [
          {
            role: 'user',
            content: sampleQuestion,
            sources: [],
            createdAt: new Date(Date.now() - 3600000),
          },
          {
            role: 'assistant',
            content: sampleAnswer,
            sources: [
              {
                documentId: doc._id.toString(),
                filename: doc.filename,
                pageNumber: 1,
                chunkId: chunks[0].chunkId,
                previewText: chunks[0].text.slice(0, 150) + '...',
                score: 0.96,
              },
              {
                documentId: doc._id.toString(),
                filename: doc.filename,
                pageNumber: 2,
                chunkId: chunks[1].chunkId,
                previewText: chunks[1].text.slice(0, 150) + '...',
                score: 0.94,
              },
            ],
            createdAt: new Date(Date.now() - 3590000),
          },
        ],
      });

      logger.info('Sample conversation created with source citations.');
    } else {
      logger.info('Sample document already present for demo user.');
    }

    logger.info('Database seeding completed successfully!');
    return true;
  } catch (error) {
    logger.error(`Database seeding failed: ${error.message}`);
    throw error;
  }
}

// When executed directly: node src/utils/seed.js
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
