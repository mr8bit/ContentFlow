import React from 'react';
import { Dialog, DialogContent } from '../ui';
import { X as XIcon } from 'lucide-react';

interface FullscreenImageModalProps {
  imageUrl: string | null;
  onClose: () => void;
}

export function FullscreenImageModal({ imageUrl, onClose }: FullscreenImageModalProps): JSX.Element {
  if (!imageUrl) return <></>;

  return (
    <Dialog open={!!imageUrl} onOpenChange={onClose}>
      <DialogContent className="max-w-[98vw] sm:max-w-[95vw] max-h-[98vh] sm:max-h-[95vh] p-0 bg-black/90 border-none">
        <div className="relative w-full h-full flex items-center justify-center">
          <button
            onClick={onClose}
            className="absolute top-2 right-2 sm:top-4 sm:right-4 z-10 p-1.5 sm:p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
          >
            <XIcon className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
          <img
            src={imageUrl}
            alt="Полноэкранное изображение"
            className="max-w-full max-h-full object-contain"
            onClick={onClose}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}