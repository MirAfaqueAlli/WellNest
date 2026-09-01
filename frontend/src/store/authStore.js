import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
      // Call this on app mount to ensure user data is always fresh
      refreshUser: async () => {
        const token = get().token;
        if (!token) return;
        try {
          const res = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            set({ user: data.user });
          } else {
            // Token invalid — force logout
            set({ token: null, user: null });
          }
        } catch { /* network error, keep existing */ }
      },
    }),
    { name: 'wellnest-auth' }
  )
);
