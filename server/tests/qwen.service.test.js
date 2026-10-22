import test from 'node:test';
import assert from 'node:assert/strict';

// Port 9 (discard) is closed on a normal machine, so the request fails to
// connect, the same way it does when Ollama is not running.
process.env.OLLAMA_BASE_URL = 'http://127.0.0.1:9';

const { generateWithQwen } = await import('../src/services/ai/qwen.service.js');

test('reports an unreachable Ollama as OLLAMA_UNREACHABLE', async () => {
  await assert.rejects(
    () => generateWithQwen('hello'),
    (error) => {
      assert.match(error.message, /^OLLAMA_UNREACHABLE: /);
      assert.ok(error.cause);
      return true;
    },
  );
});

test('reports a hung Ollama request as OLLAMA_TIMEOUT', async () => {
  const http = await import('node:http');
  const server = http.createServer(() => {
    // Never respond.
  });
  await new Promise((resolve) => server.listen(0, resolve));

  const { port } = server.address();
  process.env.OLLAMA_BASE_URL = `http://127.0.0.1:${port}`;
  const { generateWithQwen: generate } = await import(
    `../src/services/ai/qwen.service.js?timeout=${Date.now()}`
  );

  try {
    await assert.rejects(
      () => generate('hello', { timeoutMs: 200 }),
      (error) => {
        assert.match(error.message, /^OLLAMA_TIMEOUT: /);
        return true;
      },
    );
  } finally {
    server.closeAllConnections();
    server.close();
  }
});
