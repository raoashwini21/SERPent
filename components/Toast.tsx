'use client';

import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

const COLORS: Record<ToastType, { bg: string; border: string; text: string; icon: string }> = {
  success: { bg: '#F0FDF4', border: '#22C55E', text: '#166534', icon: '✓' },
  error:   { bg: '#FEF2F2', border: '#EF4444', text: '#991B1B', icon: '✗' },
  warning: { bg: '#FFFBEB', border: '#F59E0B', text: '#92400E', icon: '⚠' },
  info:    { bg: '#F5F3FF', border: '#6C5CE7', text: '#4C1D95', icon: 'ℹ' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = ++nextId.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => {
          const c = COLORS[t.type];
          return (
            <div
              key={t.id}
              className="toast-enter flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-lg text-sm font-medium max-w-xs pointer-events-auto"
              style={{ backgroundColor: c.bg, borderColor: c.border, color: c.text }}
            >
              <span className="font-bold shrink-0">{c.icon}</span>
              <span>{t.message}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
