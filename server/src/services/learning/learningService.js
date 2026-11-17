import fs from 'fs/promises';
import path from 'path';
import { Document } from '../../models/Document.js';
import { Summary } from '../../models/Summary.js';
import { Quiz } from '../../models/Quiz.js';
import { FlashcardSet } from '../../models/FlashcardSet.js';
import { extractPdfText } from '../pdf/extractor.js';
import { llmService } from '../rag/llmService.js';
import { getVectorStore } from '../vector/index.js';
import { logger } from '../../utils/logger.js';

class LearningService {
  /**
   * Helper to load ready documents and extract their page-by-page texts.
   */
  async getDocumentCorpus(documentIds, userId) {
    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      throw new Error('Please select at least one document.');
    }

    const docs = await Document.find({
      _id: { $in: documentIds },
      userId,
    });

    if (docs.length === 0) {
      throw new Error('No matching documents found.');
    }

    // Check for failed documents
    const failedDocs = docs.filter((d) => String(d.status || '').toLowerCase() === 'failed');
    if (failedDocs.length > 0) {
      throw new Error(`Document "${failedDocs[0].filename}" failed processing: ${failedDocs[0].errorMessage || 'Extraction error'}.`);
    }

    // Check for unready documents
    const unreadyDocs = docs.filter((d) => String(d.status || '').toLowerCase() !== 'ready');
    if (unreadyDocs.length > 0) {
      throw new Error(`Document "${unreadyDocs[0].filename}" is still ${unreadyDocs[0].status}. Please wait until processing completes.`);
    }

    const pagesWithMeta = [];
    const docNames = [];

    for (const doc of docs) {
      docNames.push(doc.filename);
      let extracted = false;

      // Try reading directly from filepath or resolving from uploads folder
      try {
        let filePath = doc.filepath;
        try {
          await fs.access(filePath);
        } catch {
          const filename = path.basename(doc.filepath);
          const candidate = path.resolve('uploads', filename);
          try {
            await fs.access(candidate);
            filePath = candidate;
          } catch {
            if (doc.storedFilename) {
              const candidateStored = path.resolve('uploads', doc.storedFilename);
              try {
                await fs.access(candidateStored);
                filePath = candidateStored;
              } catch {}
            }
          }
        }

        const { pages } = await extractPdfText(filePath);
        for (const p of pages) {
          if (p.text && p.text.trim()) {
            pagesWithMeta.push({
              documentId: doc._id.toString(),
              filename: doc.filename,
              pageNumber: p.pageNumber,
              text: p.text.trim(),
            });
            extracted = true;
          }
        }
      } catch (err) {
        logger.warn(`Could not extract full text from file for ${doc.filename}: ${err.message}`);
      }

      // If disk extraction failed, check if vectors are in vectorStore
      if (!extracted) {
        try {
          const vectorStore = await getVectorStore();
          const vectors = await vectorStore.similaritySearch({
            queryEmbedding: new Array(384).fill(0.01),
            topK: 50,
            filter: { documentId: doc._id.toString() },
          });
          for (const v of vectors) {
            if (v.text && v.text.trim()) {
              pagesWithMeta.push({
                documentId: doc._id.toString(),
                filename: doc.filename,
                pageNumber: v.metadata?.pageNumber || 1,
                text: v.text.trim(),
              });
              extracted = true;
            }
          }
        } catch (vecErr) {
          logger.warn(`Vector store fallback retrieval failed: ${vecErr.message}`);
        }
      }
    }

    if (pagesWithMeta.length === 0) {
      throw new Error('No readable text found in the selected documents.');
    }

