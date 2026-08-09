// ========== API Client（与后端 v2 DTO 对齐版） ==========
// 基于 fetch 的薄封装：自动附带 access token、自动 401 刷新、自动解包 {code,message,data}

import type {
  AuthTokens,
  Course,
  Exercise,
  Lesson,
  ListeningMaterial,
  SubmitResult,
  User,
  VocabularyItem,
  DashboardDTO,
  UserStats,
  ProgressByLevelRow,
  CoursesProgressRow,
  AttemptRow,
} from './types';

const API_BASE = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_BASE ?? '');

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.status = status;
    this.body = body;
    this.name = 'ApiError';
  }
}

// ===== token 持久化 =====
const ACCESS_KEY = 'langlearn:access';
const REFRESH_KEY = 'langlearn:refresh';
export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY);
}
export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}
export function setTokens(access: string, refresh: string): void {
  localStorage.setItem(ACCESS_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}
export function clearTokens(): void {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

// ===== refresh 锁 =====
let refreshPromise: Promise<string | null> | null = null;
async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    const refresh = getRefreshToken();
    if (!refresh) return null;
    try {
      const resp = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: refresh }),
      });
      if (!resp.ok) {
        clearTokens();
        return null;
      }
      const env = (await resp.json()) as {
        code: number;
        data: { accessToken: string; refreshToken?: string; user: User };
      };
      if (env.code !== 0) {
        clearTokens();
        return null;
      }
      setTokens(env.data.accessToken, env.data.refreshToken ?? refresh);
      return env.data.accessToken;
    } catch {
      clearTokens();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

// ===== 核心 fetch 封装 =====
interface Envelope {
  code: number;
  message: string;
  data: unknown;
}
function isEnvelope(v: unknown): v is Envelope {
  return (
    typeof v === 'object' &&
    v !== null &&
    'code' in (v as object) &&
    'message' in (v as object) &&
    'data' in (v as object)
  );
}

export async function apiRequest<T = unknown>(
  path: string,
  options: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const { auth = true, headers, ...rest } = options;
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;

  const run = async (): Promise<Response> => {
    let token: string | null = null;
    if (auth) token = getAccessToken();
    const reqHeaders: Record<string, string> = {
      Accept: 'application/json',
      ...(headers as Record<string, string> | undefined),
    };
    if (token) reqHeaders.Authorization = `Bearer ${token}`;
    if (rest.body && !reqHeaders['Content-Type']) {
      reqHeaders['Content-Type'] = 'application/json';
    }
    return fetch(url, { ...rest, headers: reqHeaders });
  };

  let resp = await run();

  // 401 → 尝试 refresh 一次
  if (auth && resp.status === 401 && !options.signal?.aborted) {
    const newToken = await refreshAccessToken();
    if (newToken) resp = await run();
  }

  let data: unknown = null;
  const text = await resp.text();
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }

  if (!resp.ok) {
    if (isEnvelope(data)) {
      const errs =
        data.data && typeof data.data === 'object' && 'errors' in (data.data as object)
          ? (data.data as { errors?: Record<string, string> }).errors
          : null;
      const msg =
        errs && Object.keys(errs).length > 0
          ? Object.entries(errs).map(([k, v]) => `${k}: ${v}`).join('；')
          : (data.message || `HTTP ${resp.status}`);
      throw new ApiError(msg, resp.status, data.data);
    }
    const msg =
      (data && typeof data === 'object' && 'error' in data && typeof (data as any).error === 'string')
        ? (data as any).error
        : (typeof data === 'string' ? data : `HTTP ${resp.status}`);
    throw new ApiError(msg, resp.status, data);
  }

  if (isEnvelope(data)) {
    if (data.code !== 0) {
      const msg =
        data.data && typeof data.data === 'object' && 'errors' in (data.data as object)
          ? Object.entries((data.data as { errors: Record<string, string> }).errors)
              .map(([k, v]) => `${k}: ${v}`).join('；')
          : data.message;
      throw new ApiError(msg, resp.status, data.data);
    }
    return data.data as T;
  }
  return data as T;
}

// ========== 业务 API ==========

// -- Identity --
export const authApi = {
  register(data: { email: string; password: string; nickname?: string }) {
    return apiRequest<AuthTokens>('/api/auth/register', {
      method: 'POST', body: JSON.stringify(data), auth: false,
    });
  },
  login(data: { email: string; password: string }) {
    return apiRequest<AuthTokens>('/api/auth/login', {
      method: 'POST', body: JSON.stringify(data), auth: false,
    });
  },
  me() {
    return apiRequest<{ user: User }>('/api/auth/me');
  },
  refresh(refreshToken: string) {
    return apiRequest<AuthTokens>('/api/auth/refresh', {
      method: 'POST', body: JSON.stringify({ refreshToken }), auth: false,
    });
  },
  logout(refreshToken: string) {
    return apiRequest<{ success: true }>('/api/auth/logout', {
      method: 'POST', body: JSON.stringify({ refreshToken }), auth: false,
    });
  },
};

// -- Course --
export const courseApi = {
  list(params: { language?: string; level?: string }) {
    const q = new URLSearchParams();
    if (params.language) q.set('language', params.language);
    if (params.level) q.set('level', params.level);
    const qs = q.toString();
    return apiRequest<Course[]>(`/api/courses${qs ? `?${qs}` : ''}`, { auth: false });
  },
  get(id: string) {
    return apiRequest<Course>(`/api/courses/${id}`, { auth: false });
  },
  getLessons(courseId: string) {
    return apiRequest<Lesson[]>(`/api/courses/${courseId}/lessons`, { auth: false });
  },
};

// -- Learning --
export const learningApi = {
  vocabulary(params: { level?: string; limit?: number; language?: string }) {
    const q = new URLSearchParams();
    if (params.level) q.set('level', params.level);
    if (params.limit != null) q.set('limit', String(params.limit));
    if (params.language) q.set('language', params.language);
    const qs = q.toString();
    return apiRequest<VocabularyItem[]>(
      `/api/learning/vocabulary${qs ? `?${qs}` : ''}`,
      { auth: false },
    );
  },
  listening(params: { level?: string; language?: string }) {
    const q = new URLSearchParams();
    if (params.level) q.set('level', params.level);
    if (params.language) q.set('language', params.language);
    const qs = q.toString();
    return apiRequest<ListeningMaterial[]>(
      `/api/learning/listening${qs ? `?${qs}` : ''}`,
      { auth: false },
    );
  },
  getExercise(id: string) {
    return apiRequest<Exercise>(`/api/learning/${id}`);
  },
  submitExercise(id: string, answer: string) {
    return apiRequest<SubmitResult>(`/api/learning/${id}/submit`, {
      method: 'POST', body: JSON.stringify({ answer }),
    });
  },
};

// -- Progress --
export const progressApi = {
  dashboard() {
    return apiRequest<DashboardDTO>('/api/progress/dashboard');
  },
  stats() {
    return apiRequest<UserStats>('/api/progress/stats');
  },
  byLevel() {
    return apiRequest<ProgressByLevelRow[]>('/api/progress/byLevel');
  },
  overview() {
    return apiRequest<CoursesProgressRow[]>('/api/progress');
  },
  course(courseId: string) {
    return apiRequest<CoursesProgressRow>(`/api/progress/detail/${courseId}`);
  },
  recent(limit = 10) {
    return apiRequest<AttemptRow[]>(`/api/progress/recent?limit=${limit}`);
  },
};
