import { config } from '../../config/env.js';

/**
 * Intelligent text chunker that splits text into chunks of specified size and overlap,
 * preserving page boundaries, sentence boundaries, and attaching rich metadata.
 *
 * @param {Array<{ pageNumber: number, text: string }>} pages
 * @param {Object} metadata
 * @param {string} metadata.documentId
 * @param {string} metadata.userId
 * @param {string} metadata.filename
 * @param {Object} [options]
 * @param {number} [options.chunkSize]
 * @param {number} [options.chunkOverlap]
 * @returns {Array<{ documentId: string, userId: string, filename: string, pageNumber: number, chunkId: string, text: string }>}
 */
export function chunkDocumentPages(pages, metadata, options = {}) {
  const { documentId, userId, filename } = metadata;
  const chunkSize = options.chunkSize || config.chunkSize || 1000;
  const chunkOverlap = options.chunkOverlap || config.chunkOverlap || 150;

  const allChunks = [];

  for (const page of pages) {
    const { pageNumber, text } = page;
    const pageText = (text || '').trim();

    if (!pageText) {
      continue;
    }

    // If page content is smaller than chunk size + overlap, keep as single chunk
    if (pageText.length <= chunkSize) {
      allChunks.push({
        documentId: String(documentId),
        userId: String(userId),
        filename,
        pageNumber,
        chunkId: `chunk_${pageNumber}_01`,
        text: pageText,
      });
      continue;
    }

    // Split page text into chunks with overlap while attempting to split at sentence/paragraph breaks
    const pageChunks = splitTextIntoChunks(pageText, chunkSize, chunkOverlap);

    pageChunks.forEach((chunkText, index) => {
      const chunkNumberStr = String(index + 1).padStart(2, '0');
      allChunks.push({
        documentId: String(documentId),
        userId: String(userId),
        filename,
        pageNumber,
        chunkId: `chunk_${pageNumber}_${chunkNumberStr}`,
        text: chunkText,
      });
    });
  }

  return allChunks;
}

/**
 * Splits a text string into overlapping chunks respecting natural boundaries.
 */
function splitTextIntoChunks(text, targetSize, overlap) {
  const chunks = [];
  let startIndex = 0;

  while (startIndex < text.length) {
    let endIndex = startIndex + targetSize;

    if (endIndex >= text.length) {
      const finalChunk = text.slice(startIndex).trim();
      if (finalChunk.length > 20) {
        chunks.push(finalChunk);
      }
      break;
    }

    // Look for a good boundary near endIndex (within last 20% of targetSize)
    const windowStart = Math.max(startIndex + Math.floor(targetSize * 0.75), startIndex);
    const searchSlice = text.slice(windowStart, endIndex + 50);

    // Try finding paragraph break, then sentence break, then line break, then space
    let breakOffset = -1;

    const paragraphMatch = searchSlice.lastIndexOf('\n\n');
    if (paragraphMatch !== -1) {
      breakOffset = paragraphMatch + 2;
    } else {
      const sentenceMatch = searchSlice.search(/[.!?]\s+[A-Z0-9]/);
      if (sentenceMatch !== -1) {
        breakOffset = sentenceMatch + 2;
      } else {
        const lineMatch = searchSlice.lastIndexOf('\n');
        if (lineMatch !== -1) {
          breakOffset = lineMatch + 1;
        } else {
          const spaceMatch = searchSlice.lastIndexOf(' ');
          if (spaceMatch !== -1) {
            breakOffset = spaceMatch + 1;
          }
        }
      }
    }

    let actualEnd = endIndex;
    if (breakOffset !== -1) {
      actualEnd = windowStart + breakOffset;
    }

    const chunkContent = text.slice(startIndex, actualEnd).trim();
    if (chunkContent.length > 20) {
      chunks.push(chunkContent);
    }

    // Move start forward by step size (targetSize - overlap)
    const step = Math.max(actualEnd - startIndex - overlap, 50);
    startIndex += step;
  }

  return chunks;
}
