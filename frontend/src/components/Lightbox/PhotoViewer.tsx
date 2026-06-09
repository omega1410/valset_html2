import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';

interface PhotoViewerProps {
  photos: string[];
  initialIndex: number;
  onClose: () => void;
}

export const PhotoViewer = ({ photos, initialIndex, onClose }: PhotoViewerProps) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const isMobile = window.innerWidth < 768;

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const diff = touchStart - touchEnd;
    const minSwipeDistance = 50;
    
    if (Math.abs(diff) > minSwipeDistance) {
      if (diff > 0) {
        nextPhoto();
      } else {
        prevPhoto();
      }
    }
    
    setTouchStart(0);
    setTouchEnd(0);
  };

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') prevPhoto();
      if (e.key === 'ArrowRight') nextPhoto();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex]);

  const prevPhoto = () => {
    if (photos.length === 1) return;
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  const nextPhoto = () => {
    if (photos.length === 1) return;
    setCurrentIndex((prev) => (prev + 1) % photos.length);
  };

  const content = (
    <div 
      className="photo-viewer-container"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 999999,
        backdropFilter: 'blur(8px)',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Кнопка закрытия */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          color: 'white',
          fontSize: 24,
          background: 'rgba(0,0,0,0.5)',
          border: 'none',
          borderRadius: '50%',
          width: 40,
          height: 40,
          cursor: 'pointer',
          zIndex: 1000000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        ✕
      </button>

      {/* Стрелки только для десктопа */}
      {!isMobile && photos.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); prevPhoto(); }}
            style={{
              position: 'absolute',
              left: 20,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'white',
              fontSize: 40,
              background: 'rgba(0,0,0,0.5)',
              border: 'none',
              borderRadius: '50%',
              width: 50,
              height: 50,
              cursor: 'pointer',
              zIndex: 1000000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ←
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); nextPhoto(); }}
            style={{
              position: 'absolute',
              right: 20,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'white',
              fontSize: 40,
              background: 'rgba(0,0,0,0.5)',
              border: 'none',
              borderRadius: '50%',
              width: 50,
              height: 50,
              cursor: 'pointer',
              zIndex: 1000000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            →
          </button>
        </>
      )}

      {/* Индикатор номера фото */}
      {photos.length > 1 && (
        <div style={{
          position: 'absolute',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          color: 'white',
          fontSize: 14,
          background: 'rgba(0,0,0,0.6)',
          padding: '4px 12px',
          borderRadius: 20,
          zIndex: 1000000,
          backdropFilter: 'blur(4px)'
        }}>
          {currentIndex + 1} / {photos.length}
        </div>
      )}

      {/* Фото */}
      <img
        src={`/assets/${photos[currentIndex]}`}
        alt={`Фото ${currentIndex + 1}`}
        style={{
          maxWidth: '90vw',
          maxHeight: '90vh',
          width: 'auto',
          height: 'auto',
          objectFit: 'contain',
          zIndex: 999999
        }}
      />
    </div>
  );

  return createPortal(content, document.body);
};
