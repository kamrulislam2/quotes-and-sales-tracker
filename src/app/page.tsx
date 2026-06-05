'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useDashboardData } from '@/hooks/useDashboardData';
import { Navbar } from '@/components/Navbar';
import { StatsGrid } from '@/components/StatsGrid';
import { SearchFilters } from '@/components/SearchFilters';
import { RecordsTable } from '@/components/RecordsTable';
import { DailyEntryForm } from '@/components/DailyEntryForm';
import { EditRecordModal } from '@/components/modals/EditRecordModal';
import { EditProfileModal } from '@/components/modals/EditProfileModal';
import { AddUserModal } from '@/components/modals/AddUserModal';
import { ConfirmModal } from '@/components/modals/ConfirmModal';
import { AdminCustomEntryModal } from '@/components/modals/AdminCustomEntryModal';
import { AdminViewToggle } from '@/components/AdminViewToggle';
import { validator } from '@/utils/validator';
import { calculateSummaryStats, formatDate, exportToCSV, exportToPDF } from '@/utils/dashboardHelpers';
import { FileType, RecordItem, Profile } from '@/types';
import {
  FileText,
  Loader2,
  Calendar,
  Users,
  Trash2,
  Clock,
  Eye,
  EyeOff,
  UserPlus,
  Info,
  UserCheck,
  Shield,
  Edit,
  X,
  Plus,
  RefreshCw,
  Search,
  FileSpreadsheet,
  FileDown
} from 'lucide-react';

const ALL_12_FILE_TYPES = [
  'Quote',
  'Requote',
  'Requote Van',
  'Requote Bike',
  'Review',
  'Review Van',
  'Review Bike',
  'Individual Review',
  'Other Site',
  'Van',
  'Bike',
  'Sale'
];

