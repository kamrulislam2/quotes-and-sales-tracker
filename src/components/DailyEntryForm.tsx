import React from 'react';
import { FileText, MapPin, UserCheck, Check, Plus, Loader2 } from 'lucide-react';
import { FileType } from '@/types';

interface DailyEntryFormProps {
  fileName: string;
  setFileName: (val: string) => void;
  branchName: string;
  setBranchName: (val: string) => void;
  codenameInput: string;
  setCodenameInput: (val: string) => void;
  fileType: FileType;
  setFileType: (val: FileType) => void;
  allowedCategories: string[];
  submitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export const DailyEntryForm: React.FC<DailyEntryFormProps> = ({
  fileName,
  setFileName,
  branchName,
  setBranchName,
  codenameInput,
  setCodenameInput,
  fileType,
  setFileType,
  allowedCategories,
  submitting,
  onSubmit
}) => {
  const isRequoteActive = fileType === 'Requote' || fileType === 'Requote Van' || fileType === 'Requote Bike';
  const isReviewActive = fileType === 'Review' || fileType === 'Review Van' || fileType === 'Review Bike';

  // Helper to check if any variant of Requote is allowed
  const isRequoteAllowed =
    allowedCategories.includes('Requote') ||
    allowedCategories.includes('Requote Van') ||
    allowedCategories.includes('Requote Bike');

  // Helper to check if any variant of Review is allowed
  const isReviewAllowed =
    allowedCategories.includes('Review') ||
    allowedCategories.includes('Review Van') ||
    allowedCategories.includes('Review Bike');

  const handleRequoteClick = () => {
    if (allowedCategories.includes('Requote')) {
      setFileType('Requote');
    } else if (allowedCategories.includes('Requote Van')) {
      setFileType('Requote Van');
    } else if (allowedCategories.includes('Requote Bike')) {
      setFileType('Requote Bike');
    }
  };

  const handleReviewClick = () => {
    if (allowedCategories.includes('Review')) {
      setFileType('Review');
    } else if (allowedCategories.includes('Review Van')) {
      setFileType('Review Van');
    } else if (allowedCategories.includes('Review Bike')) {
      setFileType('Review Bike');
    }
  };

  // List of main types we show in the compact grid
  // We map them to their display status and active condition
  const mainCategories = [
    { id: 'Quote', label: 'Quote', allowed: allowedCategories.includes('Quote'), active: fileType === 'Quote', onClick: () => setFileType('Quote') },
    { id: 'Individual Review', label: 'Individual Review', allowed: allowedCategories.includes('Individual Review'), active: fileType === 'Individual Review', onClick: () => setFileType('Individual Review') },
    { id: 'Requote', label: 'Requote', allowed: isRequoteAllowed, active: isRequoteActive, onClick: handleRequoteClick },
    { id: 'Review', label: 'Review', allowed: isReviewAllowed, active: isReviewActive, onClick: handleReviewClick },
    { id: 'Van', label: 'Van', allowed: allowedCategories.includes('Van'), active: fileType === 'Van', onClick: () => setFileType('Van') },
    { id: 'Bike', label: 'Bike', allowed: allowedCategories.includes('Bike'), active: fileType === 'Bike', onClick: () => setFileType('Bike') },
    { id: 'Other Site', label: 'Other Site', allowed: allowedCategories.includes('Other Site'), active: fileType === 'Other Site', onClick: () => setFileType('Other Site') },
    { id: 'Sale', label: 'Sale', allowed: allowedCategories.includes('Sale'), active: fileType === 'Sale', onClick: () => setFileType('Sale') },
  ];

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-slate-955/40 p-5 rounded-2xl border border-slate-850">
      {/* Left side inputs */}
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-355 mb-1.5 flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-blue-500" /> File Name
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Williams James"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            className="block w-full px-3.5 py-2.5 bg-slate-955 border border-slate-800 rounded-xl text-white placeholder-slate-650 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-355 mb-1.5 flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-blue-500" /> Branch Name
          </label>
          <input
            type="text"
            required
            placeholder="e.g. MK, NN, RIde"
            value={branchName}
            onChange={(e) => setBranchName(e.target.value.toUpperCase())}
            className="block w-full px-3.5 py-2.5 bg-slate-955 border border-slate-800 rounded-xl text-white placeholder-slate-650 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-355 mb-1.5 flex items-center gap-1.5">
            <UserCheck className="h-3.5 w-3.5 text-blue-500" /> Codename
          </label>
          <input
            type="text"
            required
            placeholder="e.g. KI1024"
            value={codenameInput}
            onChange={(e) => setCodenameInput(e.target.value.toUpperCase())}
            className="block w-full px-3.5 py-2.5 bg-slate-955 border border-slate-800 rounded-xl text-white placeholder-slate-650 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
          />
        </div>
      </div>

      {/* Right side file type selection */}
      <div className="space-y-4 flex flex-col justify-between">
        <div>
          <label className="block text-xs font-semibold text-slate-355 mb-2.5">
            Select File Category/Type
          </label>
          
          <div className="grid grid-cols-2 gap-2.5">
            {mainCategories
              .filter((cat) => cat.allowed)
              .map((cat) => (
                <div
                  key={cat.id}
                  onClick={cat.onClick}
                  className={`flex flex-col justify-center px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 cursor-pointer hover:scale-[1.03] active:scale-[0.97] select-none ${
                    cat.active
                      ? 'bg-blue-600/15 border-blue-500 text-blue-400 shadow-lg shadow-blue-900/10'
                      : 'bg-slate-955/30 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span>
                      {cat.id === 'Requote' && fileType.startsWith('Requote ') ? fileType :
                       cat.id === 'Review' && fileType.startsWith('Review ') ? fileType :
                       cat.label}
                    </span>
                    <span className={`h-4.5 w-4.5 rounded-full flex items-center justify-center border transition-all shrink-0 ${
                      cat.active
                        ? 'bg-blue-500 border-blue-500 text-white'
                        : 'border-slate-700 bg-slate-900'
                    }`}>
                      {cat.active && <Check className="h-3 w-3" />}
                    </span>
                  </div>

                  {/* Suboptions for Requote (Van / Bike) inside the card */}
                  {cat.id === 'Requote' && cat.active && (
                    <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-blue-950/40" onClick={(e) => e.stopPropagation()}>
                      {allowedCategories.includes('Requote') && (
                        <button
                          type="button"
                          onClick={() => setFileType('Requote')}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all duration-200 hover:scale-[1.05] active:scale-[0.95] cursor-pointer border ${
                            fileType === 'Requote'
                              ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-900/10'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                          }`}
                        >
                          Only Requote
                        </button>
                      )}
                      {allowedCategories.includes('Requote Van') && (
                        <button
                          type="button"
                          onClick={() => setFileType('Requote Van')}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all duration-200 hover:scale-[1.05] active:scale-[0.95] cursor-pointer border ${
                            fileType === 'Requote Van'
                              ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-900/10'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                          }`}
                        >
                          + Van
                        </button>
                      )}
                      {allowedCategories.includes('Requote Bike') && (
                        <button
                          type="button"
                          onClick={() => setFileType('Requote Bike')}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all duration-200 hover:scale-[1.05] active:scale-[0.95] cursor-pointer border ${
                            fileType === 'Requote Bike'
                              ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-900/10'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                          }`}
                        >
                          + Bike
                        </button>
                      )}
                    </div>
                  )}

                  {/* Suboptions for Review (Van / Bike) inside the card */}
                  {cat.id === 'Review' && cat.active && (
                    <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-blue-950/40" onClick={(e) => e.stopPropagation()}>
                      {allowedCategories.includes('Review') && (
                        <button
                          type="button"
                          onClick={() => setFileType('Review')}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all duration-200 hover:scale-[1.05] active:scale-[0.95] cursor-pointer border ${
                            fileType === 'Review'
                              ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-900/10'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                          }`}
                        >
                          Only Review
                        </button>
                      )}
                      {allowedCategories.includes('Review Van') && (
                        <button
                          type="button"
                          onClick={() => setFileType('Review Van')}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all duration-200 hover:scale-[1.05] active:scale-[0.95] cursor-pointer border ${
                            fileType === 'Review Van'
                              ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-900/10'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                          }`}
                        >
                          + Van
                        </button>
                      )}
                      {allowedCategories.includes('Review Bike') && (
                        <button
                          type="button"
                          onClick={() => setFileType('Review Bike')}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all duration-200 hover:scale-[1.05] active:scale-[0.95] cursor-pointer border ${
                            fileType === 'Review Bike'
                              ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-900/10'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                          }`}
                        >
                          + Bike
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))
            }
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full mt-4 flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-semibold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:via-indigo-500 hover:to-violet-500 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 cursor-pointer disabled:opacity-50 shadow-blue-950/20"
        >
          {submitting ? (
            <>
              <Loader2 className="animate-spin h-5 w-5 text-white" /> Submitting...
            </>
          ) : (
            <>
              <Plus className="h-5 w-5" /> Submit Data Entry
            </>
          )}
        </button>
      </div>
    </form>
  );
};
