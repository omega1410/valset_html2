import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: number;
  email: string;
  full_name: string;
  first_name?: string;
  last_name?: string;
  birthday?: string;
  role: string;
  avatar?: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  setAuth: (token: string, user: User) => void;
  updateUser: (user: Partial<User>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      isAdmin: false,
      setAuth: (token, user) => {
        console.log('Saving to store:', user);
        localStorage.setItem('token', token);
        set({ token, user, isAuthenticated: true, isAdmin: user.role === 'admin' });
      },
      updateUser: (userData) => set((state) => ({
        user: state.user ? { ...state.user, ...userData } : null
      })),
      logout: () => set({ token: null, user: null, isAuthenticated: false, isAdmin: false }),
    }),
    { name: 'auth-storage' }
  )
);