export default function Dashboard() {
  const specificDateRef = useRef<HTMLInputElement>(null);
  const dashboardData = useDashboardData();
  const {
    sessionUser,
    profile,
    loading,
    submitting,
    isOnline,
    showToast,
    records,
    profilesList,
    theme,
    toggleTheme,
    selectedYear,
    setSelectedYear,
    selectedMonth,
    setSelectedMonth,
    availableDates,
    addRecord,
    deleteRecord,
    updateRecord,
    createUser,
    resetUserPassword,
    deleteUser,
    adminUpdateUserProfile,
    completeFirstTimeSetup,
    handleLogout
  } = dashboardData;

  // Tabs: 'entry' (Daily Entry), 'monthly' (Month's Data), 'users' (User Management)
  const [activeTab, setActiveTab] = useState<'entry' | 'monthly' | 'users'>('entry');

  // Load active tab preference in localStorage on mount or when profile loads
  useEffect(() => {
    const savedTab = localStorage.getItem('quotes_sales_active_tab');
    if (savedTab && (savedTab === 'entry' || savedTab === 'monthly' || savedTab === 'users')) {
      if (savedTab === 'users' && profile?.role !== 'admin') {
        setActiveTab('entry');
      } else {
        setActiveTab(savedTab as 'entry' | 'monthly' | 'users');
      }
    }
  }, [profile]);

  const handleTabChange = (tab: 'entry' | 'monthly' | 'users') => {
    setActiveTab(tab);
    localStorage.setItem('quotes_sales_active_tab', tab);
  };

  // Daily Entry Form State
  const [fileName, setFileName] = useState('');
  const [branchName, setBranchName] = useState('');
  const [codenameInput, setCodenameInput] = useState(() => profile?.username || '');
  const [fileType, setFileType] = useState<FileType>('Quote');

  // Admin View Toggle on Tables: 'all' or 'mine'
  const [adminViewMode, setAdminViewMode] = useState<'all' | 'mine'>('mine');

  // Load active admin view mode preference on mount
  useEffect(() => {
    const savedViewMode = localStorage.getItem('quotes_sales_admin_view_mode');
    if (savedViewMode === 'all' || savedViewMode === 'mine') {
      setAdminViewMode(savedViewMode);
    }
  }, []);

  const handleAdminViewModeChange = (mode: 'all' | 'mine') => {
    setAdminViewMode(mode);
    localStorage.setItem('quotes_sales_admin_view_mode', mode);
  };

  // Monthly Table Search Query
  const [searchQuery, setSearchQuery] = useState('');

  // Today's Table Search Query
  const [todaySearchQuery, setTodaySearchQuery] = useState('');

  // Monthly Table Date filter state
  const [selectedDate, setSelectedDate] = useState('');
  const [dateInputVal, setDateInputVal] = useState('');

  // Sync text input with selectedDate
  useEffect(() => {
    if (selectedDate) {
      const parts = selectedDate.split('-');
      if (parts.length === 3) {
        setDateInputVal(`${parts[2]}-${parts[1]}-${parts[0]}`);
      } else {
        setDateInputVal(formatDate(selectedDate));
      }
    } else {
      setDateInputVal('');
    }
  }, [selectedDate]);

  const handleDateInputChange = (val: string) => {
    const clean = val.replace(/\D/g, '');
    let formatted = '';
    if (clean.length > 0) {
      formatted += clean.substring(0, 2);
    }
    if (clean.length > 2) {
      formatted += '-' + clean.substring(2, 4);
    }
    if (clean.length > 4) {
      formatted += '-' + clean.substring(4, 8);
    }

    setDateInputVal(formatted);

    if (formatted.length === 10) {
      const parts = formatted.split('-');
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const year = parseInt(parts[2], 10);

      if (
        day >= 1 && day <= 31 &&
        month >= 1 && month <= 12 &&
        year >= 1900 && year <= 2100
      ) {
        const dateObj = new Date(year, month - 1, day);
        if (
          dateObj.getFullYear() === year &&
          dateObj.getMonth() === month - 1 &&
          dateObj.getDate() === day
        ) {
          const yyyy = String(year);
          const mm = String(month).padStart(2, '0');
          const dd = String(day).padStart(2, '0');
          const dateValue = `${yyyy}-${mm}-${dd}`;
          setSelectedDate(dateValue);
          setSelectedYear(yyyy);
          setSelectedMonth(mm);
          return;
        }
      }
    }
    setSelectedDate('');
  };

  // Admin Backdated Entry Modal State
  const [isAdminCustomEntryModalOpen, setIsAdminCustomEntryModalOpen] = useState(false);

  // Create User Form State
  const [newCodename, setNewCodename] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newRole, setNewRole] = useState<'user' | 'admin'>('user');
  const [newPassword, setNewPassword] = useState('1234');
  const [allowedTypesSelect, setAllowedTypesSelect] = useState<string[]>(ALL_12_FILE_TYPES);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);

  // Edit Record Modal State
  const [editingRecord, setEditingRecord] = useState<RecordItem | null>(null);
  const [editFileName, setEditFileName] = useState('');
  const [editBranchName, setEditBranchName] = useState('');
  const [editCodename, setEditCodename] = useState('');
  const [editFileType, setEditFileType] = useState<FileType>('Quote');

  // State for resetting user password is now handled inside EditProfileModal
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);

  // Admin Editing User Profile State
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [editUserFullName, setEditUserFullName] = useState('');
  const [editUserRole, setEditUserRole] = useState<'user' | 'admin'>('user');
  const [editUserAllowedTypes, setEditUserAllowedTypes] = useState<string[]>([]);

  // User deletion state for confirmation modal
  const [deletingUserAccount, setDeletingUserAccount] = useState<{ id: string; username: string } | null>(null);

  // Record deletion state for confirmation modal
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null);

  // Force Change Password / Onboarding Customization Modal State
  const [ownFullName, setOwnFullName] = useState(() => profile?.full_name || '');
  const [ownCodename, setOwnCodename] = useState(() => profile?.username || '');
  const [ownPassword, setOwnPassword] = useState('');
  const [ownConfirmPassword, setOwnConfirmPassword] = useState('');
  const [showOwnPass, setShowOwnPass] = useState(false);
  const [showOwnConfirmPass, setShowOwnConfirmPass] = useState(false);

  // Real-time password feedback (6 to 12 characters, matching check)
  const passwordFeedback = useMemo(() => {
    if (!ownPassword) return null;
    if (ownPassword.length < 6 || ownPassword.length > 12) {
      return { text: 'Password must be 6 to 12 characters long', isError: true };
    }
    if (!ownConfirmPassword) {
      return { text: 'Please confirm password', isError: true };
    }
    if (ownPassword !== ownConfirmPassword) {
      return { text: 'Passwords do not match', isError: true };
    }
    return { text: 'Passwords match', isError: false };
  }, [ownPassword, ownConfirmPassword]);

  // Local helper: Set codename inputs when profile loads
  useEffect(() => {
    if (profile) {
      if (!codenameInput) setCodenameInput(profile.username);
      if (!ownCodename) setOwnCodename(profile.username);
      if (!ownFullName) setOwnFullName(profile.full_name || '');

      // Auto adjust selected file type based on user permitted types
      if (profile.allowed_types && profile.allowed_types.length > 0) {
        if (!profile.allowed_types.includes(fileType)) {
          setFileType(profile.allowed_types[0] as FileType);
        }
      }
    }
  }, [profile, codenameInput, ownCodename, ownFullName, fileType]);


  // Dynamic Year and Month Options
  const dynamicYears = useMemo(() => {
    const yearsSet = new Set<string>();
    availableDates.forEach(d => {
      yearsSet.add(d.year);
    });
    return Array.from(yearsSet).sort((a, b) => parseInt(b, 10) - parseInt(a, 10));
  }, [availableDates]);

  const dynamicMonths = useMemo(() => {
    const allMonthsMap: { [key: string]: string } = {
      '01': 'January',
      '02': 'February',
      '03': 'March',
      '04': 'April',
      '05': 'May',
      '06': 'June',
      '07': 'July',
      '08': 'August',
      '09': 'September',
      '10': 'October',
      '11': 'November',
      '12': 'December',
    };
    const monthsForYear = availableDates
      .filter(d => d.year === selectedYear)
      .map(d => d.month);
    const uniqueMonths = Array.from(new Set(monthsForYear)).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
    return uniqueMonths.map(m => ({
      val: m,
      name: allMonthsMap[m] || m
    }));
  }, [availableDates, selectedYear]);

  // Adjust selected month when selected year changes and month is no longer valid
  useEffect(() => {
    const isValid = dynamicMonths.some(m => m.val === selectedMonth);
    if (!isValid && dynamicMonths.length > 0) {
      setSelectedMonth(dynamicMonths[dynamicMonths.length - 1].val);
    }
  }, [dynamicMonths, selectedMonth, setSelectedMonth]);

  // Adjust selected year if it's no longer valid
  useEffect(() => {
    const isValid = dynamicYears.includes(selectedYear);
    if (!isValid && dynamicYears.length > 0) {
      const curYear = new Date().getFullYear().toString();
      if (dynamicYears.includes(curYear)) {
        setSelectedYear(curYear);
      } else {
        setSelectedYear(dynamicYears[0]);
      }
    }
  }, [dynamicYears, selectedYear, setSelectedYear]);

  // Filtered records for Monthly Tab
  const monthlyFilteredRecords = useMemo(() => {
    return records.filter(r => {
      // Admin filter mode
      if (profile?.role === 'admin' && adminViewMode === 'mine' && r.user_id !== sessionUser?.id) {
        return false;
      }
      // Specific Date filter
      if (selectedDate) {
        const recordDate = new Date(r.submitted_at).toLocaleDateString('en-CA');
        if (recordDate !== selectedDate) {
          return false;
        }
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        const matchFileName = r.file_name.toLowerCase().includes(q);
        const matchBranch = r.branch_name.toLowerCase().includes(q);
        const matchCodename = r.codename.toLowerCase().includes(q);
        const matchFileType = r.file_type.toLowerCase().includes(q);
        if (!matchFileName && !matchBranch && !matchCodename && !matchFileType) {
          return false;
        }
      }
      return true;
    });
  }, [records, adminViewMode, selectedDate, searchQuery, profile, sessionUser]);

  // Today's entries (submitted on the current local day)
  const todayRecords = useMemo(() => {
    const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local format
    return records.filter(r => {
      // Admin filter mode
      if (profile?.role === 'admin' && adminViewMode === 'mine' && r.user_id !== sessionUser?.id) {
        return false;
      }
      const recordDate = new Date(r.submitted_at).toLocaleDateString('en-CA');
      return recordDate === todayStr;
    });
  }, [records, adminViewMode, profile, sessionUser]);

  // Filtered entries for Today's list table
  const todayFilteredRecords = useMemo(() => {
    return todayRecords.filter(r => {
      if (todaySearchQuery) {
        const q = todaySearchQuery.toLowerCase().trim();
        const matchFileName = r.file_name.toLowerCase().includes(q);
        const matchBranch = r.branch_name.toLowerCase().includes(q);
        const matchCodename = r.codename.toLowerCase().includes(q);
        const matchFileType = r.file_type.toLowerCase().includes(q);
        if (!matchFileName && !matchBranch && !matchCodename && !matchFileType) {
          return false;
        }
      }
      return true;
    });
  }, [todayRecords, todaySearchQuery]);

  // Statistics calculation for today's entries (unfiltered by search terms)
  const todayStats = useMemo(() => {
    return calculateSummaryStats(todayRecords);
  }, [todayRecords]);

  // Statistics calculation for monthly entries (filtered by search query)
  const monthlyStats = useMemo(() => {
    return calculateSummaryStats(monthlyFilteredRecords);
  }, [monthlyFilteredRecords]);

  // Export handlers for Today's Entries
  const handleExportTodayExcel = () => {
    const todayStr = new Date().toLocaleDateString('en-CA');
    exportToCSV(todayFilteredRecords, `daily_entries_${todayStr}`);
  };

  const handleExportTodayPDF = () => {
    const dateFormatted = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
    exportToPDF(todayFilteredRecords, "Today's File Entry List", `Date: ${dateFormatted}`);
  };

  // Export handlers for Monthly Entries
  const handleExportMonthlyExcel = () => {
    let dateStr = `${selectedYear}-${selectedMonth}`;
    if (selectedDate) {
      dateStr = selectedDate;
    }
    exportToCSV(monthlyFilteredRecords, `monthly_entries_${dateStr}`);
  };

  const handleExportMonthlyPDF = () => {
    let dateStr = `Period: ${selectedMonth}-${selectedYear}`;
    if (selectedDate) {
      dateStr = `Date: ${formatDate(selectedDate)}`;
    }
    exportToPDF(monthlyFilteredRecords, "Monthly Quotes & Sales Logs", dateStr);
  };

  // Clear filters
  const handleClearFilters = () => {
    setSearchQuery('');
  };

  // Open native picker for specific date
  const handleOpenSpecificDatePicker = () => {
    if (specificDateRef.current) {
      try {
        specificDateRef.current.showPicker();
      } catch {
        specificDateRef.current.click();
      }
    }
  };

  // Specific Date filter change handler
  const handleDateFilterChange = (dateValue: string) => {
    setSelectedDate(dateValue);
    if (dateValue) {
      const [year, month] = dateValue.split('-');
      if (year && month) {
        setSelectedYear(year);
        setSelectedMonth(month);
      }
    }
  };

  // Submit Admin Backdated / Custom Date Entry from Modal
  const handleAdminCustomEntrySubmit = async (
    fileName: string,
    branchName: string,
    fileType: FileType,
    userId: string,
    submittedAtDate: string
  ): Promise<boolean> => {
    if (!userId) {
      showToast('error', 'Please select a user.');
      return false;
    }
    if (!submittedAtDate) {
      showToast('error', 'Please select a submission date.');
      return false;
    }

    const targetProfile = profilesList.find(p => p.id === userId);
    if (!targetProfile) {
      showToast('error', 'Selected user not found.');
      return false;
    }

    const formValidation = validator.validateRecordForm({
      file_name: fileName,
      branch_name: branchName,
      codename: targetProfile.username,
      file_type: fileType
    });

    if (!formValidation.isValid) {
      showToast('error', formValidation.errors[0]);
      return false;
    }

    const now = new Date();
    const timePart = now.toTimeString().split(' ')[0]; // HH:MM:SS
    const customSubmittedAt = new Date(`${submittedAtDate}T${timePart}`).toISOString();

    const success = await addRecord(
      fileName,
      branchName,
      targetProfile.username,
      fileType,
      userId,
      customSubmittedAt
    );

    return success;
  };

  const handleClearTodayFilters = () => {
    setTodaySearchQuery('');
  };

  // Submit Daily Entry
  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();

    const formValidation = validator.validateRecordForm({
      file_name: fileName,
      branch_name: branchName,
      codename: codenameInput,
      file_type: fileType
    });

    if (!formValidation.isValid) {
      showToast('error', formValidation.errors[0]);
      return;
    }

    const success = await addRecord(fileName, branchName, codenameInput, fileType);
    if (success) {
      setFileName('');
      setBranchName('');
      // Keep codename, but reset type to default first allowed type
      if (profile?.allowed_types && profile.allowed_types.length > 0) {
        setFileType(profile.allowed_types[0] as FileType);
      } else {
        setFileType('Quote');
      }
    }
  };

  // Save Record Edits
  const handleSaveEdit = async () => {
    if (!editingRecord) return;

    const validation = validator.validateRecordForm({
      file_name: editFileName,
      branch_name: editBranchName,
      codename: editCodename,
      file_type: editFileType
    });

    if (!validation.isValid) {
      showToast('error', validation.errors[0]);
      return;
    }

    const success = await updateRecord(
      editingRecord.id,
      editFileName,
      editBranchName,
      editCodename,
      editFileType
    );

    if (success) {
      setEditingRecord(null);
    }
  };

  // Admin: Create User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneratedPassword(null);

    const validation = validator.validateCreateUserForm({
      username: newCodename,
      fullName: newFullName,
      password: newPassword,
      confirmPassword: newPassword,
      role: newRole
    });

    if (!validation.isValid) {
      showToast('error', validation.errors[0]);
      return;
    }

    if (allowedTypesSelect.length === 0) {
      showToast('error', 'Please allow at least one file type.');
      return;
    }

    const pw = await createUser(newCodename, newRole, newFullName, allowedTypesSelect, newPassword);
    if (pw) {
      setGeneratedPassword(null);
      setNewCodename('');
      setNewFullName('');
      setNewRole('user');
      setNewPassword('1234');
      setAllowedTypesSelect(ALL_12_FILE_TYPES);
      setIsAddUserModalOpen(false);
    }
  };

  // Admin reset password handled inline inside EditProfileModal

  // Logged-in user complete first-time setup (Customizes username, full name, password)
  const handleFirstTimeSetup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!ownFullName.trim()) {
      showToast('error', 'Please enter your full name.');
      return;
    }
    if (!ownCodename.trim() || ownCodename.trim().length < 3) {
      showToast('error', 'Codename must be at least 3 characters long.');
      return;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(ownCodename.trim())) {
      showToast('error', 'Codename can only contain English letters, numbers, - and _.');
      return;
    }

    const validation = validator.validateOnboardingPassword(ownPassword);
    if (!validation.isValid) {
      showToast('error', validation.errors[0]);
      return;
    }
    if (ownPassword !== ownConfirmPassword) {
      showToast('error', 'Password confirmation does not match.');
      return;
    }

    const success = await completeFirstTimeSetup(ownCodename, ownFullName, ownPassword);
    if (success) {
      setOwnPassword('');
      setOwnConfirmPassword('');
    }
  };

  // Loading Screen
  if (loading) {
    return (
      <div className="flex-1 min-h-screen flex flex-col bg-slate-955 items-center justify-center relative overflow-hidden">
        <div className="absolute top-[-20%] right-[-20%] w-[50%] h-[50%] rounded-full bg-blue-900/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-20%] left-[-20%] w-[50%] h-[50%] rounded-full bg-violet-900/10 blur-[120px] pointer-events-none" />
        <div className="flex flex-col items-center gap-3 z-10">
          <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
          <span className="text-slate-400 text-xs font-semibold tracking-wider">Loading, please wait...</span>
        </div>
      </div>
    );
  }

  // Force Password Change & Onboarding custom setup
  if (profile && profile.has_changed_password === false) {
    return (
      <div className="flex-1 min-h-screen flex flex-col justify-center items-center bg-slate-955 px-4 relative overflow-hidden">
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-blue-900/20 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-violet-900/20 blur-[120px] pointer-events-none" />

        <div className="max-w-md w-full bg-slate-900/50 backdrop-blur-xl border border-slate-800/80 p-8 shadow-2xl rounded-2xl z-10 space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white bg-clip-text bg-gradient-to-r from-blue-400 to-violet-400">
              Profile Settings & Password Change
            </h2>
            <p className="text-xs text-slate-450 mt-1">
              This is your first login. Please verify your details and set a new password.
            </p>
          </div>

          <form onSubmit={handleFirstTimeSetup} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-350 mb-1 flex items-center gap-1">
                <Info className="h-3 w-3 text-blue-500" /> Your Full Name
                {profile?.full_name && profile.full_name.trim() !== '' && (
                  <span className="text-[10px] text-slate-500 font-normal">(Locked - Admin only)</span>
                )}
              </label>
              <input
                type="text"
                required
                disabled={!!(profile?.full_name && profile.full_name.trim() !== '')}
                placeholder="e.g. Kamrul Islam"
                value={ownFullName}
                onChange={(e) => setOwnFullName(e.target.value)}
                className="block w-full px-3 py-2 bg-slate-955 border border-slate-800 rounded-lg text-white placeholder-slate-650 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-slate-900/30"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-355 mb-1 flex items-center gap-1">
                <UserCheck className="h-3 w-3 text-blue-500" /> Your Codename
                {profile?.username && profile.username.trim() !== '' && (
                  <span className="text-[10px] text-slate-500 font-normal">(Locked - Admin only)</span>
                )}
              </label>
              <input
                type="text"
                required
                disabled={!!(profile?.username && profile.username.trim() !== '')}
                placeholder="e.g. KI1024"
                value={ownCodename}
                onChange={(e) => setOwnCodename(e.target.value.toUpperCase())}
                className="block w-full px-3 py-2 bg-slate-955 border border-slate-800 rounded-lg text-white placeholder-slate-650 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-slate-900/30"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-350 mb-1">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showOwnPass ? 'text' : 'password'}
                  required
                  placeholder="6 to 12 character password"
                  value={ownPassword}
                  onChange={(e) => setOwnPassword(e.target.value)}
                  className="block w-full px-3 pr-10 py-2 bg-slate-955 border border-slate-800 rounded-lg text-white placeholder-slate-650 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowOwnPass(!showOwnPass)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showOwnPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-355 mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showOwnConfirmPass ? 'text' : 'password'}
                  required
                  placeholder="Re-enter new password"
                  value={ownConfirmPassword}
                  onChange={(e) => setOwnConfirmPassword(e.target.value)}
                  className="block w-full px-3 pr-10 py-2 bg-slate-955 border border-slate-800 rounded-lg text-white placeholder-slate-650 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowOwnConfirmPass(!showOwnConfirmPass)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showOwnConfirmPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {passwordFeedback && (
                <p className={`text-xs mt-1.5 font-medium ${passwordFeedback.isError ? 'text-red-450' : 'text-emerald-450'}`}>
                  {passwordFeedback.text}
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleLogout}
                className="flex-1 py-2.5 border border-slate-800 text-slate-300 hover:text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors"
              >
                Logout
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-2 flex items-center justify-center gap-1.5 py-2.5 px-4 border border-transparent rounded-lg shadow-md text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 disabled:opacity-50 transition-all cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="animate-spin h-4 w-4" /> Saving...
                  </>
                ) : (
                  'Save Information'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Filter allowed categories for the daily form
  const allowedCategories = profile?.allowed_types || ALL_12_FILE_TYPES;

  return (
    <div className="flex-1 min-h-screen flex flex-col bg-slate-955 relative overflow-hidden pb-12">
      {/* Glow background blobs */}
      <div className="absolute top-[-20%] right-[-20%] w-[50%] h-[50%] rounded-full bg-blue-900/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-20%] w-[50%] h-[50%] rounded-full bg-violet-900/10 blur-[120px] pointer-events-none" />

      {/* Navbar Component */}
      <Navbar
        profile={profile}
        isOnline={isOnline}
        theme={theme}
        onThemeToggle={toggleTheme}
        onLogout={handleLogout}
      />
      {/* Main Body Layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 w-full z-10 flex-1 flex flex-col md:flex-row gap-6 items-start">

        {/* Sidebar Navigation */}
        <aside className="w-full md:w-64 shrink-0 bg-slate-900/50 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-4 shadow-xl">
          <div className="space-y-1">
            <button
              onClick={() => handleTabChange('entry')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer ${activeTab === 'entry'
                  ? 'bg-blue-600/15 border border-blue-500/30 text-blue-400 shadow-md shadow-blue-900/5'
                  : 'text-slate-400 hover:bg-slate-850/80 hover:text-white border border-transparent'
                }`}
            >
              <FileText className="h-5 w-5" />
              <span>Daily Entry</span>
            </button>
            <button
              onClick={() => handleTabChange('monthly')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer ${activeTab === 'monthly'
                  ? 'bg-blue-600/15 border border-blue-500/30 text-blue-400 shadow-md shadow-blue-900/5'
                  : 'text-slate-400 hover:bg-slate-850/80 hover:text-white border border-transparent'
                }`}
            >
              <Calendar className="h-5 w-5" />
              <span>Monthly Entry List</span>
            </button>
            {profile?.role === 'admin' && (
              <button
                onClick={() => handleTabChange('users')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer ${activeTab === 'users'
                    ? 'bg-blue-600/15 border border-blue-500/30 text-blue-400 shadow-md shadow-blue-900/5'
                    : 'text-slate-400 hover:bg-slate-850/80 hover:text-white border border-transparent'
                  }`}
              >
                <Users className="h-5 w-5" />
                <span>User Management</span>
              </button>
            )}
          </div>
        </aside>

        {/* Content Area */}
        <section className="flex-1 w-full bg-slate-900/50 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 shadow-xl min-h-[500px]">

          {/* TAB 1: DAILY ENTRY */}
          {activeTab === 'entry' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white">New File Entry</h2>
                <p className="text-xs text-slate-450 mt-1">Fill out the form below to submit file data.</p>
              </div>

              {/* Data Entry Form Component */}
              <DailyEntryForm
                fileName={fileName}
                setFileName={setFileName}
                branchName={branchName}
                setBranchName={setBranchName}
                codenameInput={codenameInput}
                setCodenameInput={setCodenameInput}
                fileType={fileType}
                setFileType={setFileType}
                allowedCategories={allowedCategories}
                submitting={submitting}
                onSubmit={handleAddEntry}
                isAdmin={false}
              />

              {/* Today's Data Title and Summary Stats */}
              <div className="border-t border-slate-800/80 pt-6 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <h3 className="text-md font-bold text-white flex items-center gap-2">
                      <Clock className="h-4.5 w-4.5 text-blue-500" />
                      Today's File Entry List
                    </h3>
                    <p className="text-[11px] text-slate-455 mt-0.5">
                      Date: {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>

                  {/* Export and Filter Controls */}
                  <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
                    <button
                      onClick={handleExportTodayExcel}
                      className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg border border-slate-800 bg-slate-900/50 hover:bg-slate-850 text-slate-350 hover:text-white text-[11px] font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-500" />
                      <span>Excel</span>
                    </button>
                    <button
                      onClick={handleExportTodayPDF}
                      className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg border border-slate-800 bg-slate-900/50 hover:bg-slate-850 text-slate-350 hover:text-white text-[11px] font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                    >
                      <FileDown className="h-3.5 w-3.5 text-rose-500" />
                      <span>PDF</span>
                    </button>
                    {profile?.role === 'admin' && (
                      <AdminViewToggle viewMode={adminViewMode} onChange={handleAdminViewModeChange} />
                    )}
                  </div>
                </div>

                {/* Stat pills summary Component */}
                <StatsGrid stats={todayStats} />

                {/* Search Filters for Today's Table */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-slate-400">Search Today's Entries</h4>
                  <SearchFilters
                    searchQuery={todaySearchQuery}
                    setSearchQuery={setTodaySearchQuery}
                    onClear={handleClearTodayFilters}
                  />
                </div>

                {/* Today's Records Table Component */}
                <RecordsTable
                  records={todayFilteredRecords}
                  emptyMessage="No file entries for today matching the filters."
                  showDate={false}
                  onEdit={(r) => {
                    setEditingRecord(r);
                    setEditFileName(r.file_name);
                    setEditBranchName(r.branch_name);
                    setEditCodename(r.codename);
                    setEditFileType(r.file_type);
                  }}
                  onDelete={setDeletingRecordId}
                />
              </div>
            </div>
          )}

          {/* TAB 2: MONTHLY LIST */}
          {activeTab === 'monthly' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <div>
                  <h2 className="text-xl font-bold text-white">Monthly Quotes & Sales Logs</h2>
                  <p className="text-xs text-slate-450 mt-1">Filter and view data for all months and years.</p>
                </div>

                {/* View toggle, Export, & Custom Entry Controls */}
                <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
                  <button
                    onClick={handleExportMonthlyExcel}
                    className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg border border-slate-800 bg-slate-900/50 hover:bg-slate-850 text-slate-350 hover:text-white text-[11px] font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Excel</span>
                  </button>
                  <button
                    onClick={handleExportMonthlyPDF}
                    className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg border border-slate-800 bg-slate-900/50 hover:bg-slate-850 text-slate-350 hover:text-white text-[11px] font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                  >
                    <FileDown className="h-3.5 w-3.5 text-rose-500" />
                    <span>PDF</span>
                  </button>
                  {profile?.role === 'admin' && adminViewMode === 'all' && (
                    <button
                      onClick={() => setIsAdminCustomEntryModalOpen(true)}
                      className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg shadow-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 hover:scale-[1.03] active:scale-[0.97] transition-all duration-200 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Custom Entry</span>
                    </button>
                  )}
                  {profile?.role === 'admin' && (
                    <AdminViewToggle viewMode={adminViewMode} onChange={handleAdminViewModeChange} />
                  )}
                </div>
              </div>

              {/* Date selection row & Filters */}
              <div className="space-y-4">
                <div className="bg-slate-955/40 p-4 rounded-2xl border border-slate-850 grid grid-cols-1 md:grid-cols-12 gap-3.5 items-end w-full">
                  {/* 1. Search Box */}
                  <div className="md:col-span-4">
                    <label className="block text-[11px] font-semibold text-slate-350 mb-1">Search</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search name, codename, branch..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="block w-full pl-8 pr-8 py-2 bg-slate-955 border border-slate-800 rounded-lg text-white placeholder-slate-650 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs h-9"
                      />
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-555" />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={handleClearFilters}
                          className="absolute right-2.5 top-2.5 flex items-center justify-center p-0.5 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-all duration-200 hover:scale-110 active:scale-90 cursor-pointer"
                          title="Clear search"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 2. Year Selection */}
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-350 mb-1">Year</label>
                    <select
                      value={selectedYear}
                      disabled={!!selectedDate}
                      onChange={(e) => {
                        setSelectedYear(e.target.value);
                        setSelectedDate(''); // Reset specific date filter
                      }}
                      className="block w-full px-3 py-2 bg-slate-955 border border-slate-800 rounded-lg text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-900/30 h-9"
                    >
                      {dynamicYears.map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>

                  {/* 3. Month Selection */}
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-355 mb-1">Month</label>
                    <select
                      value={selectedMonth}
                      disabled={!!selectedDate}
                      onChange={(e) => {
                        setSelectedMonth(e.target.value);
                        setSelectedDate(''); // Reset specific date filter
                      }}
                      className="block w-full px-3 py-2 bg-slate-955 border border-slate-800 rounded-lg text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-900/30 h-9"
                    >
                      {dynamicMonths.map(m => (
                        <option key={m.val} value={m.val}>{m.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* 4. Specific Date Input */}
                  <div className="md:col-span-4">
                    <label className="block text-[11px] font-semibold text-slate-350 mb-1">Specific Date</label>
                    <div className="flex gap-1.5 items-center">
                      <input
                        type="text"
                        placeholder="DD-MM-YYYY"
                        value={dateInputVal}
                        onChange={(e) => handleDateInputChange(e.target.value)}
                        maxLength={10}
                        className="block w-full px-3 py-2 bg-slate-955 border border-slate-800 rounded-lg text-white text-xs placeholder-slate-650 focus:outline-none focus:ring-1 focus:ring-blue-500 h-9"
                      />
                      <input
                        type="date"
                        ref={specificDateRef}
                        value={selectedDate}
                        onChange={(e) => handleDateFilterChange(e.target.value)}
                        className="absolute w-px h-px opacity-0 pointer-events-none select-none"
                      />
                      <button
                        type="button"
                        onClick={handleOpenSpecificDatePicker}
                        className="p-2 bg-slate-900 border border-slate-800 hover:border-slate-700 hover:text-white text-slate-400 rounded-lg transition-all duration-200 flex items-center justify-center shrink-0 w-9 h-9 cursor-pointer"
                        title="Open Calendar"
                      >
                        <Calendar className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDate('');
                          setDateInputVal('');
                        }}
                        className="p-2 bg-slate-900 border border-slate-800 hover:border-slate-700 hover:text-white text-slate-400 rounded-lg transition-all duration-200 flex items-center justify-center shrink-0 w-9 h-9 cursor-pointer"
                        title="Reset specific date"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Monthly Stats summary grid */}
              <StatsGrid stats={monthlyStats} />

              {/* Monthly Table Component */}
              <RecordsTable
                records={monthlyFilteredRecords}
                emptyMessage="No file records found matching the filters."
                showDate={true}
                onEdit={(r) => {
                  setEditingRecord(r);
                  setEditFileName(r.file_name);
                  setEditBranchName(r.branch_name);
                  setEditCodename(r.codename);
                  setEditFileType(r.file_type);
                }}
                onDelete={setDeletingRecordId}
              />
            </div>
          )}

          {/* TAB 3: USER MANAGEMENT (Admin Only) */}
          {activeTab === 'users' && profile?.role === 'admin' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white">User Accounts & File Permissions Management</h2>
                  <p className="text-xs text-slate-450 mt-1">Create new staff accounts and select which file types they are permitted to submit.</p>
                </div>
                <button
                  onClick={() => {
                    setGeneratedPassword(null);
                    setIsAddUserModalOpen(true);
                  }}
                  className="sm:self-end flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl shadow-lg text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 shadow-blue-950/20 hover:scale-[1.03] active:scale-[0.97] transition-all duration-200 shrink-0 cursor-pointer"
                >
                  <UserPlus className="h-4 w-4" /> Add User
                </button>
              </div>

              {/* Full Width Users List Table */}
              <div className="bg-slate-950/40 p-5 rounded-2xl border border-slate-850 space-y-4 overflow-x-auto">
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Shield className="h-4 w-4 text-blue-500" />
                  Registered Users List ({profilesList.length})
                </h3>

                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-955 border-b border-slate-850 text-slate-400 font-semibold uppercase">
                      <th className="px-4 py-3">Codename</th>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Categories</th>
                      <th className="px-4 py-3 text-right">Manage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850 text-slate-355">
                    {profilesList.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-550">
                          No registered users found.
                        </td>
                      </tr>
                    ) : (
                      profilesList.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-900/30 transition-all">
                          <td className="px-4 py-2.5 font-bold text-white">{u.username.toUpperCase()}</td>
                          <td className="px-4 py-2.5">{u.full_name || '-'}</td>
                          <td className="px-4 py-2.5">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${u.role === 'admin'
                                ? 'bg-purple-950/50 border-purple-900/60 text-purple-450'
                                : 'bg-blue-950/50 border-blue-900/60 text-blue-450'
                              }`}>
                              {u.role === 'admin' ? 'Admin' : 'User'}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex flex-wrap gap-1">
                              {(u.allowed_types || []).map((t) => (
                                <span key={t} className="bg-slate-900 border border-slate-800 text-slate-400 text-[9px] px-1.5 py-0.5 rounded">
                                  {t}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <div className="flex justify-end gap-2.5 items-center">
                              <button
                                onClick={() => {
                                  setEditingProfile(u);
                                  setEditUserFullName(u.full_name || '');
                                  setEditUserRole(u.role);
                                  setEditUserAllowedTypes(u.allowed_types || []);
                                }}
                                className="p-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-400 hover:text-white rounded-lg transition-all duration-200 hover:scale-125 cursor-pointer"
                                title="Edit Profile"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                              {u.id !== sessionUser?.id && (
                                <button
                                  onClick={() => {
                                    setDeletingUserAccount({ id: u.id, username: u.username });
                                  }}
                                  className="p-1.5 bg-slate-900 hover:bg-red-950/20 border border-slate-800 text-red-500 hover:text-red-400 rounded-lg transition-all duration-200 hover:scale-125 cursor-pointer"
                                  title="Delete Account"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </section>
      </main>

      {/* MODAL 1: EDIT RECORD */}
      {editingRecord && (
        <EditRecordModal
          record={editingRecord}
          editFileName={editFileName}
          setEditFileName={setEditFileName}
          editBranchName={editBranchName}
          setEditBranchName={setEditBranchName}
          editCodename={editCodename}
          setEditCodename={setEditCodename}
          editFileType={editFileType}
          setEditFileType={setEditFileType}
          allowedCategories={allowedCategories}
          onClose={() => setEditingRecord(null)}
          onSave={handleSaveEdit}
        />
      )}

      {/* MODAL 3: EDIT USER PROFILE */}
      {editingProfile && (
        <EditProfileModal
          username={editingProfile.username}
          fullName={editUserFullName}
          setFullName={setEditUserFullName}
          role={editUserRole}
          setRole={setEditUserRole}
          allowedTypes={editUserAllowedTypes}
          setAllowedTypes={setEditUserAllowedTypes}
          submitting={submitting}
          onClose={() => setEditingProfile(null)}
          onSave={async (newPasswordToSet) => {
            if (editUserAllowedTypes.length === 0) {
              showToast('error', 'Please allow at least one file type.');
              return;
            }
            const success = await adminUpdateUserProfile(
              editingProfile.id,
              editUserFullName,
              editUserRole,
              editUserAllowedTypes
            );
            if (success) {
              if (newPasswordToSet) {
                const pwSuccess = await resetUserPassword(editingProfile.id, newPasswordToSet);
                if (!pwSuccess) {
                  showToast('error', 'Profile updated, but password reset failed.');
                }
              }
              setEditingProfile(null);
            }
          }}
        />
      )}

      {/* MODAL 4: ADD NEW USER */}
      {isAddUserModalOpen && (
        <AddUserModal
          newCodename={newCodename}
          setNewCodename={setNewCodename}
          newFullName={newFullName}
          setNewFullName={setNewFullName}
          newPassword={newPassword}
          setNewPassword={setNewPassword}
          newRole={newRole}
          setNewRole={setNewRole}
          allowedTypes={allowedTypesSelect}
          setAllowedTypes={setAllowedTypesSelect}
          submitting={submitting}
          onSubmit={handleCreateUser}
          generatedPassword={generatedPassword}
          onClose={() => {
            setIsAddUserModalOpen(false);
            setGeneratedPassword(null);
          }}
          onCopyPassword={() => {
            if (generatedPassword) {
              navigator.clipboard.writeText(generatedPassword);
              showToast('success', 'Password copied to clipboard!');
            }
          }}
        />
      )}

      {/* MODAL 5: DELETE USER CONFIRMATION */}
      <ConfirmModal
        isOpen={!!deletingUserAccount}
        onClose={() => setDeletingUserAccount(null)}
        onConfirm={() => {
          if (deletingUserAccount) {
            deleteUser(deletingUserAccount.id);
          }
        }}
        title="Delete User Account"
        message={
          <span>
            Are you sure you want to permanently delete the account for{' '}
            <strong className="text-white">{deletingUserAccount?.username}</strong>? This action cannot be undone.
          </span>
        }
        confirmText="Delete Account"
        cancelText="Cancel"
        isDanger={true}
      />

      {/* MODAL 6: DELETE RECORD CONFIRMATION */}
      <ConfirmModal
        isOpen={!!deletingRecordId}
        onClose={() => setDeletingRecordId(null)}
        onConfirm={() => {
          if (deletingRecordId) {
            deleteRecord(deletingRecordId);
          }
        }}
        title="Delete File Record"
        message="Are you sure you want to permanently delete this file record? This action cannot be undone."
        confirmText="Delete Record"
        cancelText="Cancel"
        isDanger={true}
      />

      {/* MODAL 7: ADMIN CUSTOM DATE ENTRY */}
      {profile?.role === 'admin' && (
        <AdminCustomEntryModal
          isOpen={isAdminCustomEntryModalOpen}
          onClose={() => setIsAdminCustomEntryModalOpen(false)}
          profilesList={profilesList}
          submitting={submitting}
          onSubmit={handleAdminCustomEntrySubmit}
        />
      )}

    </div>
  );
}