    return {
      documents: docs,
      documentNames: docNames,
      pages: pagesWithMeta,
    };
  }

  /**
   * Builds formatted context text with page annotations.
   */
  buildContextString(pages, maxChars = 24000) {
    let context = '';
    for (const p of pages) {
      const entry = `--- Document: ${p.filename} | Page: ${p.pageNumber} ---\n${p.text}\n\n`;
      if ((context + entry).length > maxChars) {
        // Sample gracefully if document is very large
        const remainingChars = maxChars - context.length;
        if (remainingChars > 200) {
          context += entry.slice(0, remainingChars) + '\n... [truncated for length]\n\n';
        }
        break;
      }
      context += entry;
    }
    return context;
  }

  // ==========================================
  // 1. AI SUMMARIZATION
  // ==========================================
  async generateSummary({ documentIds, userId, summaryType = 'short', userPreferences = {} }) {
    const { documents, documentNames, pages } = await this.getDocumentCorpus(documentIds, userId);

    const typeLabels = {
      short: 'Executive Brief Summary',
      detailed: 'Comprehensive Detailed Summary',
      chapter: 'Chapter-Wise & Section Summary',
      key_points: 'Key Points, Definitions & Formulas',
    };

    const typeInstructions = {
      short: 'Provide a concise, high-level executive overview (3-4 paragraphs) covering the main purpose, primary themes, and critical takeaways. Use bold text and bullet points. Include page citations like [Doc: filename, Page X].',
      detailed: 'Provide an in-depth, thorough summary explaining important topics, core concepts, underlying methodologies, technical definitions, and real-world examples. Structure with clear Markdown headers (## Section, ### Subsection) and exact page citations [Doc: filename, Page X].',
      chapter: 'Organize the summary by document chapters/sections and page ranges. For each section, provide a bold heading, core discussion, key sub-points, and exact page citations [Doc: filename, Page X].',
      key_points: 'Extract all essential key points, formal definitions, formulas, core rules, and critical facts into an organized list of bullet points with bold keywords and exact page citations [Doc: filename, Page X].',
    };

    const context = this.buildContextString(pages);
    const instruction = typeInstructions[summaryType] || typeInstructions.short;

    const prompt = `DOCUMENT CONTENT:
${context}

TASK:
Generate a high-quality ${typeLabels[summaryType] || 'Summary'} based strictly on the document text provided above.

INSTRUCTIONS:
${instruction}

RULES:
1. Ground every statement in the provided text.
2. Include exact page citations like (from filename, Page X) or [Doc: filename, Page X] for every key section.
3. Use clean Markdown formatting with headers, bullet points, and bold text.`;

    let content = await llmService.generateText({
      prompt,
      systemInstruction: 'You are an expert AI academic and technical summarizer. You generate structured, professional summaries strictly grounded in document text with precise page citations.',
      userPreferences,
      temperature: 0.2,
    });

    // Fallback algorithmic summarizer if no external API key is present
    if (!content) {
      content = this.fallbackGenerateSummary(pages, summaryType, documentNames);
    }

    // Collect source references
    const sources = pages.slice(0, 10).map((p) => ({
      documentId: p.documentId,
      filename: p.filename,
      pageNumber: p.pageNumber,
      previewText: p.text.slice(0, 150) + (p.text.length > 150 ? '...' : ''),
    }));

    const title = `${typeLabels[summaryType] || 'Summary'} – ${documentNames.join(', ').slice(0, 60)}`;

    const summary = await Summary.create({
      userId,
      documentIds: documents.map((d) => d._id),
      documentNames,
      title,
      summaryType,
      content,
      sources,
    });

    return summary;
  }

  fallbackGenerateSummary(pages, summaryType, docNames) {
    const docLabel = docNames.join(', ');

    if (summaryType === 'short') {
      let result = `## Executive Summary: ${docLabel}\n\n`;
      result += `This document provides foundational knowledge and structured analysis across **${pages.length} pages**.\n\n`;
      result += `### Core Takeaways\n\n`;
      pages.slice(0, 5).forEach((p) => {
        const sentences = p.text.split(/(?<=[.?!])\s+/).filter((s) => s.trim().length > 30);
        if (sentences[0]) {
          result += `* **Key Insight (Page ${p.pageNumber})**: ${sentences[0].trim()}\n`;
        }
      });
      result += `\n*Note: Add an LLM API key in Settings for full generative synthesis.*`;
      return result;
    }

    if (summaryType === 'detailed') {
      let result = `## Comprehensive Detailed Analysis: ${docLabel}\n\n`;
      pages.forEach((p) => {
        const paragraphs = p.text.split(/\n\s*\n/).filter((para) => para.trim().length > 40);
        result += `### Section Analysis – Page ${p.pageNumber} (${p.filename})\n\n`;
        paragraphs.slice(0, 2).forEach((para) => {
          result += `> ${para.trim().slice(0, 300)}...\n\n`;
        });
      });
      result += `\n*Note: Add an LLM API key in Settings for expanded generative narratives.*`;
      return result;
    }

    if (summaryType === 'chapter') {
      let result = `## Chapter & Section-wise Breakdown: ${docLabel}\n\n`;
      pages.forEach((p) => {
        result += `### Chapter/Page ${p.pageNumber}: ${p.filename}\n\n`;
        const sentences = p.text.split(/(?<=[.?!])\s+/).filter((s) => s.trim().length > 25);
        sentences.slice(0, 3).forEach((s) => {
          result += `* **Topic Point**: ${s.trim()}\n`;
        });
        result += `\n`;
      });
      return result;
    }

    // key_points
    let result = `## Key Points, Definitions & Principles: ${docLabel}\n\n`;
    pages.forEach((p) => {
      const sentences = p.text.split(/(?<=[.?!])\s+/).filter((s) => s.trim().length > 25);
      sentences.slice(0, 2).forEach((s) => {
        result += `* **Page ${p.pageNumber}**: ${s.trim()}\n`;
      });
    });
    return result;
  }

  // ==========================================
  // 2. AI QUIZ GENERATION & GRADING
  // ==========================================
  async generateQuiz({ documentIds, userId, difficulty = 'medium', questionType = 'mcq', questionCount = 5, userPreferences = {} }) {
    const { documents, documentNames, pages } = await this.getDocumentCorpus(documentIds, userId);
    const count = Math.min(Math.max(parseInt(questionCount, 10) || 5, 3), 20);

    const context = this.buildContextString(pages);

    const prompt = `DOCUMENT CONTENT:
${context}

TASK:
Generate exactly ${count} educational quiz questions based strictly on the document text.
Difficulty level: ${difficulty}
Question format: ${questionType === 'true_false' ? 'True or False' : questionType === 'mcq' ? 'Multiple Choice (4 options: A, B, C, D)' : 'Mixed (some MCQ, some True/False)'}

REQUIREMENTS FOR EACH QUESTION:
1. "id": Sequential integer 1, 2, ...
2. "question": The clear question text.
3. "type": Either "mcq" or "true_false".
4. "options": Array of strings. For MCQ: exactly 4 options prefixed like ["A) ...", "B) ...", "C) ...", "D) ..."]. For True/False: exactly ["True", "False"].
5. "correctAnswer": The EXACT matching string from the options array that represents the correct answer (e.g. "B) Linear superposition" or "True").
6. "explanation": 1-2 sentences explaining why the answer is correct based on the text.
7. "source": An object containing "documentId", "filename", and "pageNumber" where the answer is found.

OUTPUT FORMAT:
Return a JSON array of question objects only.`;

    let questions = await llmService.generateJson({
      prompt,
      systemInstruction: 'You are an expert educational assessment creator. You generate challenging, high-yield quiz questions directly validated by source texts, with accurate answer keys and explanations.',
      userPreferences,
    });

    if (!Array.isArray(questions) || questions.length === 0) {
      questions = this.fallbackGenerateQuiz(pages, count, questionType, difficulty);
    }

    // Normalize questions
    const normalizedQuestions = questions.slice(0, count).map((q, idx) => ({
      id: idx + 1,
      question: q.question || `Question ${idx + 1}`,
      type: q.type === 'true_false' ? 'true_false' : 'mcq',
      options: Array.isArray(q.options) && q.options.length > 0 ? q.options : ['True', 'False'],
      correctAnswer: q.correctAnswer || (q.options ? q.options[0] : 'True'),
      explanation: q.explanation || 'Verified from document content.',
      source: {
        documentId: q.source?.documentId || pages[0].documentId,
        filename: q.source?.filename || pages[0].filename,
        pageNumber: Number(q.source?.pageNumber) || pages[0].pageNumber || 1,
      },
    }));

    const title = `${difficulty.toUpperCase()} Quiz (${count} Questions) – ${documentNames.join(', ').slice(0, 50)}`;

    const quiz = await Quiz.create({
      userId,
      documentIds: documents.map((d) => d._id),
      documentNames,
      title,
      difficulty,
      questionType,
      questionCount: normalizedQuestions.length,
      questions: normalizedQuestions,
      userResponses: [],
      score: 0,
      percentage: 0,
      status: 'generated',
    });

    return quiz;
  }

  fallbackGenerateQuiz(pages, count, questionType, _difficulty) {
    const questions = [];
    let qId = 1;

    for (let i = 0; i < pages.length && questions.length < count; i++) {
      const page = pages[i];
      const sentences = page.text
        .split(/(?<=[.?!])\s+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 35 && !s.includes('http'));

      for (let sIdx = 0; sIdx < sentences.length && questions.length < count; sIdx++) {
        const sentence = sentences[sIdx];
        const isTF = questionType === 'true_false' || (questionType === 'mixed' && qId % 2 === 0);

        if (isTF) {
          const isTrue = qId % 2 !== 0;
          let qText = sentence;
          if (!isTrue) {
            // Negate or alter statement for false question
            qText = sentence.replace(/\b(is|are|can|has|provides|enables)\b/i, '$1 not');
            if (qText === sentence) qText = `According to the document, it is false that: ${sentence}`;
          }

          questions.push({
            id: qId++,
            question: `Statement: "${qText}"`,
            type: 'true_false',
            options: ['True', 'False'],
            correctAnswer: isTrue ? 'True' : 'False',
            explanation: `Based on Page ${page.pageNumber} of ${page.filename}: "${sentence}"`,
            source: {
              documentId: page.documentId,
              filename: page.filename,
              pageNumber: page.pageNumber,
            },
          });
        } else {
          // MCQ
          const words = sentence.split(/\s+/).filter((w) => w.length > 5);
          const keyword = words[0] || 'Principle';
          const truncated = sentence.replace(new RegExp(`^${keyword}\\s*`, 'i'), '...');

          const correct = `A) ${sentence.slice(0, 110)}`;
          const distractors = [
            `B) It contradicts classical physics by ignoring ${keyword.toLowerCase()}.`,
            `C) It is an unrelated algorithmic concept that was deprecated.`,
            `D) None of the above descriptions are supported by the text.`,
          ];

          questions.push({
            id: qId++,
            question: `Which of the following statements regarding ${keyword} is accurate according to the document?`,
            type: 'mcq',
            options: [correct, ...distractors],
            correctAnswer: correct,
            explanation: `Page ${page.pageNumber} explains: "${sentence}"`,
            source: {
              documentId: page.documentId,
              filename: page.filename,
              pageNumber: page.pageNumber,
            },
          });
        }
      }
    }

    return questions;
  }

  async submitQuiz({ quizId, userId, answers }) {
    const quiz = await Quiz.findOne({ _id: quizId, userId });
    if (!quiz) {
      throw new Error('Quiz not found.');
    }

    const answerMap = new Map();
    if (Array.isArray(answers)) {
      for (const a of answers) {
        answerMap.set(Number(a.questionIndex), a.selectedAnswer);
      }
    }

    let correctCount = 0;
    const userResponses = quiz.questions.map((q, idx) => {
      const selected = answerMap.get(idx) || '';
      // Compare trimmed strings
      const isCorrect = selected.trim() === q.correctAnswer.trim();
      if (isCorrect) correctCount++;

      return {
        questionIndex: idx,
        selectedAnswer: selected,
        isCorrect,
      };
    });

    const score = correctCount;
    const percentage = Math.round((correctCount / quiz.questions.length) * 100);

    quiz.userResponses = userResponses;
    quiz.score = score;
    quiz.percentage = percentage;
    quiz.status = 'completed';
    quiz.completedAt = new Date();

    await quiz.save();
    return quiz;
  }

  // ==========================================
  // 3. AI FLASHCARD GENERATION
  // ==========================================
  async generateFlashcards({ documentIds, userId, title, count = 10, userPreferences = {} }) {
    const { documents, documentNames, pages } = await this.getDocumentCorpus(documentIds, userId);
    const targetCount = Math.min(Math.max(parseInt(count, 10) || 10, 5), 25);

    const context = this.buildContextString(pages);

    const prompt = `DOCUMENT CONTENT:
${context}

TASK:
Extract exactly ${targetCount} high-yield study flashcards based on the document text.
Extract core definitions, key technical terms, formulas, important principles, and fundamental concepts.

REQUIREMENTS FOR EACH FLASHCARD:
1. "id": Unique string identifier (e.g. "card_1", "card_2").
2. "front": Clear question, concept title, or term (e.g. "What is Quantum Decoherence?").
3. "back": Concise, accurate explanation, definition, or formula explaining the concept based strictly on the text.
4. "source": Object with "documentId", "filename", and "pageNumber" where this concept appears.

OUTPUT FORMAT:
Return a JSON array of exactly ${targetCount} flashcard objects only.`;

    let cards = [];
    try {
      cards = await llmService.generateJson({
        prompt,
        systemInstruction: `You are an educational study expert. You extract high-value active-recall flashcards directly from technical documents. Always generate exactly ${targetCount} flashcards.`,
        userPreferences,
      });
    } catch (llmErr) {
      logger.warn(`LLM flashcard generation warning: ${llmErr.message}`);
    }

    if (!Array.isArray(cards) || cards.length === 0) {
      cards = this.fallbackGenerateFlashcards(pages, targetCount);
    } else if (cards.length < targetCount) {
      // Supplement with fallback cards if LLM returned fewer than requested
      const supplemental = this.fallbackGenerateFlashcards(pages, targetCount - cards.length);
      cards = [...cards, ...supplemental];
    }

    const normalizedCards = cards.slice(0, targetCount).map((c, idx) => ({
      id: c.id || `card_${idx + 1}`,
      front: c.front || `Concept ${idx + 1}`,
      back: c.back || 'Detailed definition extracted from text.',
      source: {
        documentId: c.source?.documentId || pages[0]?.documentId || '',
        filename: c.source?.filename || pages[0]?.filename || '',
        pageNumber: Number(c.source?.pageNumber) || pages[0]?.pageNumber || 1,
      },
      status: 'unreviewed',
      lastReviewedAt: null,
    }));

    const finalTitle = title && title.trim()
      ? title.trim()
      : `Flashcards – ${documentNames.join(', ').slice(0, 50)}`;

    const flashcardSet = await FlashcardSet.create({
      userId,
      documentIds: documents.map((d) => d._id),
      documentNames,
      title: finalTitle,
      cards: normalizedCards,
      totalCards: normalizedCards.length,
      knownCount: 0,
      needPracticeCount: 0,
    });

    return flashcardSet;
  }

  fallbackGenerateFlashcards(pages, count) {
    const cards = [];
    let cId = 1;
    const seenFronts = new Set();

    const addCard = (front, back, page) => {
      if (!front || !back || cards.length >= count) return false;
      const key = front.toLowerCase().trim();
      if (seenFronts.has(key)) return false;
      seenFronts.add(key);

      cards.push({
        id: `card_${cId++}`,
        front: front.trim(),
        back: back.trim(),
        source: {
          documentId: page.documentId,
          filename: page.filename,
          pageNumber: page.pageNumber,
        },
      });
      return true;
    };

    // Pass 1: Definitions and core principles ("X is...", "X refers to...", "X enables...")
    for (const page of pages) {
      if (cards.length >= count) break;
      const sentences = page.text
        .split(/(?<=[.?!])\s+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 30 && !s.includes('http'));

      for (const sent of sentences) {
        if (cards.length >= count) break;
        const match = sent.match(/^([A-Z][a-zA-Z0-9\s-]{2,35})\s+(is|are|refers to|describes|enables|represents|provides)\s+(.+)$/i);
        if (match) {
          const term = match[1].trim();
          addCard(`What is ${term}?`, `${term} ${match[2]} ${match[3].trim()}`, page);
        }
      }
    }

    // Pass 2: Key concepts, formulas, and distinct statements
    for (const page of pages) {
      if (cards.length >= count) break;
      const sentences = page.text
        .split(/(?<=[.?!])\s+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 35 && !s.includes('http'));

      for (const sent of sentences) {
        if (cards.length >= count) break;
        const words = sent.split(/\s+/).filter((w) => w.length > 4);
        const subject = words[0] || `Core Concept (Page ${page.pageNumber})`;
        addCard(
          `Explain the principle regarding ${subject.replace(/[^a-zA-Z0-9\s]/g, '')}`,
          sent,
          page
        );
      }
    }

    // Pass 3: Clauses and compound statements (semicolons, commas, dashes)
    for (const page of pages) {
      if (cards.length >= count) break;
      const clauses = page.text
        .split(/[;:\n]+/)
        .map((c) => c.trim())
        .filter((c) => c.length > 40 && c.length < 250);

      for (const clause of clauses) {
        if (cards.length >= count) break;
        const words = clause.split(/\s+/);
        const topic = words.slice(0, 3).join(' ');
        addCard(`What does the document state regarding ${topic}?`, clause, page);
      }
    }

    // Pass 4: Ensure exact target count is ALWAYS reached even for short documents
    let pIdx = 0;
    while (cards.length < count && pages.length > 0) {
      const page = pages[pIdx % pages.length];
      pIdx++;
      const cardNumber = cards.length + 1;
      const excerpt = page.text.slice(0, 200).trim();
      addCard(
        `Key Concept #${cardNumber} from ${page.filename} (Page ${page.pageNumber})`,
        excerpt || `Important technical concept detailed on page ${page.pageNumber}.`,
        page
      );
      if (pIdx > count * 6) break;
    }

    return cards.slice(0, count);
  }

  async updateFlashcardSet({ setId, userId, title, cards }) {
    const set = await FlashcardSet.findOne({ _id: setId, userId });
    if (!set) {
      throw new Error('Flashcard set not found.');
    }

    if (title && title.trim()) {
      set.title = title.trim();
    }

    if (Array.isArray(cards)) {
      set.cards = cards;
      set.totalCards = cards.length;
      set.knownCount = cards.filter((c) => c.status === 'known').length;
      set.needPracticeCount = cards.filter((c) => c.status === 'need_practice').length;
    }

    await set.save();
    return set;
  }
}

export const learningService = new LearningService();

