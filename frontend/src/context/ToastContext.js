import { createContext, useCallback, useContext, useState } from 'react';

export const ToastContext = createContext();

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const show = useCallback((msg, type = 'success') => {
    const id = ++toastId;
    setToasts((p) => [...p, { id, msg, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3000);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            {t.type === 'success' ? '✓' : '✕'} {t.msg}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);