"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Native <dialog> as a controlled modal: Esc and a click on the backdrop call `onClose`. */
export function Modal({
  open,
  onClose,
  title,
  actions,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onClick={(e) => e.target === dialog.current && onClose()} // click on the backdrop
      className="m-auto w-[min(48rem,92vw)] rounded-lg bg-white p-4 text-zinc-900 backdrop:bg-black/50 dark:bg-zinc-900 dark:text-zinc-100"
    >
      {open && (
        <>
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <h2 className="font-semibold">{title}</h2>
            <span className="flex items-center gap-2">
              {actions}
              <button type="button" onClick={onClose} className="rounded border border-zinc-300 px-2 py-0.5 text-xs dark:border-zinc-700">
                Close
              </button>
            </span>
          </div>
          {children}
        </>
      )}
    </dialog>
  );
}
