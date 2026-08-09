// ========== 全局鉴权状态 ==========
// zustand store：管理 user、tokens、登录注册登出、401 自动清理
import { create } from 'zustand';
import { authApi, clearTokens, setTokens } from './api';
import type { User } from './types';

interface AuthState {
  user: User | null;
  isAuthed: boolean;
  loading: boolean;

  // 初始化（刷新页面时从 localStorage 恢复 + 拉取 me）
  init: () => Promise<void>;
  // 操作
  register: (payload: { email: string; password: string; nickname?: string }) => Promise<User>;
  login: (payload: { email: string; password: string }) => Promise<User>;
  logout: () => Promise<void>;
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  isAuthed: false,
  loading: true,

  init: async () => {
    try {
      const resp = await authApi.me();
      set({ user: resp.user, isAuthed: true, loading: false });
    } catch {
      // 401 或网络错误：清除本地 token，标记未登录
      clearTokens();
      set({ user: null, isAuthed: false, loading: false });
    }
  },

  register: async (payload) => {
    const data = await authApi.register(payload);
    setTokens(data.accessToken, data.refreshToken);
    set({ user: data.user, isAuthed: true });
    return data.user;
  },

  login: async (payload) => {
    const data = await authApi.login(payload);
    setTokens(data.accessToken, data.refreshToken);
    set({ user: data.user, isAuthed: true });
    return data.user;
  },

  logout: async () => {
    // 尝试调用后端登出，失败也无妨
    try {
      const REFRESH_KEY = 'langlearn:refresh';
      const ref = localStorage.getItem(REFRESH_KEY);
      if (ref) await authApi.logout(ref);
    } catch {
      /* ignore */
    }
    clearTokens();
    set({ user: null, isAuthed: false });
  },
}));
