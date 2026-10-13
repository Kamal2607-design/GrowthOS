const OLLAMA_BASE_URL =
  process.env.OLLAMA_BASE_URL ||
  'http://localhost:11434';

const EMBEDDING_MODEL =
  process.env.OLLAMA_EMBEDDING_MODEL ||
  'nomic-embed-text';

export async function generateEmbedding(text) {
  if (
    !text ||
    typeof text !== 'string' ||
    !text.trim()
  ) {
    throw new Error(
      'EMBEDDING_TEXT_REQUIRED'
    );
  }

  const response = await fetch(
    `${OLLAMA_BASE_URL}/api/embed`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: text.trim(),
      }),
    }
  );

  if (!response.ok) {
    const errorText =
      await response.text();

    throw new Error(
      `OLLAMA_EMBEDDING_REQUEST_FAILED: ${errorText}`
    );
  }

  const data =
    await response.json();

  if (
    !data.embeddings ||
    !Array.isArray(data.embeddings) ||
    !Array.isArray(data.embeddings[0])
  ) {
    throw new Error(
      'OLLAMA_INVALID_EMBEDDING_RESPONSE'
    );
  }

  const embedding =
    data.embeddings[0];

  if (embedding.length !== 768) {
    throw new Error(
      `INVALID_EMBEDDING_DIMENSIONS: expected 768, received ${embedding.length}`
    );
  }

  return {
    embedding,
    model: EMBEDDING_MODEL,
    dimensions: embedding.length,
  };
}