import React from 'react';
import { Edit, Trash2 } from 'lucide-react';
import { RecordItem } from '@/types';
import { formatDate, formatTimeToAMPM } from '@/utils/dashboardHelpers';

interface RecordsTableProps {
  records: RecordItem[];
  emptyMessage?: string;
  showDate?: boolean;
  onEdit: (record: RecordItem) => void;
  onDelete: (id: string) => void;
}

export const RecordsTable: React.FC<RecordsTableProps> = ({
  records,
  emptyMessage = 'No file entries found.',
  showDate = false,
  onEdit,
  onDelete
}) => {
  const getBadgeClass = (type: string) => {
    if (type === 'Sale') return 'bg-emerald-950/50 border-emerald-900 text-emerald-450';
    if (type === 'Quote') return 'bg-blue-950/50 border-blue-900 text-blue-450';
    if (type.startsWith('Requote')) return 'bg-amber-950/50 border-amber-900 text-amber-450';
    if (type.startsWith('Review') && type !== 'Individual Review') return 'bg-pink-950/50 border-pink-900 text-pink-450';
    if (type === 'Individual Review') return 'bg-rose-950/50 border-rose-900 text-rose-450';
    if (type === 'Other Site') return 'bg-purple-950/50 border-purple-900 text-purple-450';
    if (type === 'Van') return 'bg-indigo-950/50 border-indigo-900 text-indigo-450';
    return 'bg-teal-950/50 border-teal-900 text-teal-450'; // Bike and fallback
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/20">
      <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
        <thead className="bg-slate-900/50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          <tr>
            <th className={`px-5 py-3.5 ${showDate ? 'w-[7.5rem] min-w-[7.5rem]' : 'w-28 min-w-28'}`}>{showDate ? 'Date/Time' : 'Submitted Time'}</th>
            <th className="px-5 py-3.5">File Name</th>
            <th className="px-5 py-3.5">Branch</th>
            <th className="px-5 py-3.5">Codename</th>
            <th className="px-5 py-3.5 min-w-32">Type</th>
            <th className="px-5 py-3.5 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-850 text-slate-300">
          {records.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-5 py-8 text-center text-xs text-slate-500 font-medium">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            records.map((r) => (
              <tr key={r.id} className="hover:bg-slate-900/30 transition-all">
                <td className={`px-5 py-3 ${showDate ? 'w-[7.5rem] min-w-[7.5rem]' : 'w-28 min-w-28'}`}>
                  {showDate ? (
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-200 whitespace-nowrap">{formatDate(r.submitted_at)}</span>
                      <span className="text-[10px] text-slate-500 mt-0.5">{formatTimeToAMPM(r.submitted_at)}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">{formatTimeToAMPM(r.submitted_at)}</span>
                  )}
                </td>
                <td className="px-5 py-3 font-semibold text-white">{r.file_name}</td>
                <td className="px-5 py-3 text-slate-355">{r.branch_name}</td>
                <td className="px-5 py-3 text-slate-355 font-semibold">{r.codename}</td>
                <td className="px-5 py-3 min-w-32">
                  <span className={`inline-flex items-center whitespace-nowrap text-[11px] font-bold px-2 py-0.5 rounded-full border ${getBadgeClass(r.file_type)}`}>
                    {r.file_type}
                  </span>
                </td>
                <td className="px-5 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => onEdit(r)}
                      className="p-1.5 hover:bg-slate-800/80 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer"
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDelete(r.id)}
                      className="p-1.5 hover:bg-red-955/40 rounded-lg text-slate-400 hover:text-red-400 transition-all cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};
