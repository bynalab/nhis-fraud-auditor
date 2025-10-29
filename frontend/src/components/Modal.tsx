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
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 16,
      }}
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel?.();
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 10,
          width: `min(100%, ${widthPx}px)`,
          maxHeight: "80vh",
          boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 16px",
            borderBottom: "1px solid #eee",
          }}
        >
          <div style={{ fontWeight: 600 }}>{title}</div>
          <div style={{ display: "flex", gap: 8 }}>
            {onConfirm && (
              <button onClick={onConfirm} disabled={confirmDisabled}>
                {confirmLabel}
              </button>
            )}
            {onCancel && <button onClick={onCancel}>{cancelLabel}</button>}
          </div>
        </div>
        <div style={{ padding: 16, overflow: "auto" }}>{children}</div>
      </div>
    </div>
  );
}
