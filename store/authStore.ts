import { create } from 'zustand';

interface AuthState {
  id: string | null;
  nombre: string | null;
  rol: string | null;
  isLoggedIn: boolean;
  login: (id: string, nombre: string, rol: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  id: null,
  nombre: null,
  rol: null,
  isLoggedIn: false,
  login: (id, nombre, rol) => set({ id, nombre, rol, isLoggedIn: true }),
  logout: () => set({ id: null, nombre: null, rol: null, isLoggedIn: false }),
}));
