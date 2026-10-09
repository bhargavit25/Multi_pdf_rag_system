import test from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';

const API_BASE = 'http://localhost:5000/api';

test('Multi-PDF RAG System - End-to-End Test Suite', async (t) => {
  const testUser = {
    name: 'Dr. Alan Turing',
    email: `turing_${Date.now()}@example.com`,
    password: 'Password123!',
  };
  let authToken = '';
  let userId = '';
  let uploadedDocId = '';
  let chatId = '';

  // 1. Health check
  await t.test('GET /api/health should return healthy status', async () => {
    const res = await fetch(`${API_BASE}/health`);
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.data.status, 'healthy');
    assert.equal(data.data.database.status, 'connected');
  });

  // 2. Registration
  await t.test('POST /api/auth/register should register new user', async () => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser),
    });
    const data = await res.json();
    assert.equal(res.status, 201);
    assert.equal(data.success, true);
    assert.ok(data.data.token);
    assert.equal(data.data.user.email, testUser.email.toLowerCase());
    authToken = data.data.token;
    userId = data.data.user.id;
  });

  // 3. Login
  await t.test('POST /api/auth/login should authenticate user', async () => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUser.email,
        password: testUser.password,
      }),
    });
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.ok(data.data.token);
  });

  // 4. Protected Route /me
  await t.test('GET /api/auth/me should return authenticated user profile', async () => {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.data.user.id, userId);
  });

  // 5. Protected Route rejection without token
  await t.test('GET /api/documents should reject unauthenticated requests', async () => {
    const res = await fetch(`${API_BASE}/documents`);
    const data = await res.json();
    assert.equal(res.status, 401);
    assert.equal(data.success, false);
  });

  // 6. Generate a multi-page test PDF and upload it
  await t.test('POST /api/documents/upload should upload and parse PDF with page numbers', async () => {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Page 1: Quantum Computing Fundamentals
    const page1 = pdfDoc.addPage([500, 500]);
    page1.drawText('Quantum Computing Fundamentals and Qubits.\nQuantum superposition allows qubits to exist in multiple states simultaneously.', {
      x: 50,
      y: 400,
      font,
      size: 14,
    });

    // Page 2: Quantum Decoherence & Entanglement
    const page2 = pdfDoc.addPage([500, 500]);
    page2.drawText('Quantum Entanglement and Decoherence.\nEntangled particles remain interconnected regardless of the physical distance separating them.', {
      x: 50,
      y: 400,
      font,
      size: 14,
    });

    const pdfBytes = await pdfDoc.save();
    const tempPdfPath = path.resolve('./temp_test_doc.pdf');
    await fs.writeFile(tempPdfPath, Buffer.from(pdfBytes));

    const formData = new FormData();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    formData.append('files', blob, 'Quantum_Computing_Overview.pdf');

    const res = await fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: formData,
    });

    const data = await res.json();
    assert.equal(res.status, 201);
    assert.equal(data.success, true);
    assert.equal(data.data.documents.length, 1);
    uploadedDocId = data.data.documents[0]._id;
    assert.ok(uploadedDocId);

    // Clean up temp file
    await fs.unlink(tempPdfPath).catch(() => {});
  });

  // Wait 2 seconds for background processing to complete
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // 7. Check document status and pageCount
  await t.test('GET /api/documents/:id should show Ready status with page count 2', async () => {
    const res = await fetch(`${API_BASE}/documents/${uploadedDocId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.data.document.pageCount, 2);
    assert.equal(data.data.document.status, 'Ready');
    assert.ok(data.data.document.chunkCount >= 2);
  });

  // 8. RAG Question Answering with Citations
  await t.test('POST /api/chat should answer question and cite document and page number', async () => {
    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        question: 'What is quantum superposition and how do entangled particles behave?',
      }),
    });

    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.ok(data.data.answer);
    assert.ok(data.data.sources.length > 0);
    
    // Check citation fields
    const source = data.data.sources[0];
    assert.equal(source.filename, 'Quantum_Computing_Overview.pdf');
    assert.ok(source.pageNumber === 1 || source.pageNumber === 2);
    assert.ok(source.chunkId);
    
    chatId = data.data.chatId;
    assert.ok(chatId);
  });

  // 9. Multi-turn chat session history
  await t.test('GET /api/chats/:id should retrieve conversation history', async () => {
    const res = await fetch(`${API_BASE}/chats/${chatId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.data.session.messages.length, 2); // 1 user + 1 assistant
  });

  // 10. Dashboard Stats
  await t.test('GET /api/stats should return aggregated dashboard statistics', async () => {
    const res = await fetch(`${API_BASE}/stats`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.data.totalDocuments, 1);
    assert.equal(data.data.totalPages, 2);
    assert.equal(data.data.totalChats, 1);
  });

  // 11. Delete document and clean up vectors
  await t.test('DELETE /api/documents/:id should delete document and vector records', async () => {
    const res = await fetch(`${API_BASE}/documents/${uploadedDocId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.success, true);

    // Verify deletion
    const checkRes = await fetch(`${API_BASE}/documents/${uploadedDocId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    assert.equal(checkRes.status, 404);
  });
});
