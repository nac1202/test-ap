import * as React from "react"
import { cn } from "../../lib/utils"
import { X } from "lucide-react"

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ isOpen, onClose, title, children, className }: ModalProps) {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Dialog Container */}
      <div className={cn("relative z-50 w-[95%] sm:w-full max-w-lg max-h-[90dvh] flex flex-col rounded-card bg-surface p-4 sm:p-6 shadow-lg my-auto overflow-hidden", className)}>
        {title ? (
          <div className="mb-4 flex items-center justify-between shrink-0 border-b border-gray-100 pb-3">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 pr-2">{title}</h2>
            <button 
              onClick={onClose} 
              className="rounded-full p-2 hover:bg-gray-100 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="閉じる"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        ) : (
          <button 
            onClick={onClose} 
            className="absolute right-3 top-3 rounded-full p-2 hover:bg-gray-100 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center z-10"
            aria-label="閉じる"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        )}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
