import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';
import { startServer } from '../src/server.js';
import { Document } from '../src/models/Document.js';
import { FlashcardSet } from '../src/models/FlashcardSet.js';

const TEST_PORT = 5096;
const API_BASE = `http://localhost:${TEST_PORT}/api`;

test('Flashcard Generator Feature & Scenario Suite', async (t) => {
  let serverInstance = null;
  serverInstance = await startServer(TEST_PORT);
  await new Promise((r) => setTimeout(r, 600));

  t.after(async () => {
    if (serverInstance && typeof serverInstance.close === 'function') {
      await new Promise((res) => serverInstance.close(res));
    }
    await mongoose.disconnect().catch(() => {});
  });

  // Login as demo user
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demo@example.com', password: 'demo1234' }),
  });
  const loginData = await loginRes.json();
  assert.ok(loginData.data?.token, 'Demo user login failed');
  const token = loginData.data.token;
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // Helper to create a PDF and upload it
  const createAndUploadPdf = async (filename, pagesContent) => {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    for (const text of pagesContent) {
      const page = pdfDoc.addPage([500, 500]);
      page.drawText(text, { x: 40, y: 400, font, size: 12 });
    }

    const pdfBytes = await pdfDoc.save();
    const tempPath = path.resolve(`temp_${Date.now()}_${filename}`);
    await fs.writeFile(tempPath, Buffer.from(pdfBytes));

    const formData = new FormData();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    formData.append('files', blob, filename);

    const res = await fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const data = await res.json();
    await fs.unlink(tempPath).catch(() => {});
    return data.data.documents[0]._id;
  };

  // 1. Upload Doc 1: Biology / Cellular Respiration
  const doc1Id = await createAndUploadPdf('Cellular_Biology.pdf', [
    'Cellular Respiration and ATP Synthesis. Mitochondria is the powerhouse of the eukaryotic cell producing ATP through oxidative phosphorylation. Glycolysis breaks down glucose into pyruvate in the cytoplasm.',
    'The Krebs Cycle occurs inside the mitochondrial matrix. Electron Transport Chain creates a proton gradient across the inner membrane powering ATP synthase enzymes.',
  ]);

  // 2. Upload Doc 2: Computer Systems Architecture
  const doc2Id = await createAndUploadPdf('Computer_Architecture.pdf', [
    'Von Neumann Architecture describes computer systems with shared memory for data and instructions. Cache memory reduces latency between the CPU and main system RAM.',
    'Pipelining allows multiple instruction stages to execute concurrently. Hazard detection prevents data dependency conflicts in modern superscalar processors.',
  ]);

  // Wait 2.5 seconds for background document processing to reach Ready status
  await new Promise((r) => setTimeout(r, 2500));

  // Verify both documents are Ready in the DB
  const doc1 = await Document.findById(doc1Id);
  const doc2 = await Document.findById(doc2Id);
  assert.equal(doc1.status, 'Ready');
  assert.equal(doc2.status, 'Ready');

  let generatedSetId = '';

  // ----------------------------------------------------
  // Scenario 1: One ready PDF selected
  // ----------------------------------------------------
  await t.test('Scenario 1: One ready PDF selected', async () => {
    const res = await fetch(`${API_BASE}/flashcards/generate`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        documentIds: [doc1Id],
        count: 5,
        title: 'Cellular Biology Review',
      }),
    });
    const data = await res.json();
    assert.equal(res.status, 201);
    assert.equal(data.success, true);
    const set = data.data.flashcardSet;
    assert.ok(set._id);
    generatedSetId = set._id;
    assert.equal(set.totalCards, 5);
    assert.equal(set.cards.length, 5);
    assert.ok(set.cards[0].front);
    assert.ok(set.cards[0].back);
    assert.equal(set.cards[0].source.filename, 'Cellular_Biology.pdf');
    assert.ok(set.cards[0].source.pageNumber >= 1);
  });

  // ----------------------------------------------------
  // Scenario 2: Multiple ready PDFs selected
  // ----------------------------------------------------
  await t.test('Scenario 2: Multiple ready PDFs selected', async () => {
    const res = await fetch(`${API_BASE}/flashcards/generate`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        documentIds: [doc1Id, doc2Id],
        count: 10,
        title: 'Combined Review',
      }),
    });
    const data = await res.json();
    assert.equal(res.status, 201);
    assert.equal(data.success, true);
    const set = data.data.flashcardSet;
    assert.equal(set.totalCards, 10);
    assert.equal(set.cards.length, 10);
    assert.equal(set.documentNames.length, 2);
  });

  // ----------------------------------------------------
  // Scenario 3: No PDF selected
  // ----------------------------------------------------
  await t.test('Scenario 3: No PDF selected', async () => {
    const res = await fetch(`${API_BASE}/flashcards/generate`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        documentIds: [],
        count: 5,
      }),
    });
    const data = await res.json();
    assert.equal(res.status, 400);
    assert.equal(data.success, false);
    assert.ok(data.message.includes('select at least one document'));
  });

  // ----------------------------------------------------
  // Scenario 4: PDF still processing
  // ----------------------------------------------------
  await t.test('Scenario 4: PDF still processing', async () => {
    const pendingDoc = await Document.create({
      userId: doc1.userId,
      filename: 'Pending_Analysis.pdf',
      storedFilename: 'pending.pdf',
      filepath: 'uploads/pending.pdf',
      fileSize: 1000,
      mimeType: 'application/pdf',
      status: 'Processing',
    });

    const res = await fetch(`${API_BASE}/flashcards/generate`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        documentIds: [pendingDoc._id],
        count: 5,
      }),
    });
    const data = await res.json();
    assert.equal(res.status, 500);
    assert.ok(data.message.includes('Processing'));
    await Document.findByIdAndDelete(pendingDoc._id);
  });

  // ----------------------------------------------------
  // Scenario 5: PDF processing failed
  // ----------------------------------------------------
  await t.test('Scenario 5: PDF processing failed', async () => {
    const failedDoc = await Document.create({
      userId: doc1.userId,
      filename: 'Corrupt_File.pdf',
      storedFilename: 'corrupt.pdf',
      filepath: 'uploads/corrupt.pdf',
      fileSize: 500,
      mimeType: 'application/pdf',
      status: 'Failed',
      errorMessage: 'Corrupt PDF header or unreadable stream.',
    });

    const res = await fetch(`${API_BASE}/flashcards/generate`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        documentIds: [failedDoc._id],
        count: 5,
      }),
    });
    const data = await res.json();
    assert.equal(res.status, 500);
    assert.ok(data.message.includes('failed processing'));
    await Document.findByIdAndDelete(failedDoc._id);
  });

  // ----------------------------------------------------
  // Scenario 6: Exact Count 5, 10, 15, and 20 Flashcards
  // ----------------------------------------------------
  await t.test('Scenario 6: Exact Card Counts (5, 10, 15, 20)', async () => {
    for (const requestedCount of [5, 10, 15, 20]) {
      const res = await fetch(`${API_BASE}/flashcards/generate`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          documentIds: [doc1Id, doc2Id],
          count: requestedCount,
          title: `Set with ${requestedCount} cards`,
        }),
      });
      const data = await res.json();
      assert.equal(res.status, 201);
      assert.equal(data.data.flashcardSet.totalCards, requestedCount);
      assert.equal(data.data.flashcardSet.cards.length, requestedCount);
    }
  });

  // ----------------------------------------------------
  // Scenario 7: Interactive Card Status Update & Rename
  // ----------------------------------------------------
  await t.test('Scenario 7: Interactive card status and renaming', async () => {
    const fetchSetRes = await fetch(`${API_BASE}/flashcards/${generatedSetId}`, {
      headers: authHeaders,
    });
    const setData = await fetchSetRes.json();
    const cards = setData.data.flashcardSet.cards;

    // Mark card 0 as known, card 1 as need_practice
    cards[0].status = 'known';
    cards[1].status = 'need_practice';

    const patchRes = await fetch(`${API_BASE}/flashcards/${generatedSetId}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({
        title: 'Cellular Biology Mastered',
        cards,
      }),
    });
    const patchData = await patchRes.json();
    assert.equal(patchRes.status, 200);
    assert.equal(patchData.data.flashcardSet.title, 'Cellular Biology Mastered');
    assert.equal(patchData.data.flashcardSet.knownCount, 1);
    assert.equal(patchData.data.flashcardSet.needPracticeCount, 1);
  });

  // ----------------------------------------------------
  // Scenario 8: ChromaDB fallback / Vector DB health
  // ----------------------------------------------------
  await t.test('Scenario 8: Vector Store health & fallback active', async () => {
    const healthRes = await fetch(`${API_BASE}/health`);
    const healthData = await healthRes.json();
    assert.equal(healthRes.status, 200);
    assert.ok(healthData.data.vectorStore);
  });

  // Clean up uploaded documents
  await Document.findByIdAndDelete(doc1Id);
  await Document.findByIdAndDelete(doc2Id);
});
