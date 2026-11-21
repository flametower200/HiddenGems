'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

const ToastContext = createContext(null);
const TOAST_DURATION = 4500;
const MAX_TOASTS = 4;

function ToastIcon({ type }) {
  if (type === 'success') {
    return (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path d="m4 10 4 4 8-8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M10 2.5 18 17H2L10 2.5Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M10 7v4m0 2.5h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());
  const nextId = useRef(0);

  const dismiss = useCallback((id) => {
    window.clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback(({ type = 'success', message }) => {
    if (!message) return;
    const id = ++nextId.current;
    setToasts((current) => [...current, { id, type, message }].slice(-MAX_TOASTS));
    timers.current.set(id, window.setTimeout(() => dismiss(id), TOAST_DURATION));
  }, [dismiss]);

  useEffect(() => () => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current.clear();
  }, []);

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div className="toast-stack" role="region" aria-label="Notifiche" aria-live="polite">
        {toasts.map((toast) => (
          <div
            className={`toast toast--${toast.type}`}
            key={toast.id}
            role={toast.type === 'success' ? 'status' : 'alert'}
          >
            <ToastIcon type={toast.type} />
            <span>{toast.message}</span>
            <button type="button" onClick={() => dismiss(toast.id)} aria-label="Chiudi notifica">×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const notify = useContext(ToastContext);
  if (!notify) throw new Error('useToast deve essere utilizzato all’interno di ToastProvider.');
  return notify;
}
