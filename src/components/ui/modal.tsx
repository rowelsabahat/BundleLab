"use client";
import { Dialog } from "radix-ui";
import { X } from "lucide-react";
import { useRef, type ReactNode } from "react";
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  wide = false,
  drawer = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  children: ReactNode;
  wide?: boolean;
  drawer?: boolean;
}) {
  const opener = useRef<HTMLElement | null>(null);
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content
          className={`modal-content ${wide ? "modal-wide" : ""} ${drawer ? "selection-drawer" : ""}`}
          onOpenAutoFocus={() => {
            opener.current =
              document.activeElement instanceof HTMLElement
                ? document.activeElement
                : null;
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            opener.current?.focus();
          }}
        >
          <div className="modal-heading">
            <div>
              <Dialog.Title className="text-xl font-semibold tracking-tight">
                {title}
              </Dialog.Title>
              <Dialog.Description className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {description}
              </Dialog.Description>
            </div>
            <Dialog.Close className="icon-button" aria-label="Close dialog">
              <X size={20} />
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
