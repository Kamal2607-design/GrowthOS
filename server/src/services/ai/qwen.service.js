const OLLAMA_BASE_URL =
  process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

const OLLAMA_MODEL =
  process.env.OLLAMA_MODEL || 'qwen3:4b';

export async function generateWithQwen(prompt) {
  const response = await fetch(
    `${OLLAMA_BASE_URL}/api/generate`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        think: false,
        format: "json",
        stream: false,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `OLLAMA_REQUEST_FAILED: ${errorText}`
    );
  }

  const data = await response.json();

  return {
    response: data.response,
    thinking: data.thinking || null,
  };
}