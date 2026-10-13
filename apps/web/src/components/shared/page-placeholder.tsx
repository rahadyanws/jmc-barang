import { Construction } from 'lucide-react';

export function PagePlaceholder({ title, milestone }: { title: string; milestone: string }) {
  return (
    <div className="rounded-[6px] border border-[#E4E8EF] bg-white p-8 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-[#6B7280]">PT JMC Indonesia</p>
      <h1 className="mt-1 text-xl font-semibold text-[#1F2937]">{title}</h1>
      <div className="mt-6 flex items-start gap-3 rounded-[6px] border border-[#E4E8EF] bg-[#F4F6FA] p-4">
        <Construction className="mt-0.5 h-5 w-5 shrink-0 text-[#B7791F]" aria-hidden />
        <p className="text-sm text-[#1F2937]">
          Halaman ini sedang disiapkan dan akan tersedia pada milestone {milestone}.
        </p>
      </div>
    </div>
  );
}
