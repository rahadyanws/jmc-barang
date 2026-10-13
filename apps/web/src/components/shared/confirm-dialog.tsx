'use client';

import { Loader2 } from 'lucide-react';

import { Dialog } from './dialog';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDanger?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Ya, lanjutkan',
  cancelLabel = 'Batal',
  isDanger = false,
  isLoading = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={isLoading ? () => undefined : onClose}
      title={title}
      maxWidth="max-w-sm"
      closeOnBackdrop={!isLoading}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="h-9 rounded-[6px] border border-[#E4E8EF] bg-white px-4 text-sm font-medium text-[#1F2937] transition hover:bg-[#F4F6FA] disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            data-dialog-initial-focus
            className={
              isDanger
                ? 'inline-flex h-9 items-center gap-2 rounded-[6px] bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50'
                : 'inline-flex h-9 items-center gap-2 rounded-[6px] bg-[#337DA0] px-4 text-sm font-semibold text-white transition hover:bg-[#2A6582] disabled:opacity-50'
            }
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm text-[#1F2937]">{message}</p>
    </Dialog>
  );
}
