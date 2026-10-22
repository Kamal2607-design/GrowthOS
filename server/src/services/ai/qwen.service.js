const OLLAMA_BASE_URL =
  process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

const OLLAMA_MODEL =
  process.env.OLLAMA_MODEL || 'qwen3:4b';

// A small local model in JSON mode can occasionally loop and keep emitting
// tokens until the context is full (many minutes). Every call is therefore
// capped in length and time.
const DEFAULT_MAX_TOKENS = Number(process.env.OLLAMA_MAX_TOKENS) || 2048;
const REQUEST_TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS) || 120000;

/**
 * Calls Ollama's generate endpoint.
 *
 * `format` is 'json' or a JSON schema object (structured output, which
 * keeps the model to the expected shape). `maxTokens` caps the response.
 */
export async function generateWithQwen(
  prompt,
  {
    format = 'json',
    maxTokens = DEFAULT_MAX_TOKENS,
    timeoutMs = REQUEST_TIMEOUT_MS,
  } = {}
) {
  let response;

  try {
    response = await fetch(
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
          format,
          stream: false,
          options: {
            num_predict: maxTokens,
          },
        }),
        signal: AbortSignal.timeout(timeoutMs),
      }
    );
  } catch (cause) {
    if (cause?.name === 'TimeoutError') {
      throw new Error(
        `OLLAMA_TIMEOUT: no response within ${Math.round(timeoutMs / 1000)} seconds`,
        { cause }
      );
    }

    // Ollama is not running or not reachable.
    throw new Error(
      `OLLAMA_UNREACHABLE: ${cause.message}`,
      { cause }
    );
  }

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `OLLAMA_REQUEST_FAILED: ${errorText}`
    );
  }

  const data = await response.json();

  if (typeof data.response !== 'string') {
    throw new Error(
      'OLLAMA_INVALID_RESPONSE: response must be a string.'
    );
  }

  return {
    response: data.response,
    thinking: data.thinking || null,
    // "length" means the response hit maxTokens and is likely truncated.
    doneReason: data.done_reason ?? null,
  };
}
