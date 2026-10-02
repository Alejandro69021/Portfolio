import { useState, useEffect } from 'preact/hooks';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export let showToast: (message: string, type?: 'success' | 'error' | 'info') => void = () => {};

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
      const id = Math.random().toString(36).slice(2);
      setToasts((prev) => [...prev, { id, type, message }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    };
  }, []);

  return (
    <div class="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          class={`pointer-events-auto p-4 border font-mono text-xs flex items-center justify-between shadow-lg transition-all animate-bounce-subtle ${
            toast.type === 'success'
              ? 'bg-[#1C1917] text-[#FBFBF9] border-[#EA580C]'
              : toast.type === 'error'
              ? 'bg-red-900 text-white border-red-500'
              : 'bg-white text-[#1C1917] border-[#E7E5E4]'
          }`}
        >
          <div class="flex items-center gap-2">
            <span>{toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ'}</span>
            <span>{toast.message}</span>
          </div>
          <button
            onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
            class="text-[#78716C] hover:text-white ml-3"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
