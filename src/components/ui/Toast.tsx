'use client';

import React from 'react';
import { useToast, Toast } from '@/contexts/ToastContext';
import Icon from './Icon';

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
    success: "bg-white dark:bg-dark-note border-l-4 border-semantic-success",
    error: "bg-white dark:bg-dark-note border-l-4 border-semantic-error",
    info: "bg-white dark:bg-dark-note border-l-4 border-semantic-info"
  };

  const iconClasses = {
    success: "text-semantic-success",
    error: "text-semantic-error",
    info: "text-semantic-info"
  };

  const icons = {
    success: <Icon name="check" size="md" ariaLabel="Success" decorative />,
    error: <Icon name="close" size="md" ariaLabel="Error" decorative />,
    info: <Icon name="info" size="md" ariaLabel="Info" decorative />
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
        <p className="text-sm font-medium text-light-text dark:text-dark-text">
          {toast.message}
        </p>
      </div>

      {/* Close button */}
      <button
        onClick={onRemove}
        className="flex-shrink-0 text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text dark:hover:text-dark-text transition-colors"
        aria-label="Close notification"
      >
        <Icon name="close" size="sm" ariaLabel="Close notification" />
      </button>
    </div>
  );
}
