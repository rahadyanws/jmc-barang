import { cn } from '@/lib/utils';

export interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function TableSkeleton({ rows = 5, columns = 4, className }: TableSkeletonProps) {
  return (
    <div
      aria-hidden
      className={cn('space-y-2 rounded-[6px] border border-[#E4E8EF] bg-white p-3', className)}
    >
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-3">
          {Array.from({ length: columns }).map((__, columnIndex) => (
            <div
              key={columnIndex}
              className="h-4 flex-1 animate-pulse rounded bg-[#E4E8EF]"
              style={{ animationDelay: `${(rowIndex * columns + columnIndex) * 40}ms` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
