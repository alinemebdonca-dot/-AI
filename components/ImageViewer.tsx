import React, { useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface ImageViewerProps {
  imageUrl: string;
  isOpen: boolean;
  onClose: () => void;
  onNext?: () => void;
  onPrev?: () => void;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({ imageUrl, isOpen, onClose, onNext, onPrev }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && onNext) onNext();
      if (e.key === 'ArrowLeft' && onPrev) onPrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onNext, onPrev, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/95 flex flex-col items-center justify-center p-4">
      <button 
        onClick={onClose} 
        className="absolute top-4 right-4 text-white/70 hover:text-white p-2"
      >
        <X size={32} />
      </button>

      <div className="flex items-center gap-4 w-full h-full justify-center">
        {onPrev && (
          <button 
            onClick={(e) => { e.stopPropagation(); onPrev(); }} 
            className="p-4 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <ChevronLeft size={32} />
          </button>
        )}
        
        <div className="relative max-w-[90vw] max-h-[90vh]">
             <img 
                src={imageUrl} 
                alt="Preview" 
                className="max-w-full max-h-[90vh] object-contain rounded-md shadow-2xl"
             />
        </div>

        {onNext && (
          <button 
             onClick={(e) => { e.stopPropagation(); onNext(); }} 
             className="p-4 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <ChevronRight size={32} />
          </button>
        )}
      </div>
    </div>
  );
};