'use client';

import React from 'react';
import { useToast, Toast } from '@/contexts/ToastContext';

export default function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onRemove={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}

interface ToastItemProps {
  toast: Toast;
  onRemove: () => void;
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const [isExiting, setIsExiting] = React.useState(false);

  React.useEffect(() => {
    // Start exit animation before removal
    if (toast.duration && toast.duration > 0) {
      const exitTimer = setTimeout(() => {
        setIsExiting(true);
      }, toast.duration - 300); // Start animation 300ms before removal

      return () => clearTimeout(exitTimer);
    }
  }, [toast.duration]);

  const baseClasses = "p-4 rounded-lg shadow-lg flex items-start gap-3 min-w-[300px] max-w-md transition-all duration-300 transform";

  const typeClasses = {
    success: "bg-white dark:bg-[#1E293B] border-l-4 border-green-500",
    error: "bg-white dark:bg-[#1E293B] border-l-4 border-red-500",
    info: "bg-white dark:bg-[#1E293B] border-l-4 border-blue-500"
  };

  const iconClasses = {
    success: "text-green-500",
    error: "text-red-500",
    info: "text-blue-500"
  };

  const icons = {
    success: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    error: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    info: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  };

  return (
    <div
      className={`${baseClasses} ${typeClasses[toast.type]} ${isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'}`}
    >
      {/* Icon */}
      <div className={`flex-shrink-0 ${iconClasses[toast.type]}`}>
        {icons[toast.type]}
      </div>

      {/* Message */}
      <div className="flex-1">
        <p className="text-sm font-medium text-[#1E293B] dark:text-[#F1F5F9]">
          {toast.message}
        </p>
      </div>

      {/* Close button */}
      <button
        onClick={onRemove}
        className="flex-shrink-0 text-[#64748B] dark:text-[#94A3B8] hover:text-[#1E293B] dark:hover:text-[#F1F5F9] transition-colors"
        aria-label="Close notification"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
