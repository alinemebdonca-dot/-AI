import React, { useEffect } from 'react';
import { ToastMessage } from '../types';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

interface ToastContainerProps {
  toasts: ToastMessage[];
  removeToast: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, removeToast }) => {
  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(toast => (
        <Toast key={toast.id} {...toast} onRemove={() => removeToast(toast.id)} />
      ))}
    </div>
  );
};

const Toast: React.FC<ToastMessage & { onRemove: () => void }> = ({ message, type, onRemove }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove();
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const bgColors = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    info: 'bg-gray-800'
  };

  const icons = {
    success: <CheckCircle size={18} />,
    error: <AlertCircle size={18} />,
    info: <Info size={18} />
  };

  return (
    <div className={`pointer-events-auto ${bgColors[type]} text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-3 min-w-[300px] justify-between animate-in fade-in slide-in-from-top-4 duration-300`}>
      <div className="flex items-center gap-2">
        {icons[type]}
        <span className="font-medium text-sm">{message}</span>
      </div>
      <button onClick={onRemove} className="opacity-80 hover:opacity-100">
        <X size={14} />
      </button>
    </div>
  );
};