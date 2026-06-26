import React, { useState, useEffect, useCallback } from 'react';
import { X, Loader2, KeyRound, Eye, EyeOff } from 'lucide-react';
import { CategoryCheckboxList } from '../CategoryCheckboxList';

interface EditProfileModalProps {
  username: string;
  fullName: string;
  setFullName: (val: string) => void;
  role: 'admin' | 'user';
  setRole: (val: 'admin' | 'user') => void;
  allowedTypes: string[];
  setAllowedTypes: React.Dispatch<React.SetStateAction<string[]>>;
  canManageRules: boolean;
  setCanManageRules: (val: boolean) => void;
  submitting: boolean;
  onClose: () => void;
  onSave: (newPassword?: string) => Promise<void>;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  username,
  fullName,
  setFullName,
  role,
  setRole,
  allowedTypes,
  setAllowedTypes,
  canManageRules,
  setCanManageRules,
  submitting,
  onClose,
  onSave
}) => {
  const [changePassword, setChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // Close on Escape key press
  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [handleEscape]);

  const isPasswordValid = !changePassword || (newPassword.length >= 6 && newPassword.length <= 12 && newPassword === confirmPassword);

  const handleUpdate = () => {
    if (changePassword && newPassword) {
      if (newPassword.length < 6 || newPassword.length > 12) {
        return;
      }
      if (newPassword !== confirmPassword) {
        return;
      }
      onSave(newPassword);
    } else {
      onSave();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-455 hover:text-white transition-all cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        <h3 className="text-lg font-bold text-white mb-1">Edit Profile</h3>
        <p className="text-xs text-slate-455 mb-5">
          User: <strong className="text-white">{username.toUpperCase()}</strong>
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-350 mb-1">Full Name</label>
            <input
              type="text"
              placeholder="e.g. Kamrul Islam"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="block w-full px-3 py-2 bg-slate-955 border border-slate-800 rounded-lg text-white placeholder-slate-700 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-355 mb-1">Account Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'admin' | 'user')}
              className="block w-full px-3 py-2 bg-slate-955 border border-slate-800 rounded-lg text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="user">User (Staff)</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {/* Reusable categories checklist grid */}
          <CategoryCheckboxList
            allowedTypes={allowedTypes}
            onChange={setAllowedTypes}
          />

          {/* Quote Rules Permission Toggle */}
          <div className="border-t border-slate-800/80 pt-3">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={canManageRules}
                onChange={(e) => setCanManageRules(e.target.checked)}
                className="rounded border-slate-850 bg-slate-955 text-blue-500 focus:ring-0 focus:ring-offset-0 h-4 w-4 cursor-pointer"
              />
              <span className="text-xs font-semibold text-slate-300 group-hover:text-white transition-colors">
                Can Manage Quote Rules?
              </span>
            </label>
            <p className="text-[10px] text-slate-455 mt-1 ml-6">
              Allows the user to add, edit, or delete compliance rules and view archive history.
            </p>
          </div>

          {/* Reset User Password Section */}
          <div className="border-t border-slate-800/80 pt-3 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={changePassword}
                onChange={(e) => {
                  setChangePassword(e.target.checked);
                  if (!e.target.checked) {
                    setNewPassword('');
                    setConfirmPassword('');
                  }
                }}
                className="rounded border-slate-800 bg-slate-955 text-blue-500 focus:ring-0 focus:ring-offset-0 h-4 w-4 cursor-pointer"
              />
              <span className="text-xs font-semibold text-slate-300 group-hover:text-white transition-colors flex items-center gap-1.5">
                <KeyRound className="h-4 w-4 text-blue-500" />
                Change Password?
              </span>
            </label>

            {changePassword && (
              <div className="space-y-3 pt-1 animate-fade-in">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">New Password</label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="6 to 12 character password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="block w-full px-3 pr-10 py-2 bg-slate-955 border border-slate-800 rounded-lg text-white placeholder-slate-700 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    {newPassword && (
                      <button
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                      >
                        {showPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPass ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="Re-enter new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="block w-full px-3 pr-10 py-2 bg-slate-955 border border-slate-800 rounded-lg text-white placeholder-slate-700 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPass(!showConfirmPass)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {showConfirmPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="text-[11px] font-medium mt-1.5">
                  {newPassword.length < 6 || newPassword.length > 12 ? (
                    <p className="text-red-400">Password must be 6 to 12 characters</p>
                  ) : confirmPassword && newPassword !== confirmPassword ? (
                    <p className="text-red-400">Passwords do not match</p>
                  ) : confirmPassword && newPassword === confirmPassword ? (
                    <p className="text-emerald-400">Passwords match!</p>
                  ) : (
                    <p className="text-slate-450">Confirm password to proceed</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 bg-slate-955 border border-slate-800 hover:bg-slate-800/80 text-slate-300 hover:text-white rounded-lg text-xs font-semibold cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting || !isPasswordValid}
              onClick={handleUpdate}
              className="flex-1 py-2 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-md shadow-blue-950/20"
            >
              {submitting ? <Loader2 className="animate-spin h-3.5 w-3.5" /> : 'Update'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
