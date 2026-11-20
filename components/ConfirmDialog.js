"use client";

import { useEffect, useId, useRef } from "react";

export default function ConfirmDialog({
  open = false,
  title = "Konfirmasi",
  description = "",
  confirmLabel = "Hapus",
  cancelLabel = "Batal",
  loading = false,
  onConfirm,
  onCancel,
}) {
  const titleId = useId();
  const descId = useId();
  const cancelRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    previousFocusRef.current = document.activeElement;
    const frameId = window.requestAnimationFrame(() => {
      cancelRef.current?.focus();
    });

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !loading) {
        event.preventDefault();
        onCancel?.();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frameId);
      document.removeEventListener("keydown", handleKeyDown);
      const prev = previousFocusRef.current;
      previousFocusRef.current = null;
      if (prev && typeof prev.focus === "function" && prev.isConnected) {
        prev.focus();
      }
    };
  }, [open, loading, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget && !loading) {
          onCancel?.();
        }
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        className="w-full max-w-md rounded-lg border border-white/15 bg-[#181818] p-6 text-white shadow-2xl"
      >
        <h2 id={titleId} className="text-lg font-bold text-white">
          {title}
        </h2>
        {description && (
          <p id={descId} className="mt-2 text-sm leading-relaxed text-white/75">
            {description}
          </p>
        )}
        <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="inline-flex min-h-[44px] items-center justify-center rounded-[4px] border border-white/25 bg-white/5 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white/15 motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex min-h-[44px] items-center justify-center rounded-[4px] bg-[#E50914] px-5 py-2 text-sm font-bold text-white transition hover:bg-[#f40612] motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Memproses..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
