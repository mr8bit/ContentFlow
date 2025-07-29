import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { isVideoFile } from './utils';

interface FullscreenMediaModalProps {
  mediaUrl: string | null;
  onClose: () => void;
}

export const FullscreenMediaModal = React.memo<FullscreenMediaModalProps>(({ mediaUrl, onClose }) => {
  // Обработка клавиши Escape
  useEffect(() => {
    if (!mediaUrl) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    
    // Блокируем скролл body при открытом модальном окне
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [mediaUrl, onClose]);

  if (!mediaUrl) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    console.log('Backdrop clicked', e.target, e.currentTarget);
    // Проверяем, что клик был именно по backdrop, а не по дочерним элементам
    if (e.target === e.currentTarget) {
      e.preventDefault();
      e.stopPropagation();
      console.log('Closing via backdrop');
      onClose();
    }
  };

  const handleCloseClick = (e: React.MouseEvent) => {
    console.log('Close button clicked');
    e.preventDefault();
    e.stopPropagation();
    onClose();
  };

  const handleCloseButtonMouseDown = (e: React.MouseEvent) => {
    console.log('Close button mouse down');
    e.preventDefault();
    e.stopPropagation();
  };

  const handleVideoClick = (e: React.MouseEvent) => {
    // Останавливаем всплытие события, чтобы backdrop не перехватывал клики по видео
    e.stopPropagation();
  };

  const handleVideoInteraction = (e: React.MouseEvent) => {
    // Останавливаем всплытие для всех взаимодействий с видео
    e.stopPropagation();
  };



  const modalContent = (
    <div 
      className="fixed inset-0 bg-black/90 flex items-center justify-center p-2 sm:p-4"
      style={{ zIndex: 99999 }}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label="Полноэкранный просмотр медиа"
    >
      {/* Кнопка закрытия вне контейнера медиа */}
      <button
        onClick={handleCloseClick}
        onMouseDown={handleCloseButtonMouseDown}
        onDoubleClick={() => { console.log('Double click on close button'); onClose(); }}
        className="absolute top-2 right-2 sm:top-4 sm:right-4 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 sm:p-2 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
        aria-label="Закрыть"
        type="button"
        style={{ zIndex: 999999, pointerEvents: 'auto', position: 'fixed' }}
      >
        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      
      <div 
        className="relative max-w-full max-h-full"
        onClick={(e) => e.stopPropagation()}
      >
        {isVideoFile(mediaUrl) ? (
          <video 
            className="max-w-full max-h-full object-contain"
            controls
            autoPlay
            poster={mediaUrl}
            onClick={handleVideoClick}
            onMouseDown={handleVideoInteraction}
            onMouseUp={handleVideoInteraction}
            onMouseMove={handleVideoInteraction}
            style={{ pointerEvents: 'auto' }}
          >
            <source src={mediaUrl} />
          </video>
        ) : (
          <img 
            src={mediaUrl} 
            alt="Полноэкранный просмотр"
            className="max-w-full max-h-full object-contain"
            draggable={false}
          />
        )}
      </div>
    </div>
  );

  // Используем Portal для рендеринга модального окна вне DOM-дерева родительского компонента
  return createPortal(modalContent, document.body);
});

FullscreenMediaModal.displayName = 'FullscreenMediaModal';