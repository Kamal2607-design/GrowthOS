/**
 * Thin client for the GrowthOS API.
 *
 * Every request sends the httpOnly auth cookie (credentials: 'include').
 * Non-2xx responses throw ApiError with the HTTP status and, when the
 * server provides one, a machine-readable code.
 */

const CODE_PATTERN = /^[A-Z][A-Z0-9_]+$/;

export class ApiError extends Error {
  constructor(status, body) {
    const code =
      body?.code ??
      (typeof body?.error === 'string' && CODE_PATTERN.test(body.error)
        ? body.error
        : null);

    const message =
      body?.message ??
      (typeof body?.error === 'string' && !CODE_PATTERN.test(body.error)
        ? body.error
        : null) ??
      `Request failed (${status})`;

    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.body = body;
  }
}

async function request(method, path, { json, body, headers = {} } = {}) {
  const init = {
    method,
    credentials: 'include',
    headers: { Accept: 'application/json', ...headers },
  };

  if (json !== undefined) {
    init.body = JSON.stringify(json);
    init.headers['Content-Type'] = 'application/json';
  } else if (body !== undefined) {
    init.body = body;
  }

  let response;

  try {
    response = await fetch(path, init);
  } catch {
    throw new ApiError(0, {
      message: 'Cannot reach the GrowthOS server. Check that it is running.',
    });
  }

  const text = await response.text();
  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }

  if (!response.ok) {
    throw new ApiError(response.status, data);
  }

  return data;
}

const get = (path) => request('GET', path);
const post = (path, json) => request('POST', path, { json });
const patch = (path, json) => request('PATCH', path, { json });
const del = (path) => request('DELETE', path);

/* Auth */

export async function fetchCurrentUser() {
  try {
    const data = await get('/api/auth/me');
    return data.user;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return null;
    }
    throw error;
  }
}

export const login = (email, password) =>
  post('/api/auth/login', { email, password }).then((data) => data.user);

export const register = ({ email, password, name }) =>
  post('/api/auth/register', { email, password, name }).then((data) => data.user);

export const logout = () => post('/api/auth/logout');

export const GOOGLE_SIGN_IN_URL = '/api/auth/google';

/* Daily growth */

export const fetchToday = () =>
  get('/api/daily-growth/today').then((data) => data.context);

export const generateSuggestions = () => post('/api/daily-growth/generate');

export const acceptSuggestion = (id) =>
  post(`/api/action-suggestions/${id}/accept`);

export const rejectSuggestion = (id) =>
  post(`/api/action-suggestions/${id}/reject`);

/* Actions */

export const setActionStatus = (id, status) =>
  patch(`/api/actions/${id}/status`, { status }).then((data) => data.action);

/* Vision */

export async function fetchVision() {
  try {
    const data = await get('/api/vision');
    return data.vision;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

export const saveVision = (fields, exists) =>
  (exists ? patch('/api/vision', fields) : post('/api/vision', fields)).then(
    (data) => data.vision,
  );

/* Goals */

export const fetchGoals = (status) =>
  get(`/api/goals${status ? `?status=${encodeURIComponent(status)}` : ''}`).then(
    (data) => data.goals,
  );

export const createGoal = (fields) =>
  post('/api/goals', fields).then((data) => data.goal);

export const updateGoal = (id, fields) =>
  patch(`/api/goals/${id}`, fields).then((data) => data.goal);

export const fetchGoalProgress = (id) =>
  get(`/api/goal-progress/${id}/progress`).then((data) => data.progress);

export const analyzeGoalProgress = (id) =>
  post(`/api/goal-progress/${id}/progress/analyze`).then((data) => data.aiAnalysis);

/* Reflections */

export const fetchReflections = () =>
  get('/api/reflections').then((data) => data.reflections);

export const createReflection = (fields) =>
  post('/api/reflections', fields).then((data) => data.reflection);

export const updateReflection = (id, fields) =>
  patch(`/api/reflections/${id}`, fields).then((data) => data.reflection);

export const analyzeReflection = (id) => post(`/api/reflections/${id}/analyze`);

/* Documents */

export const fetchDocuments = () =>
  get('/api/documents').then((data) => data.documents);

export const uploadDocument = (file) =>
  request('POST', '/api/documents/upload', {
    body: file,
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
      'X-File-Name': encodeURIComponent(file.name),
    },
  }).then((data) => data.document);

export const extractDocument = (id) =>
  post(`/api/documents/${id}/extract`).then((data) => data.document);

export const analyzeDocument = (id) => post(`/api/documents/${id}/analyze`);

export const generateDocumentCandidates = (id) =>
  post(`/api/documents/${id}/candidates`);

export const deleteDocument = (id) => del(`/api/documents/${id}`);

const CANDIDATE_ROUTES = {
  memory: { list: 'memories', accept: 'accept', reject: 'reject' },
  goal: { list: 'goals', accept: 'accept-goal', reject: 'reject-goal' },
  action: { list: 'actions', accept: 'accept-action', reject: 'reject-action' },
};

export const fetchDocumentCandidates = (documentId, kind) =>
  get(`/api/documents/${documentId}/candidates/${CANDIDATE_ROUTES[kind].list}`).then(
    (data) => data.candidates ?? [],
  );

export const decideDocumentCandidate = (kind, candidateId, accept) =>
  post(
    `/api/documents/candidates/${candidateId}/${
      CANDIDATE_ROUTES[kind][accept ? 'accept' : 'reject']
    }`,
  );

/* Memories */

export const fetchMemories = () =>
  get('/api/memories').then((data) => data.memories);

export const searchMemories = (query) =>
  post('/api/memories/search', { query }).then((data) => data.results);

export const createMemory = (fields) =>
  post('/api/memories', fields).then((data) => data.memory);

/* Actions (user-created) */

export const fetchActions = ({ status, goalId } = {}) => {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (goalId) params.set('goalId', String(goalId));
  const query = params.toString();
  return get(`/api/actions${query ? `?${query}` : ''}`).then((data) => data.actions);
};

export const createAction = (fields) =>
  post('/api/actions', fields).then((data) => data.action);

export const updateAction = (id, fields) =>
  patch(`/api/actions/${id}`, fields).then((data) => data.action);

export const deleteAction = (id) => del(`/api/actions/${id}`);

/* AI suggestions and planning */

export const fetchSuggestions = (status = 'pending') =>
  get(`/api/action-suggestions?status=${encodeURIComponent(status)}`).then(
    (data) => data.suggestions,
  );

export const generateGoalSuggestions = (goalId) =>
  post(`/api/action-suggestions/goals/${goalId}/generate`);

export const runActionPlanner = (query) => post('/api/action-planner', { query });

export const askGrowthOS = (query) => post('/api/rag', { query });

/* Other deletes and details */

export const deleteGoal = (id) => del(`/api/goals/${id}`);

export const deleteReflection = (id) => del(`/api/reflections/${id}`);

export const fetchDocumentAnalysis = (id) =>
  get(`/api/documents/${id}/analysis`).then((data) => data.analysis);

export const archiveMemory = (id) => patch(`/api/memories/${id}/archive`);

export const deleteMemory = (id) => del(`/api/memories/${id}`);

export const normalizeMemory = (id) => post(`/api/memories/${id}/normalize`);
