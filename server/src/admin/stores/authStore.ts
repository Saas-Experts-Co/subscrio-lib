import { create } from 'zustand';
import { apiClient } from '@/lib/apiClient';

interface AuthState {
  isAuthenticated: boolean;
  login: (passphrase: string) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: apiClient.isAuthenticated(),

  login: async (passphrase: string) => {
    try {
      await apiClient.auth.login(passphrase);
      set({ isAuthenticated: true });
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  },

  logout: () => {
    apiClient.auth.logout();
    set({ isAuthenticated: false });
  },

  checkAuth: () => {
    set({ isAuthenticated: apiClient.isAuthenticated() });
  }
}));

