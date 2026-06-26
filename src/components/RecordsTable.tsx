import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Edit, Trash2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { RecordItem } from '@/types';
import { formatDate, formatTimeToAMPM } from '@/utils/dashboardHelpers';

interface RecordsTableProps {
  records: RecordItem[];
  emptyMessage?: string;
  showDate?: boolean;
  onEdit: (record: RecordItem) => void;
  onDelete: (id: string) => void;
  isLoading?: boolean;
  currentUserId?: string | null;
  isAdmin?: boolean;
  onBulkDelete?: (ids: string[]) => void;
}

export const RecordsTable: React.FC<RecordsTableProps> = ({
  records,
  emptyMessage = 'No file entries found.',
  showDate = false,
  onEdit,
  onDelete,
  isLoading = false,
  currentUserId = null,
  isAdmin = false,
  onBulkDelete
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    record: RecordItem;
  } | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Dismiss context menu on click outside
  useEffect(() => {
    const handleOutsideClick = () => {
      setContextMenu(null);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => {
      window.removeEventListener('click', handleOutsideClick);
    };
  }, []);

  // Press Escape to exit Selection Mode and clear selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedIds([]);
        setIsSelectionMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Reset page, clear selection, and exit selection mode when records list changes (due to filtering or month change)
  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]);
    setIsSelectionMode(false);
  }, [records]);

  // Clear selection and exit selection mode on page/items change
  useEffect(() => {
    setSelectedIds([]);
    setIsSelectionMode(false);
  }, [currentPage, itemsPerPage]);

  // If selection is cleared externally (e.g. after deletion), exit selection mode
  useEffect(() => {
    if (selectedIds.length === 0) {
      setIsSelectionMode(false);
    }
  }, [selectedIds]);

  const totalPages = Math.ceil(records.length / itemsPerPage);

  const displayedRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return records.slice(start, start + itemsPerPage);
  }, [records, currentPage, itemsPerPage]);

  const deletableDisplayedRecords = useMemo(() => {
    return displayedRecords.filter(r => isAdmin || r.user_id === currentUserId);
  }, [displayedRecords, isAdmin, currentUserId]);

  const handleSelectAllToggle = () => {
    const allSelectedOnPage = deletableDisplayedRecords.length > 0 && deletableDisplayedRecords.every(r => selectedIds.includes(r.id));
    if (allSelectedOnPage) {
      setSelectedIds(prev => prev.filter(id => !deletableDisplayedRecords.some(r => r.id === id)));
    } else {
      setSelectedIds(prev => {
        const unique = new Set([...prev, ...deletableDisplayedRecords.map(r => r.id)]);
        return Array.from(unique);
      });
    }
  };

  const handleSelectRow = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleRowContextMenu = (e: React.MouseEvent, record: RecordItem) => {
    // If ordinary user and they don't own this record, don't show custom menu
    if (!isAdmin && record.user_id !== currentUserId) {
      return;
    }
    e.preventDefault();

    // Prevent placing menu off-screen
    const menuWidth = 144; // w-36 = 144px
    const menuHeight = 120; // estimated height
    const x = e.clientX + menuWidth > window.innerWidth ? e.clientX - menuWidth : e.clientX;
    const y = e.clientY + menuHeight > window.innerHeight ? e.clientY - menuHeight : e.clientY;

    setContextMenu({
      x,
      y,
      record
    });
  };

  const handleContextSelect = (record: RecordItem) => {
    setIsSelectionMode(true);
    setSelectedIds(prev => {
      if (prev.includes(record.id)) return prev;
      return [...prev, record.id];
    });
    setContextMenu(null);
  };

  const handleContextDeselect = (record: RecordItem) => {
    setSelectedIds(prev => prev.filter(id => id !== record.id));
    setContextMenu(null);
  };

  const handleContextEdit = (record: RecordItem) => {
    onEdit(record);
    setContextMenu(null);
  };

  const handleContextDelete = (record: RecordItem) => {
    onDelete(record.id);
    setContextMenu(null);
  };

  const handleRowClick = (e: React.MouseEvent, record: RecordItem) => {
    // Toggle row selection on row click if selection mode is active and user has permission
    if (isSelectionMode && (isAdmin || record.user_id === currentUserId)) {
      const target = e.target as HTMLElement;
      // Prevent selection toggle if user clicked on edit/delete action buttons
      if (target.closest('button') || target.closest('input[type="checkbox"]')) {
        return;
      }
      handleSelectRow(record.id);
    }
  };

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

  const colSpanCount = 6;

  const cellStyle = useMemo(() => ({
    width: isSelectionMode && onBulkDelete ? '72px' : '0px',
    minWidth: isSelectionMode && onBulkDelete ? '72px' : '0px',
    maxWidth: isSelectionMode && onBulkDelete ? '72px' : '0px',
    opacity: isSelectionMode && onBulkDelete ? 1 : 0,
    transition: 'width 300ms ease-out, min-width 300ms ease-out, max-width 300ms ease-out, opacity 300ms ease-out'
  }), [isSelectionMode, onBulkDelete]);

  const getInnerStyle = (paddingTop: string, paddingBottom: string) => {
    return {
      width: isSelectionMode && onBulkDelete ? '72px' : '0px',
      minWidth: isSelectionMode && onBulkDelete ? '72px' : '0px',
      maxWidth: isSelectionMode && onBulkDelete ? '72px' : '0px',
      paddingLeft: isSelectionMode && onBulkDelete ? '12px' : '0px',
      paddingRight: isSelectionMode && onBulkDelete ? '16px' : '0px',
      paddingTop: isSelectionMode && onBulkDelete ? paddingTop : '0px',
      paddingBottom: isSelectionMode && onBulkDelete ? paddingBottom : '0px',
      transition: 'width 300ms ease-out, min-width 300ms ease-out, max-width 300ms ease-out, opacity 300ms ease-out, padding 300ms ease-out'
    };
  };

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/20">
        <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
          <thead className="bg-slate-900/50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <tr>
              <th className={`px-5 py-3.5 ${showDate ? 'w-[7.5rem] min-w-[7.5rem]' : 'w-28 min-w-28'}`}>{showDate ? 'Date/Time' : 'Submitted Time'}</th>
              <th className="px-5 py-3.5">File Name</th>
              <th className="px-5 py-3.5 text-center">Branch</th>
              <th className="px-5 py-3.5 text-center">Codename</th>
              <th className="px-5 py-3.5 min-w-32 text-center">Type</th>
              <th className="p-0 text-right overflow-hidden border-0"
                  style={cellStyle}>
                <div className="flex items-center justify-end gap-2 overflow-hidden"
                     style={getInnerStyle('14px', '14px')}>
                  <button
                    onClick={() => onBulkDelete?.(selectedIds)}
                    className={`p-1 text-red-500 hover:text-red-400 hover:bg-slate-800/80 rounded cursor-pointer flex items-center justify-center shrink-0 transition-all duration-300 transform ${
                      selectedIds.length > 0 ? 'scale-100 opacity-100 w-6' : 'scale-0 opacity-0 w-0'
                    }`}
                    title={`Delete ${selectedIds.length} selected records`}
                  >
                    <Trash2 className="h-4 w-4 text-red-500 stroke-[2.5] shrink-0" />
                  </button>
                  <input
                    type="checkbox"
                    checked={deletableDisplayedRecords.length > 0 && deletableDisplayedRecords.every(r => selectedIds.includes(r.id))}
                    onChange={handleSelectAllToggle}
                    className={`rounded-full border border-slate-700 bg-slate-950 text-blue-500 focus:ring-blue-500/30 cursor-pointer h-4 w-4 appearance-none checked:bg-blue-500 checked:border-blue-500 relative checked:after:content-[''] checked:after:absolute checked:after:left-[4px] checked:after:top-[4px] checked:after:w-[6px] checked:after:h-[6px] checked:after:rounded-full checked:after:bg-white transition-all duration-300 transform shrink-0 ${
                      isSelectionMode ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
                    }`}
                  />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850 text-slate-300">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={idx} className="hover:bg-slate-900/10 border-b border-slate-850/40">
                  <td className="px-5 py-4 w-28">
                    <div className="flex flex-col gap-1.5">
                      <div className="h-3.5 w-16 bg-slate-800 rounded animate-pulse" />
                      {showDate && <div className="h-2.5 w-10 bg-slate-850 rounded animate-pulse" />}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="h-3.5 w-40 bg-slate-800 rounded animate-pulse" />
                  </td>
                  <td className="px-5 py-4 text-center">
                    <div className="h-3.5 w-12 bg-slate-800 rounded animate-pulse mx-auto" />
                  </td>
                  <td className="px-5 py-4 text-center">
                    <div className="h-3.5 w-16 bg-slate-800 rounded animate-pulse mx-auto" />
                  </td>
                  <td className="px-5 py-4 w-32 text-center">
                    <div className="h-5 w-20 bg-slate-800/80 rounded-full animate-pulse mx-auto" />
                  </td>
                  <td className="p-0 text-right overflow-hidden border-0"
                      style={cellStyle}>
                    <div className="flex justify-end items-center overflow-hidden"
                         style={getInnerStyle('16px', '16px')}>
                      <div className="h-3.5 w-3.5 bg-slate-800 rounded-full animate-pulse shrink-0" />
                    </div>
                  </td>
                </tr>
              ))
            ) : displayedRecords.length === 0 ? (
              <tr>
                <td colSpan={colSpanCount} className="px-5 py-8 text-center text-xs text-slate-500 font-medium">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              displayedRecords.map((r) => (
                <tr
                  key={r.id}
                  onContextMenu={(e) => handleRowContextMenu(e, r)}
                  onClick={(e) => handleRowClick(e, r)}
                  className={`hover:bg-slate-900/30 transition-all select-none ${
                    isSelectionMode && (isAdmin || r.user_id === currentUserId) ? 'cursor-pointer' : ''
                  }`}
                >
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
                  <td className="px-5 py-3 font-semibold text-white">
                    {r.file_name.replace(/ \[(SOLD|UNSOLD)\]$/, '')}
                  </td>
                  <td className="px-5 py-3 text-slate-355 text-center">{r.branch_name}</td>
                  <td className="px-5 py-3 text-slate-355 font-semibold text-center">{r.codename}</td>
                  <td className="px-5 py-3 min-w-32 text-center">
                    <span className={`inline-flex items-center whitespace-nowrap text-[11px] font-bold px-2 py-0.5 rounded-full border ${getBadgeClass(r.file_type)}`}>
                      {r.file_type}
                    </span>
                  </td>
                  <td className="p-0 text-right overflow-hidden border-0"
                      style={cellStyle}>
                    <div className="flex justify-end items-center overflow-hidden"
                         style={getInnerStyle('12px', '12px')}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(r.id)}
                        disabled={!isAdmin && r.user_id !== currentUserId}
                        onChange={() => handleSelectRow(r.id)}
                        className={`rounded-full border border-slate-700 bg-slate-950 text-blue-500 focus:ring-blue-500/30 cursor-pointer h-4 w-4 appearance-none checked:bg-blue-500 checked:border-blue-500 relative checked:after:content-[''] checked:after:absolute checked:after:left-[4px] checked:after:top-[4px] checked:after:w-[6px] checked:after:h-[6px] checked:after:rounded-full checked:after:bg-white transition-all duration-300 transform shrink-0 disabled:opacity-20 disabled:cursor-not-allowed ${
                          isSelectionMode ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
                        }`}
                      />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Premium Glassmorphic Context Menu */}
      {contextMenu && isMounted && createPortal(
        <div
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          className="fixed z-50 backdrop-blur-lg bg-slate-900/95 border border-slate-800 rounded-xl shadow-2xl p-1 w-36 select-none animate-fadeIn"
        >
          {selectedIds.includes(contextMenu.record.id) ? (
            <button
              onClick={() => handleContextDeselect(contextMenu.record)}
              className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-350 hover:text-white hover:bg-slate-800 rounded-lg transition-all cursor-pointer flex items-center gap-2"
            >
              <div className="h-2 w-2 rounded-full bg-slate-500 animate-pulse" />
              Deselect
            </button>
          ) : (
            <button
              onClick={() => handleContextSelect(contextMenu.record)}
              className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-350 hover:text-white hover:bg-slate-800 rounded-lg transition-all cursor-pointer flex items-center gap-2"
            >
              <div className="h-2 w-2 rounded-full bg-blue-500" />
              Select
            </button>
          )}
          <button
            onClick={() => handleContextEdit(contextMenu.record)}
            className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-350 hover:text-white hover:bg-slate-800 rounded-lg transition-all cursor-pointer flex items-center gap-2"
          >
            <Edit className="h-3.5 w-3.5 text-slate-500" />
            Edit
          </button>
          <button
            onClick={() => handleContextDelete(contextMenu.record)}
            className="w-full text-left px-3 py-2 text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-955/20 rounded-lg transition-all cursor-pointer flex items-center gap-2"
          >
            <Trash2 className="h-3.5 w-3.5 text-red-500 stroke-[2]" />
            Delete
          </button>
        </div>,
        document.body
      )}

      {/* Pagination Controls */}
      {records.length > 0 && (
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-2 px-3 bg-slate-950/20 border border-slate-800/60 rounded-xl">
          <div className="text-xs text-slate-400 font-medium">
            Showing <span className="font-semibold text-slate-200">{startIndex}</span> to{' '}
            <span className="font-semibold text-slate-200">{endIndex}</span> of{' '}
            <span className="font-semibold text-slate-200">{records.length}</span> entries
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            {/* Show per page selector dropdown */}
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span>Show</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-slate-900 border border-slate-800 text-slate-200 rounded-lg py-1 px-2 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs cursor-pointer hover:bg-slate-850"
              >
                <option value={15}>15</option>
                <option value={30}>30</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span>entries</span>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                {/* Jump to First Page */}
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="p-2 border border-slate-800 bg-slate-900/40 hover:bg-slate-800 hover:text-white text-slate-400 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-slate-900/40 disabled:hover:text-slate-400 cursor-pointer"
                  title="First Page"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </button>

                {/* Previous Page */}
                <button
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                  className="p-2 border border-slate-800 bg-slate-900/40 hover:bg-slate-800 hover:text-white text-slate-400 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-slate-900/40 disabled:hover:text-slate-400 cursor-pointer"
                  title="Previous Page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                
                <div className="flex items-center gap-1">
                  {renderPageNumbers()}
                </div>
                
                {/* Next Page */}
                <button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className="p-2 border border-slate-800 bg-slate-900/40 hover:bg-slate-800 hover:text-white text-slate-400 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-slate-900/40 disabled:hover:text-slate-400 cursor-pointer"
                  title="Next Page"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>

                {/* Jump to Last Page */}
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="p-2 border border-slate-800 bg-slate-900/40 hover:bg-slate-800 hover:text-white text-slate-400 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-slate-900/40 disabled:hover:text-slate-400 cursor-pointer"
                  title="Last Page"
                >
                  <ChevronsRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
