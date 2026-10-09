import fs from 'fs/promises';
import { extractText, getDocumentProxy } from 'unpdf';
import { logger } from '../../utils/logger.js';

/**
 * Extracts text from a PDF file preserving page numbers.
 * @param {string} filePath - Absolute path to the PDF file.
 * @returns {Promise<{ pageCount: number, pages: Array<{ pageNumber: number, text: string }> }>}
 */
export async function extractPdfText(filePath) {
  try {
    const fileBuffer = await fs.readFile(filePath);
    if (!fileBuffer || fileBuffer.length === 0) {
      throw new Error('The uploaded PDF file is empty (0 bytes).');
    }

    // Allocate an independent Uint8Array so the underlying ArrayBuffer is transferable
    const uint8Array = new Uint8Array(fileBuffer.length);
    uint8Array.set(fileBuffer);

    // Extract per-page text without merging
    const { text: pagesArray, totalPages } = await extractText(uint8Array, {
      mergePages: false,
    });

    if (!totalPages || totalPages === 0) {
      throw new Error('The PDF document contains no pages.');
    }

    const pages = [];
    let totalExtractedCharacters = 0;

    for (let i = 0; i < totalPages; i++) {
      const rawText = pagesArray[i] || '';
      // Clean and normalize whitespace while preserving meaningful line breaks
      const cleanText = rawText
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n\s*\n\s*\n+/g, '\n\n')
        .trim();

      totalExtractedCharacters += cleanText.length;

      pages.push({
        pageNumber: i + 1, // 1-indexed page number
        text: cleanText,
      });
    }

    if (totalExtractedCharacters === 0) {
      logger.warn(`PDF ${filePath} extracted 0 characters. It may be scanned or image-only.`);
    } else {
      logger.info(`Successfully extracted ${totalExtractedCharacters} chars across ${totalPages} pages from ${filePath}`);
    }

    return {
      pageCount: totalPages,
      pages,
    };
  } catch (error) {
    logger.error(`PDF extraction failed for ${filePath}: ${error.message}`);
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
}
