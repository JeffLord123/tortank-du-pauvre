import { create } from 'zustand';

export type ToastKind = 'info' | 'success' | 'warning';

export interface Toast {
  id: string;
  kind: ToastKind;
  title: string;
  lines?: string[];
  createdAt: number;
}

interface ToastState {
  toasts: Toast[];
  push: (t: Omit<Toast, 'id' | 'createdAt'>) => string;
  dismiss: (id: string) => void;
}

let counter = 0;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (t) => {
    const id = `toast-${++counter}-${Date.now()}`;
    set((s) => ({ toasts: [...s.toasts, { ...t, id, createdAt: Date.now() }] }));
    return id;
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
