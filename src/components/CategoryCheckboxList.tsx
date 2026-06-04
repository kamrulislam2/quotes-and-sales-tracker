import React from 'react';
import { Check } from 'lucide-react';
import { FileType } from '@/types';

interface CategoryCheckboxListProps {
  allowedTypes: string[];
  onChange: (types: string[]) => void;
  label?: string;
}

const ALL_FILE_TYPES: FileType[] = [
  'Quote',
  'Individual Review',
  'Requote',
  'Review',
  'Requote Van',
  'Review Van',
  'Requote Bike',
  'Review Bike',
  'Van',
  'Bike',
  'Other Site',
  'Sale'
];

export const CategoryCheckboxList: React.FC<CategoryCheckboxListProps> = ({
  allowedTypes,
  onChange,
  label = 'Permitted File Entry Types (Categories)'
}) => {
  const handleToggleCategory = (type: string) => {
    const nextTypes = allowedTypes.includes(type)
      ? allowedTypes.filter((t) => t !== type)
      : [...allowedTypes, type];
    onChange(nextTypes);
  };

  const handleToggleAll = () => {
    if (allowedTypes.length === ALL_FILE_TYPES.length) {
      onChange([]);
    } else {
      onChange(ALL_FILE_TYPES);
    }
  };

  return (
    <div className="space-y-2 border-t border-slate-800/80 pt-3">
      <div className="flex items-center justify-between">
        <label className="block text-[11px] font-semibold text-slate-330">
          {label}
        </label>
        <button
          type="button"
          onClick={handleToggleAll}
          className="text-[10px] text-blue-500 hover:text-blue-400 font-semibold transition-colors cursor-pointer"
        >
          {allowedTypes.length === ALL_FILE_TYPES.length ? 'Clear All' : 'Select All'}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1">
        {ALL_FILE_TYPES.map((type) => {
          const isChecked = allowedTypes.includes(type);
          return (
            <label
              key={type}
              onClick={() => handleToggleCategory(type)}
              className="flex items-center justify-between px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-955/50 text-[10px] font-semibold text-slate-400 hover:text-white cursor-pointer select-none transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className="truncate mr-1">{type}</span>
              <span className={`h-4 w-4 rounded-md flex items-center justify-center border transition-all shrink-0 ${
                isChecked
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'border-slate-700 bg-slate-900'
              }`}>
                {isChecked && <Check className="h-2.5 w-2.5" />}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
};
