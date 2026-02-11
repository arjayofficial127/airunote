'use client';

import { useState, useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

let toastListeners: ((toasts: Toast[]) => void)[] = [];
let toasts: Toast[] = [];

function notify() {
  toastListeners.forEach((listener) => listener([...toasts]));
}

export function toast(message: string | unknown, type: ToastType = 'info', duration = 3000) {
  // Ensure message is always a string
  let messageString: string;
  if (typeof message === 'string') {
    messageString = message;
  } else if (message && typeof message === 'object') {
    // Handle error objects with message property
    if ('message' in message && typeof (message as any).message === 'string') {
      messageString = (message as any).message;
    } else {
      // Fallback: convert object to string
      messageString = JSON.stringify(message);
    }
  } else {
    messageString = String(message || 'An error occurred');
  }

  const id = Math.random().toString(36).substring(7);
  const newToast: Toast = { id, message: messageString, type, duration };

  toasts = [...toasts, newToast];
  notify();

  if (duration > 0) {
    setTimeout(() => {
      toasts = toasts.filter((t) => t.id !== id);
      notify();
    }, duration);
  }

  return id;
}

export function dismissToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  notify();
}

export function useToast() {
  const [currentToasts, setCurrentToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const listener = (newToasts: Toast[]) => {
      setCurrentToasts(newToasts);
    };

    toastListeners.push(listener);
    setCurrentToasts([...toasts]);

    return () => {
      toastListeners = toastListeners.filter((l) => l !== listener);
    };
  }, []);

  return currentToasts;
}

export function ToastContainer() {
  const toasts = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`min-w-[300px] max-w-md px-4 py-3 rounded-lg shadow-lg flex items-center justify-between ${
            toast.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : toast.type === 'error'
              ? 'bg-red-50 border border-red-200 text-red-800'
              : toast.type === 'warning'
              ? 'bg-yellow-50 border border-yellow-200 text-yellow-800'
              : 'bg-blue-50 border border-blue-200 text-blue-800'
          }`}
        >
          <p className="text-sm font-medium">{String(toast.message || '')}</p>
          <button
            onClick={() => dismissToast(toast.id)}
            className="ml-4 text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

