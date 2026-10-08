import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'success', duration = 3500) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-container" style={{
        position: 'fixed',
        bottom: '1.5rem',
        right: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.6rem',
        zIndex: 9999,
        maxWidth: '380px',
        width: 'calc(100% - 3rem)',
        pointerEvents: 'none'
      }}>
        {toasts.map((toast) => {
          let bg = 'var(--bg-secondary)';
          let border = 'var(--color-border)';
          let icon = <Info size={18} style={{ color: '#38bdf8', flexShrink: 0 }} />;

          if (toast.type === 'success') {
            border = 'var(--color-accent)';
            icon = <CheckCircle2 size={18} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />;
          } else if (toast.type === 'error') {
            border = 'var(--color-danger)';
            icon = <AlertCircle size={18} style={{ color: 'var(--color-danger)', flexShrink: 0 }} />;
          } else if (toast.type === 'warning') {
            border = 'var(--color-warning)';
            icon = <AlertCircle size={18} style={{ color: 'var(--color-warning)', flexShrink: 0 }} />;
          }

          return (
            <div
              key={toast.id}
              className="toast-item"
              style={{
                pointerEvents: 'auto',
                backgroundColor: bg,
                border: `1px solid ${border}`,
                borderRadius: '8px',
                padding: '0.85rem 1rem',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.4)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                color: 'var(--text-primary)',
                fontSize: '0.82rem',
                lineHeight: 1.4,
                animation: 'toastSlideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
            >
              {icon}
              <div style={{ flex: 1, wordBreak: 'break-word' }}>{toast.message}</div>
              <button
                onClick={() => removeToast(toast.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'color 0.15s'
                }}
                title="Stäng"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    // Return a graceful fallback if used outside provider
    return { showToast: (msg) => console.log('Toast:', msg) };
  }
  return context;
}
