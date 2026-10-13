'use client';

import { Download, Paperclip, Trash2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/shared/button';
import { apiErrorMessage } from '@/lib/form-errors';
import { messages } from '@/lib/messages';
import { cn } from '@/lib/utils';
import { resolveAttachmentUrl, getIncomingGoodsAttachment } from '../api';
import {
  useDeleteIncomingGoodsAttachment,
  useUploadIncomingGoodsAttachment,
} from '../hooks';

function formatFileSize(size: number): string {
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export interface AttachmentPanelProps {
  transactionId: string;
  attachment: { fileName: string; size: number } | null;
}

/** BR-19 / AS-12: panel lampiran pada form edit (unduh via signed URL, hapus, ganti). */
export function AttachmentPanel({ transactionId, attachment }: AttachmentPanelProps) {
  const upload = useUploadIncomingGoodsAttachment();
  const remove = useDeleteIncomingGoodsAttachment();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleDownload(): Promise<void> {
    setBusy(true);
    try {
      const result = await getIncomingGoodsAttachment(transactionId);
      window.open(resolveAttachmentUrl(result.url), '_blank', 'noopener,noreferrer');
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(): Promise<void> {
    setBusy(true);
    try {
      await remove.mutateAsync(transactionId);
      toast.success(messages.deleteAttachmentOk);
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file == null) {
      return;
    }
    setBusy(true);
    try {
      await upload.mutateAsync({ id: transactionId, file });
      toast.success(messages.uploadOk);
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-[6px] border border-[#E4E8EF] bg-[#F8FAFC] p-4">
      <div className="mb-2 flex items-center gap-2">
        <Paperclip className="h-4 w-4 text-[#6B7280]" aria-hidden />
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-[#6B7280]">
          {messages.attachmentSection}
        </h3>
      </div>

      {attachment != null ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[#1F2937]">
              {attachment.fileName}
            </p>
            <p className="text-xs text-[#6B7280]">{formatFileSize(attachment.size)}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => void handleDownload()}
              isLoading={busy}
            >
              <Download className="h-4 w-4" aria-hidden />
              {messages.downloadAttachment}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void handleDelete()}
              isLoading={remove.isPending}
              className={cn('text-red-600 hover:bg-red-50')}
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              {messages.deleteAttachment}
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-[#6B7280]">{messages.attachmentEmpty}</p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept=".doc,.docx,.zip,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/zip"
          className="sr-only"
          onChange={(event) => void handleFileChange(event)}
        />
        <Button
          type="button"
          variant="secondary"
          onClick={() => fileInputRef.current?.click()}
          isLoading={upload.isPending}
        >
          <Upload className="h-4 w-4" aria-hidden />
          {attachment != null ? messages.replaceAttachment : messages.uploadAttachment}
        </Button>
        <p className="text-xs text-[#6B7280]">{messages.attachmentHint}</p>
      </div>
    </div>
  );
}
