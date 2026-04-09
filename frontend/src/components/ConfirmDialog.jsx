import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export default function ConfirmDialog({
  open,
  title,
  message,
  icon,
  confirmLabel = 'Confirm',
  confirmTone = 'danger',
  confirmIcon,
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  busy = false,
}) {
  useEffect(() => {
    if (!open || typeof document === 'undefined') return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="confirm-dialog-overlay" onClick={e => e.target === e.currentTarget && onCancel?.()}>
      <div className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
        <button type="button" className="confirm-dialog__close" onClick={onCancel} aria-label="Close dialog">
          <X size={16} />
        </button>
        <div className="confirm-dialog__icon">{icon}</div>
        <h2 id="confirm-dialog-title" className="confirm-dialog__title">{title}</h2>
        <p className="confirm-dialog__message">{message}</p>
        <div className="confirm-dialog__actions">
          <button type="button" className="btn btn--ghost confirm-dialog__cancel" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn ${confirmTone === 'danger' ? 'btn--danger' : 'btn--primary'} confirm-dialog__confirm`}
            onClick={onConfirm}
            disabled={busy}
          >
            {confirmIcon}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}