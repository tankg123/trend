import { ChevronLeft, ChevronRight } from "lucide-react";

export default function PaginationFooter({ total, page, pageSize, onPageChange, onPageSizeChange }) {
  const pageCount = Math.max(1, Math.ceil(Number(total || 0) / Number(pageSize || 20)));
  const safePage = Math.min(Math.max(1, Number(page || 1)), pageCount);
  const start = total ? (safePage - 1) * pageSize + 1 : 0;
  const end = Math.min(total, safePage * pageSize);

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 px-5 py-4 border-t border-slate-100 bg-white">
      <div className="flex items-center gap-3 text-sm text-slate-500">
        <span>Show</span>
        <select
          value={pageSize}
          onChange={(event) => {
            onPageSizeChange(Number(event.target.value));
            onPageChange(1);
          }}
          className="rounded-2xl border border-slate-300 bg-white px-4 py-3 font-bold text-slate-700 outline-none"
        >
          {[20, 50, 100].map((value) => (
            <option key={value} value={value}>{value}</option>
          ))}
        </select>
        <span>items</span>
        <span className="text-slate-300">-</span>
        <span>{start}-{end} / {total}</span>
      </div>

      <div className="flex items-center gap-3 text-sm text-slate-600">
        <button
          type="button"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 font-bold disabled:opacity-50"
        >
          <ChevronLeft size={16} />
          Previous
        </button>
        <span>Page</span>
        <input
          type="number"
          min="1"
          max={pageCount}
          value={safePage}
          onChange={(event) => onPageChange(Math.min(Math.max(1, Number(event.target.value || 1)), pageCount))}
          className="w-16 rounded-xl border border-slate-300 px-3 py-2.5 text-center font-bold outline-none"
        />
        <span>/ {pageCount}</span>
        <button
          type="button"
          disabled={safePage >= pageCount}
          onClick={() => onPageChange(safePage + 1)}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 font-bold disabled:opacity-50"
        >
          Next
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
