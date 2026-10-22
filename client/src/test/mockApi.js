import { vi } from 'vitest';

/**
 * Stubs global fetch with route handlers keyed by "METHOD /path".
 * A handler returns { status, body } (status defaults to 200) or a body.
 * Every call is recorded in `calls` as { method, path, body, headers }.
 */
export function mockApi(routes) {
  const calls = [];

  const fetchMock = vi.fn(async (input, init = {}) => {
    const method = (init.method || 'GET').toUpperCase();
    const path = String(input);
    const key = `${method} ${path}`;

    let body = init.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        // keep raw string
      }
    }

    calls.push({ method, path, body, headers: init.headers ?? {}, init });

    const handler = routes[key];

    if (!handler) {
      return new Response(JSON.stringify({ message: `No mock for ${key}` }), { status: 404 });
    }

    const result = typeof handler === 'function' ? await handler({ body, calls }) : handler;
    const hasEnvelope = result && typeof result === 'object' && 'status' in result && 'body' in result;
    const status = hasEnvelope ? result.status : 200;
    const payload = hasEnvelope ? result.body : result;

    return new Response(payload === undefined ? '' : JSON.stringify(payload), { status });
  });

  vi.stubGlobal('fetch', fetchMock);

  return {
    calls,
    called: (key) => calls.filter((call) => `${call.method} ${call.path}` === key),
  };
}
