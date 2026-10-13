import React, { useEffect } from 'react';

export default function Modal({
  onClose,
  title,
  children,
  contentClassName = 'modal',
}) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const handleOverlayClick = (event) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay active" onClick={handleOverlayClick}>
      <div
        className={contentClassName}
        onClick={(event) => event.stopPropagation()}
      >
        {title && <div className="modal-title">{title}</div>}
        {children}
      </div>
    </div>
  );
}