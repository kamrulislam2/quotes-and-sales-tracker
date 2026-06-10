import React, { useState, useEffect, useMemo } from 'react';
import { Edit, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
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
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Reset page to 1 when records list changes (due to filtering or month change)
  useEffect(() => {
    setCurrentPage(1);
  }, [records]);

  const totalPages = Math.ceil(records.length / itemsPerPage);

  const displayedRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return records.slice(start, start + itemsPerPage);
  }, [records, currentPage]);

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

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  // Render pagination buttons dynamically (show max 5 buttons around currentPage)
  const renderPageNumbers = () => {
    const pageNumbers = [];
    const maxVisible = 5;
    
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    const end = Math.min(totalPages, start + maxVisible - 1);
    
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    
    for (let i = start; i <= end; i++) {
      pageNumbers.push(
        <button
          key={i}
          onClick={() => setCurrentPage(i)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
            currentPage === i
              ? 'bg-linear-to-r from-blue-600 to-violet-600 border-blue-500 text-white shadow-md shadow-blue-950/30'
              : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          {i}
        </button>
      );
    }
    return pageNumbers;
  };

  const startIndex = records.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(currentPage * itemsPerPage, records.length);

  return (
    <div className="space-y-4">
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
            {displayedRecords.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-xs text-slate-500 font-medium">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              displayedRecords.map((r) => (
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

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-1.5 px-2 bg-slate-950/20 border border-slate-800/60 rounded-xl">
          <div className="text-xs text-slate-400 font-medium">
            Showing <span className="font-semibold text-slate-200">{startIndex}</span> to{' '}
            <span className="font-semibold text-slate-200">{endIndex}</span> of{' '}
            <span className="font-semibold text-slate-200">{records.length}</span> entries
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              className="p-2 border border-slate-800 bg-slate-900/40 hover:bg-slate-800 hover:text-white text-slate-400 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-slate-900/40 disabled:hover:text-slate-400 cursor-pointer"
              title="Previous Page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            
            <div className="flex items-center gap-1.5">
              {renderPageNumbers()}
            </div>
            
            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className="p-2 border border-slate-800 bg-slate-900/40 hover:bg-slate-800 hover:text-white text-slate-400 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-slate-900/40 disabled:hover:text-slate-400 cursor-pointer"
              title="Next Page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
