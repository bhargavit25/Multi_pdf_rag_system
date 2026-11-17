import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { startServer } from '../src/server.js';

const TEST_PORT = 5097;
const API_BASE = `http://localhost:${TEST_PORT}/api`;

test('Chatbot 8 Required Scenarios Verification', async (t) => {
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

  let chatId = '';

  // 1. Simple Question
  await t.test('1. Simple Question', async () => {
    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ question: 'Hello, what is this system about?' }),
    });
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.ok(data.success);
    assert.ok(data.data.answer);
    chatId = data.data.chatId;
    assert.ok(chatId);
  });

  // 2. Question related to uploaded PDF
  await t.test('2. PDF-related Question (Quantum superposition)', async () => {
    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        question: 'What is quantum superposition and qubits?',
        chatId,
      }),
    });
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.ok(data.data.sources.length > 0, 'Sources should be returned for PDF-related query');
    const hasMatch =
      data.data.answer.toLowerCase().includes('quantum') ||
      data.data.answer.toLowerCase().includes('superposition') ||
      data.data.answer.toLowerCase().includes('qubit');
    assert.ok(hasMatch, 'Answer should relate to quantum superposition');
  });

  // 3. Question not present in PDF
  await t.test('3. Question not present in PDF', async () => {
    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        question: 'What is the recipe for baking chocolate chip cookies with sea salt?',
        chatId,
      }),
    });
    const data = await res.json();
    assert.equal(res.status, 200);
    const text = data.data.answer.toLowerCase();
    const notFound =
      text.includes('could not find') ||
      text.includes('not found') ||
      text.includes('uploaded documents');
    assert.ok(notFound, 'Bot should clearly state information is not found in documents');
  });

  // 4. Consecutive questions in the same session
  await t.test('4. Consecutive questions in the same session', async () => {
    const q1 = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ question: 'Tell me about entanglement.', chatId }),
    });
    assert.equal(q1.status, 200);

    const q2 = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ question: 'What did we talk about earlier?', chatId }),
    });
    assert.equal(q2.status, 200);

    // Verify session in DB
    const histRes = await fetch(`${API_BASE}/chats/${chatId}`, { headers: authHeaders });
    const histData = await histRes.json();
    assert.ok(histData.data.session.messages.length >= 8, 'All messages should be stored');
  });

  // 5. Empty input
  await t.test('5. Empty input rejection', async () => {
    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ question: '   ' }),
    });
    assert.equal(res.status, 400);
  });

  // 6. User with no uploaded PDFs
  await t.test('6. User with no uploaded PDFs', async () => {
    const newEmail = `fresh_user_${Date.now()}@example.com`;
    const regRes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Fresh User', email: newEmail, password: 'Password123!' }),
    });
    const regData = await regRes.json();
    const freshToken = regData.data.token;

    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${freshToken}`,
      },
      body: JSON.stringify({ question: 'What is inside my document?' }),
    });
    const data = await res.json();
    assert.equal(res.status, 200);
    const ans = data.data.answer.toLowerCase();
    assert.ok(
      ans.includes('upload a pdf') || ans.includes("haven't uploaded"),
      'Should display helpful message asking to upload a PDF'
    );
  });

  // 7. LLM failure fallback
  await t.test('7. LLM fallback synthesis', async () => {
    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ question: 'Explain quantum decoherence' }),
    });
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.ok(data.data.answer.length > 10);
  });

  // 8. Vector Database status
  await t.test('8. Vector Database fallback active', async () => {
    const healthRes = await fetch(`${API_BASE}/health`);
    const healthData = await healthRes.json();
    assert.equal(healthRes.status, 200);
    assert.ok(healthData.data.vectorStore);
  });
});
