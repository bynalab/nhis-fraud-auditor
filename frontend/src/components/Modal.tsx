import { ReactNode, useEffect } from "react";

type ModalProps = {
  isOpen: boolean;
  title?: ReactNode;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmDisabled?: boolean;
  children?: ReactNode;
  widthPx?: number;
};

export default function Modal({
  isOpen,
  title,
  onConfirm,
  onCancel,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmDisabled = false,
  children,
  widthPx = 960,
}: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/45 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel?.();
      }}
    >
      <div
        className="bg-white rounded-xl shadow-2xl flex flex-col max-h-[80vh] w-full"
        style={{ width: `min(100%, ${widthPx}px)` }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div className="font-semibold">{title}</div>
          <div className="flex gap-2">
            {onConfirm && (
              <button
                onClick={onConfirm}
                disabled={confirmDisabled}
                className="px-3 py-1.5 rounded bg-blue-600 text-white disabled:opacity-50 cursor-pointer"
              >
                {confirmLabel}
              </button>
            )}
            {onCancel && (
              <button
                onClick={onCancel}
                className="px-3 py-1.5 rounded border border-gray-300 cursor-pointer"
              >
                {cancelLabel}
              </button>
            )}
          </div>
        </div>
        <div className="p-4 overflow-auto">{children}</div>
      </div>
    </div>
  );
}
