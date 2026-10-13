import { Inbox } from 'lucide-react';

export interface EmptyStateProps {
  message?: string;
}

export function EmptyState({ message = 'Belum ada data' }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <Inbox className="h-8 w-8 text-[#9CA3AF]" aria-hidden />
      <p className="text-sm text-[#6B7280]">{message}</p>
    </div>
  );
}
