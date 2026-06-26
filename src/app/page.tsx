"use client";

import { useState, useMemo, useEffect, useRef, lazy, Suspense } from "react";
import { useDashboardData } from "@/hooks/useDashboardData";
import { Navbar } from "@/components/Navbar";
import { StatsGrid } from "@/components/StatsGrid";
import { RecordsTable } from "@/components/RecordsTable";
import { DailyEntryForm } from "@/components/DailyEntryForm";
import { EditRecordModal } from "@/components/modals/EditRecordModal";
import { EditProfileModal } from "@/components/modals/EditProfileModal";
import { AddUserModal } from "@/components/modals/AddUserModal";
import { ConfirmModal } from "@/components/modals/ConfirmModal";
import { CustomEntryModal } from "@/components/modals/CustomEntryModal";
import { AdminViewToggle } from "@/components/AdminViewToggle";
const AnalyticsPanel = lazy(() => import("@/components/AnalyticsPanel").then(m => ({ default: m.AnalyticsPanel })));
const AuditLogsPanel = lazy(() => import("@/components/AuditLogsPanel").then(m => ({ default: m.AuditLogsPanel })));
const QuoteRulesPanel = lazy(() => import("@/components/QuoteRulesPanel").then(m => ({ default: m.QuoteRulesPanel })));
import { validator } from "@/utils/validator";
import {
  calculateSummaryStats,
  formatDate,
  exportToCSV,
} from "@/utils/dashboardHelpers";
import { FileType, RecordItem, Profile } from "@/types";
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
  XCircle,
  CheckCircle,
  Plus,
  RefreshCw,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  FileSpreadsheet,
  TrendingUp,
  ScrollText,
  Copy,
  ArrowLeft,
  BookOpen,
} from "lucide-react";

const ALL_12_FILE_TYPES = [
  "Quote",
  "Requote",
  "Requote Van",
  "Requote Bike",
  "Review",
  "Review Van",
  "Review Bike",
  "Individual Review",
  "Other Site",
  "Van",
  "Bike",
  "Sale",
];

export default function Dashboard() {
  const specificDateRef = useRef<HTMLInputElement>(null);
  const dashboardData = useDashboardData();
  const {
    sessionUser,
    profile,
    loading,
    recordsLoading,
    initialFetchDone,
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
    deleteRecords,
    updateRecord,
    createUser,
    resetUserPassword,
    deleteUser,
    adminUpdateUserProfile,
    completeFirstTimeSetup,
    handleLogout,
    auditLogs,
    auditLogsLoading,
    fetchAuditLogs,
    logActivity,
  } = dashboardData;

  // Tabs: 'entry' (Daily Entry), 'monthly' (Month's Data), 'users' (User Management), 'analytics' (Analytics), 'audit_logs' (Audit Logs), 'rules' (Quote Rules)
  const [activeTab, setActiveTab] = useState<
    "entry" | "monthly" | "users" | "analytics" | "audit_logs" | "rules"
  >("entry");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Load active tab preference in localStorage on mount or when profile loads
  useEffect(() => {
    const savedTab = localStorage.getItem("quotes_sales_active_tab");
    if (
      savedTab &&
      (savedTab === "entry" ||
        savedTab === "monthly" ||
        savedTab === "users" ||
        savedTab === "analytics" ||
        savedTab === "audit_logs" ||
        savedTab === "rules")
    ) {
      if (
        (savedTab === "users" || savedTab === "analytics" || savedTab === "audit_logs") &&
        profile?.role !== "admin"
      ) {
        setActiveTab("entry");
      } else {
        setActiveTab(
          savedTab as "entry" | "monthly" | "users" | "analytics" | "audit_logs" | "rules",
        );
      }
    }
  }, [profile]);

  const handleTabChange = (
    tab: "entry" | "monthly" | "users" | "analytics" | "audit_logs" | "rules",
  ) => {
    if (
      (tab === "users" || tab === "analytics" || tab === "audit_logs") &&
      profile?.role !== "admin"
    ) {
      return;
    }
    setActiveTab(tab);
    localStorage.setItem("quotes_sales_active_tab", tab);
  };

  // Fetch audit logs when activeTab becomes 'audit_logs'
  useEffect(() => {
    if (activeTab === "audit_logs" && profile?.role === "admin") {
      fetchAuditLogs();
    }
  }, [activeTab, profile, fetchAuditLogs]);

  // Load and save sidebar width preference
  useEffect(() => {
    const savedSidebarState = localStorage.getItem(
      "quotes_sales_sidebar_collapsed",
    );
    if (savedSidebarState === "true" || savedSidebarState === "false") {
      setIsSidebarCollapsed(savedSidebarState === "true");
    }
  }, []);

  const handleSidebarToggle = () => {
    setIsSidebarCollapsed((current) => {
      const next = !current;
      localStorage.setItem("quotes_sales_sidebar_collapsed", String(next));
      return next;
    });
  };

  // Daily Entry Form State
  const [fileName, setFileName] = useState("");
  const [branchName, setBranchName] = useState("");
  const [codenameInput, setCodenameInput] = useState(
    () => profile?.username || "",
  );
  const [fileType, setFileType] = useState<FileType>("Quote");

  // Admin View Toggle on Tables: 'all' or 'mine'
  const [adminViewMode, setAdminViewMode] = useState<"all" | "mine">("mine");

  // Load active admin view mode preference on mount
  useEffect(() => {
    const savedViewMode = localStorage.getItem("quotes_sales_admin_view_mode");
    if (savedViewMode === "all" || savedViewMode === "mine") {
      setAdminViewMode(savedViewMode);
    }
  }, []);

  const handleAdminViewModeChange = (mode: "all" | "mine") => {
    setAdminViewMode(mode);
    localStorage.setItem("quotes_sales_admin_view_mode", mode);
  };

  // Monthly Table Search Query
  const [searchQuery, setSearchQuery] = useState("");

  // Today's Table Search Query
  const [todaySearchQuery, setTodaySearchQuery] = useState("");

  // User Management Search Query
  const [userSearchQuery, setUserSearchQuery] = useState("");

  // Monthly Table Date filter state
  const [selectedDate, setSelectedDate] = useState("");
  const [dateInputVal, setDateInputVal] = useState("");

  // Sync text input with selectedDate
  useEffect(() => {
    if (selectedDate) {
      const parts = selectedDate.split("-");
      if (parts.length === 3) {
        setDateInputVal(`${parts[2]}-${parts[1]}-${parts[0]}`);
      } else {
        setDateInputVal(formatDate(selectedDate));
      }
    } else {
      setDateInputVal("");
    }
  }, [selectedDate]);

  const handleDateInputChange = (val: string) => {
    const clean = val.replace(/\D/g, "");
    let formatted = "";
    if (clean.length > 0) {
      formatted += clean.substring(0, 2);
    }
    if (clean.length > 2) {
      formatted += "-" + clean.substring(2, 4);
    }
    if (clean.length > 4) {
      formatted += "-" + clean.substring(4, 8);
    }

    setDateInputVal(formatted);

    if (formatted.length === 10) {
      const parts = formatted.split("-");
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const year = parseInt(parts[2], 10);

      if (
        day >= 1 &&
        day <= 31 &&
        month >= 1 &&
        month <= 12 &&
        year >= 1900 &&
        year <= 2100
      ) {
        const dateObj = new Date(year, month - 1, day);
        if (
          dateObj.getFullYear() === year &&
          dateObj.getMonth() === month - 1 &&
          dateObj.getDate() === day
        ) {
          const yyyy = String(year);
          const mm = String(month).padStart(2, "0");
          const dd = String(day).padStart(2, "0");
          const dateValue = `${yyyy}-${mm}-${dd}`;
          setSelectedDate(dateValue);
          setSelectedYear(yyyy);
          setSelectedMonth(mm);
          return;
        }
      }
    }
    setSelectedDate("");
  };

  // Admin Backdated Entry Modal State
  const [isCustomEntryModalOpen, setIsCustomEntryModalOpen] = useState(false);

  // Create User Form State
  const [newCodename, setNewCodename] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newRole, setNewRole] = useState<"user" | "admin">("user");
  const [newPassword, setNewPassword] = useState("1234");
  const [allowedTypesSelect, setAllowedTypesSelect] =
    useState<string[]>(ALL_12_FILE_TYPES);
  const [newCanManageRules, setNewCanManageRules] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(
    null,
  );

  // Edit Record Modal State
  const [editingRecord, setEditingRecord] = useState<RecordItem | null>(null);
  const [editFileName, setEditFileName] = useState("");
  const [editBranchName, setEditBranchName] = useState("");
  const [editCodename, setEditCodename] = useState("");
  const [editFileType, setEditFileType] = useState<FileType>("Quote");
  const [editSaleStatus, setEditSaleStatus] = useState<"SOLD" | "UNSOLD">("SOLD");
  const [editSubmittedDate, setEditSubmittedDate] = useState("");
  const [editSubmittedTime, setEditSubmittedTime] = useState("");
  const [editCanChangeSubmittedAt, setEditCanChangeSubmittedAt] =
    useState(false);

  // Copy Helper States
  const [showReportHelper, setShowReportHelper] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("quotes_sales_show_report_helper");
      if (saved === "true") {
        setShowReportHelper(true);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("quotes_sales_show_report_helper", String(showReportHelper));
    }
  }, [showReportHelper]);
  const [spokeTo, setSpokeTo] = useState("Online");
  const [soldDate, setSoldDate] = useState(() => {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  });
  const [pcUsed, setPcUsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("quotes_sales_pc_used") || "IT-001";
    }
    return "IT-001";
  });
  const [reportNotes, setReportNotes] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("quotes_sales_report_notes");
      return saved || "Direct line, Toyota, Swiftcover, Moja, Marshmellow\n1st Central (After sale – number, pass, email)";
    }
    return "Direct line, Toyota, Swiftcover, Moja, Marshmellow\n1st Central (After sale – number, pass, email)";
  });

  // Sold/Unsold Choice Modal States
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [saleFormDetails, setSaleFormDetails] = useState<{
    fileName: string;
    branchName: string;
    codename: string;
    fileType: FileType;
  } | null>(null);

  const todayUserRecords = useMemo(() => {
    const effectiveCodename = codenameInput || profile?.username || "";
    return records.filter((r) => {
      const isToday = new Date(r.submitted_at).toDateString() === new Date().toDateString();
      const matchesUser = r.codename.toUpperCase() === effectiveCodename.toUpperCase();
      return isToday && matchesUser;
    });
  }, [records, codenameInput, profile?.username]);

  const todayUserSales = useMemo(() => {
    return todayUserRecords.filter((r) => r.file_type === "Sale");
  }, [todayUserRecords]);

  const totalAttempt = todayUserSales.length;

  const soldCount = useMemo(() => {
    return todayUserSales.filter((r) => r.file_name.endsWith(" [SOLD]")).length;
  }, [todayUserSales]);

  const unsoldCount = useMemo(() => {
    return todayUserSales.filter((r) => r.file_name.endsWith(" [UNSOLD]")).length;
  }, [todayUserSales]);

  const allSales = useMemo(() => {
    return todayUserRecords.length > 0 && todayUserRecords.every((r) => r.file_type === "Sale");
  }, [todayUserRecords]);

  const hasSubmissions = todayUserRecords.length > 0;

  const copyBox1 = async () => {
    const plainText = `Helped By: ${codenameInput || profile?.username || ""}\nSpoke to: ${spokeTo}\nSold Date: ${soldDate}\nPC Used: ${pcUsed}`;
    const htmlText = `<b>Helped By:</b> ${codenameInput || profile?.username || ""}<br><b>Spoke to:</b> ${spokeTo}<br><b>Sold Date:</b> ${soldDate}<br><b>PC Used:</b> ${pcUsed}`;

    try {
      if (navigator.clipboard && window.ClipboardItem) {
        const blobHtml = new Blob([htmlText], { type: "text/html" });
        const blobText = new Blob([plainText], { type: "text/plain" });
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": blobHtml,
            "text/plain": blobText,
          })
        ]);
        showToast("success", "Box 1 details copied!");
      } else {
        await navigator.clipboard.writeText(plainText);
        showToast("success", "Box 1 details copied (Plain text)!");
      }
    } catch (err) {
      console.error("Failed to copy rich text:", err);
      try {
        await navigator.clipboard.writeText(plainText);
        showToast("success", "Box 1 details copied (Plain text)!");
      } catch {
        showToast("error", "Failed to copy details.");
      }
    }
  };

  const copyBox2 = async () => {
    const text = `*Sales Report | Date: ${soldDate}*\n*Total Attempt:* ${totalAttempt} Sale\n*Sold:* ${soldCount} Sale\n*Unsold:* ${unsoldCount} Sale`;
    try {
      await navigator.clipboard.writeText(text);
      showToast("success", "Box 2 Sales Summary copied!");
    } catch {
      showToast("error", "Failed to copy.");
    }
  };

  const copyBox4 = async () => {
    const title = allSales && hasSubmissions
      ? `*Sales Report | Date: ${soldDate}*`
      : `*Files Report | Date: ${soldDate}*`;

    const subtitle = allSales && hasSubmissions
      ? `*Total Sale:* ${todayUserRecords.length} Sale`
      : `*Total Files:* ${todayUserRecords.length} File`;

    const separator = `-----------------------`;

    const lines = todayUserRecords.map(r => {
      const cleanName = r.file_name.replace(/ \[(SOLD|UNSOLD)\]$/, '');
      return `${cleanName} ${r.branch_name} ${r.file_type}`;
    });

    const text = `${title}\n${subtitle}\n${separator}\n${lines.join('\n')}`;
    try {
      await navigator.clipboard.writeText(text);
      showToast("success", "Box 4 Detailed Report copied!");
    } catch {
      showToast("error", "Failed to copy.");
    }
  };

  const copyText1 = async () => {
    try {
      await navigator.clipboard.writeText("Online selling process done & updated.");
      showToast("success", 'Copied: "Online selling process done & updated."');
    } catch {
      showToast("error", "Failed to copy.");
    }
  };

  const copyText2 = async () => {
    try {
      await navigator.clipboard.writeText("Saved & Updated.");
      showToast("success", 'Copied: "Saved & Updated."');
    } catch {
      showToast("error", "Failed to copy.");
    }
  };

  const copyNotes = async () => {
    try {
      await navigator.clipboard.writeText(reportNotes);
      showToast("success", "Notes copied!");
    } catch {
      showToast("error", "Failed to copy.");
    }
  };

  const handleNotesChange = (val: string) => {
    setReportNotes(val);
    localStorage.setItem("quotes_sales_report_notes", val);
  };

  const handlePcUsedChange = (val: string) => {
    setPcUsed(val);
    localStorage.setItem("quotes_sales_pc_used", val);
  };

  // State for resetting user password is now handled inside EditProfileModal
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);

  // Admin Editing User Profile State
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [editUserFullName, setEditUserFullName] = useState("");
  const [editUserRole, setEditUserRole] = useState<"user" | "admin">("user");
  const [editUserAllowedTypes, setEditUserAllowedTypes] = useState<string[]>(
    [],
  );
  const [editUserCanManageRules, setEditUserCanManageRules] = useState(false);

  // User deletion state for confirmation modal
  const [deletingUserAccount, setDeletingUserAccount] = useState<{
    id: string;
    username: string;
  } | null>(null);

  // Record deletion state for confirmation modal
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null);

  // Bulk record deletion state for confirmation modal
  const [bulkDeletingRecordIds, setBulkDeletingRecordIds] = useState<string[] | null>(null);

  // Force Change Password / Onboarding Customization Modal State
  const [ownFullName, setOwnFullName] = useState(
    () => profile?.full_name || "",
  );
  const [ownCodename, setOwnCodename] = useState(() => profile?.username || "");
  const [ownPassword, setOwnPassword] = useState("");
  const [ownConfirmPassword, setOwnConfirmPassword] = useState("");
  const [showOwnPass, setShowOwnPass] = useState(false);
  const [showOwnConfirmPass, setShowOwnConfirmPass] = useState(false);

  // Real-time password feedback (6 to 12 characters, matching check)
  const passwordFeedback = useMemo(() => {
    if (!ownPassword) return null;
    if (ownPassword.length < 6 || ownPassword.length > 12) {
      return {
        text: "Password must be 6 to 12 characters long",
        isError: true,
      };
    }
    if (!ownConfirmPassword) {
      return { text: "Please confirm password", isError: true };
    }
    if (ownPassword !== ownConfirmPassword) {
      return { text: "Passwords do not match", isError: true };
    }
    return { text: "Passwords match", isError: false };
  }, [ownPassword, ownConfirmPassword]);

  // Local helper: Set codename inputs when profile loads
  useEffect(() => {
    if (profile) {
      if (!codenameInput) setCodenameInput(profile.username);
      if (!ownCodename) setOwnCodename(profile.username);
      if (!ownFullName) setOwnFullName(profile.full_name || "");

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
    availableDates.forEach((d) => {
      yearsSet.add(d.year);
    });
    return Array.from(yearsSet).sort(
      (a, b) => parseInt(b, 10) - parseInt(a, 10),
    );
  }, [availableDates]);

  const dynamicMonths = useMemo(() => {
    const allMonthsMap: { [key: string]: string } = {
      "01": "January",
      "02": "February",
      "03": "March",
      "04": "April",
      "05": "May",
      "06": "June",
      "07": "July",
      "08": "August",
      "09": "September",
      "10": "October",
      "11": "November",
      "12": "December",
    };
    const monthsForYear = availableDates
      .filter((d) => d.year === selectedYear)
      .map((d) => d.month);
    const uniqueMonths = Array.from(new Set(monthsForYear)).sort(
      (a, b) => parseInt(a, 10) - parseInt(b, 10),
    );
    return uniqueMonths.map((m) => ({
      val: m,
      name: allMonthsMap[m] || m,
    }));
  }, [availableDates, selectedYear]);

  // Adjust selected month when selected year changes and month is no longer valid
  useEffect(() => {
    const isValid = dynamicMonths.some((m) => m.val === selectedMonth);
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
    return records.filter((r) => {
      // Admin filter mode
      if (
        profile?.role === "admin" &&
        adminViewMode === "mine" &&
        r.user_id !== sessionUser?.id
      ) {
        return false;
      }
      // Specific Date filter
      if (selectedDate) {
        const recordDate = new Date(r.submitted_at).toLocaleDateString("en-CA");
        if (recordDate !== selectedDate) {
          return false;
        }
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        // Check if search query matches a known file type exactly (case-insensitive)
        const matchedFileType = ALL_12_FILE_TYPES.find(
          (ft) => ft.toLowerCase() === q,
        );

        if (matchedFileType) {
          // If search is for a known file type, filter by that type only
          if (r.file_type !== matchedFileType) {
            return false;
          }
        } else {
          // Otherwise, search in name, branch, and codename fields only
          const matchFileName = r.file_name.toLowerCase().includes(q);
          const matchBranch = r.branch_name.toLowerCase().includes(q);
          const matchCodename = r.codename.toLowerCase().includes(q);
          if (!matchFileName && !matchBranch && !matchCodename) {
            return false;
          }
        }
      }
      return true;
    });
  }, [records, adminViewMode, selectedDate, searchQuery, profile, sessionUser]);

  // Today's entries (submitted on the current local day)
  const todayRecords = useMemo(() => {
    const todayStr = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD local format
    return records.filter((r) => {
      // Admin filter mode
      if (
        profile?.role === "admin" &&
        adminViewMode === "mine" &&
        r.user_id !== sessionUser?.id
      ) {
        return false;
      }
      const recordDate = new Date(r.submitted_at).toLocaleDateString("en-CA");
      return recordDate === todayStr;
    });
  }, [records, adminViewMode, profile, sessionUser]);

  // Filtered entries for Today's list table
  const todayFilteredRecords = useMemo(() => {
    return todayRecords.filter((r) => {
      if (todaySearchQuery) {
        const q = todaySearchQuery.toLowerCase().trim();
        // Check if search query matches a known file type exactly (case-insensitive)
        const matchedFileType = ALL_12_FILE_TYPES.find(
          (ft) => ft.toLowerCase() === q,
        );

        if (matchedFileType) {
          // If search is for a known file type, filter by that type only
          if (r.file_type !== matchedFileType) {
            return false;
          }
        } else {
          // Otherwise, search in name, branch, and codename fields only
          const matchFileName = r.file_name.toLowerCase().includes(q);
          const matchBranch = r.branch_name.toLowerCase().includes(q);
          const matchCodename = r.codename.toLowerCase().includes(q);
          if (!matchFileName && !matchBranch && !matchCodename) {
            return false;
          }
        }
      }
      return true;
    });
  }, [todayRecords, todaySearchQuery]);

  // Filtered users for User Management Tab
  const filteredProfiles = useMemo(() => {
    return profilesList.filter((u) => {
      if (!userSearchQuery) return true;
      const q = userSearchQuery.toLowerCase().trim();
      const nameMatch = (u.full_name || "").toLowerCase().includes(q);
      const codenameMatch = u.username.toLowerCase().includes(q);
      const roleMatch = u.role.toLowerCase().includes(q);
      return nameMatch || codenameMatch || roleMatch;
    });
  }, [profilesList, userSearchQuery]);

  // Statistics calculation for today's entries (filtered by search terms)
  const todayStats = useMemo(() => {
    return calculateSummaryStats(todayFilteredRecords);
  }, [todayFilteredRecords]);

  // Statistics calculation for monthly entries (filtered by search query)
  const monthlyStats = useMemo(() => {
    return calculateSummaryStats(monthlyFilteredRecords);
  }, [monthlyFilteredRecords]);

  // Export handlers
  const handleExportTodayExcel = () => {
    const todayStr = new Date().toLocaleDateString("en-CA");
    exportToCSV(todayFilteredRecords, `Today_Logs_${todayStr}`);
    logActivity(
      "EXPORT_EXCEL",
      null,
      `Exported today's records (Count: ${todayFilteredRecords.length}) to Excel`
    );
  };

  const handleExportMonthlyExcel = () => {
    const monthName = new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1, 1).toLocaleString('en-US', { month: 'long' });
    exportToCSV(monthlyFilteredRecords, `Monthly_Logs_${monthName}_${selectedYear}`);
    logActivity(
      "EXPORT_EXCEL",
      null,
      `Exported monthly records for ${monthName} ${selectedYear} (Count: ${monthlyFilteredRecords.length}) to Excel`
    );
  };

  // Clear filters
  const handleClearFilters = () => {
    setSearchQuery("");
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
      const [year, month] = dateValue.split("-");
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
    submittedAtDate: string,
  ): Promise<boolean> => {
    if (!userId) {
      showToast("error", "Please select a user.");
      return false;
    }
    if (!submittedAtDate) {
      showToast("error", "Please select a submission date.");
      return false;
    }

    // For non-admin mode, use currentUserProfile; for admin mode, look up in profilesList
    const targetProfile =
      profile?.role === "admin"
        ? profilesList.find((p) => p.id === userId)
        : userId === profile?.id
          ? profile
          : null;

    if (!targetProfile) {
      showToast("error", "Selected user not found.");
      return false;
    }

    const formValidation = validator.validateRecordForm({
      file_name: fileName,
      branch_name: branchName,
      codename: targetProfile.username,
      file_type: fileType,
    });

    if (!formValidation.isValid) {
      showToast("error", formValidation.errors[0]);
      return false;
    }

    const now = new Date();
    const timePart = now.toTimeString().split(" ")[0]; // HH:MM:SS
    const customSubmittedAt = new Date(
      `${submittedAtDate}T${timePart}`,
    ).toISOString();

    const success = await addRecord(
      fileName,
      branchName,
      targetProfile.username,
      fileType,
      userId,
      customSubmittedAt,
    );

    return success;
  };

  const handleClearTodayFilters = () => {
    setTodaySearchQuery("");
  };

  const submitNewEntry = async (
    fName: string,
    bName: string,
    cName: string,
    fType: FileType,
  ) => {
    const success = await addRecord(fName, bName, cName, fType);
    if (success) {
      setFileName("");
      setBranchName("");
      // Keep codename, but reset type to default first allowed type
      if (profile?.allowed_types && profile.allowed_types.length > 0) {
        setFileType(profile.allowed_types[0] as FileType);
      } else {
        setFileType("Quote");
      }
    }
  };

  const handleConfirmSaleStatus = async (status: "SOLD" | "UNSOLD") => {
    if (!saleFormDetails) return;
    const finalFileName = `${saleFormDetails.fileName} [${status}]`;
    setShowSaleModal(false);
    await submitNewEntry(
      finalFileName,
      saleFormDetails.branchName,
      saleFormDetails.codename,
      saleFormDetails.fileType,
    );
    setSaleFormDetails(null);
  };

  // Submit Daily Entry
  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();

    const formValidation = validator.validateRecordForm({
      file_name: fileName,
      branch_name: branchName,
      codename: codenameInput,
      file_type: fileType,
    });

    if (!formValidation.isValid) {
      showToast("error", formValidation.errors[0]);
      return;
    }

    if (fileType === "Sale") {
      setSaleFormDetails({
        fileName,
        branchName,
        codename: codenameInput,
        fileType,
      });
      setShowSaleModal(true);
    } else {
      await submitNewEntry(fileName, branchName, codenameInput, fileType);
    }
  };

  // Save Record Edits
  const handleSaveEdit = async () => {
    if (!editingRecord) return;

    const validation = validator.validateRecordForm({
      file_name: editFileName,
      branch_name: editBranchName,
      codename: editCodename,
      file_type: editFileType,
    });

    if (!validation.isValid) {
      showToast("error", validation.errors[0]);
      return;
    }

    let editedSubmittedAt: string | undefined;

    if (editCanChangeSubmittedAt) {
      const [dayText, monthText, yearText] = editSubmittedDate.split("-");
      const day = Number(dayText);
      const month = Number(monthText);
      const year = Number(yearText);
      const parsedDate = new Date(year, month - 1, day);

      if (
        !dayText ||
        !monthText ||
        !yearText ||
        dayText.length !== 2 ||
        monthText.length !== 2 ||
        yearText.length !== 4 ||
        isNaN(parsedDate.getTime()) ||
        parsedDate.getFullYear() !== year ||
        parsedDate.getMonth() !== month - 1 ||
        parsedDate.getDate() !== day
      ) {
        showToast("error", "Please enter the date as DD-MM-YYYY.");
        return;
      }

      const timeMatch = editSubmittedTime
        .trim()
        .match(/^(0[1-9]|1[0-2]):([0-5]\d)\s?(AM|PM)$/i);

      if (!timeMatch) {
        showToast("error", "Please enter the time as 09:21 PM/AM.");
        return;
      }

      let hours = Number(timeMatch[1]);
      const minutes = Number(timeMatch[2]);
      const meridiem = timeMatch[3].toUpperCase();

      if (meridiem === "PM" && hours !== 12) hours += 12;
      if (meridiem === "AM" && hours === 12) hours = 0;

      parsedDate.setHours(hours, minutes, 0, 0);
      editedSubmittedAt = parsedDate.toISOString();
    }

    const finalFileName = editFileType === "Sale" ? `${editFileName} [${editSaleStatus}]` : editFileName;
    const success = await updateRecord(
      editingRecord.id,
      finalFileName,
      editBranchName,
      editCodename,
      editFileType,
      editedSubmittedAt,
    );

    if (success) {
      setEditingRecord(null);
    }
  };

  const handleOpenEditRecord = (
    record: RecordItem,
    canChangeSubmittedAt = false,
  ) => {
    const submittedAt = new Date(record.submitted_at);

    setEditingRecord(record);
    const cleanName = record.file_name.replace(/ \[(SOLD|UNSOLD)\]$/, '');
    setEditFileName(cleanName);
    setEditBranchName(record.branch_name);
    setEditCodename(record.codename);
    setEditFileType(record.file_type);
    setEditCanChangeSubmittedAt(canChangeSubmittedAt);

    if (record.file_name.endsWith(" [UNSOLD]")) {
      setEditSaleStatus("UNSOLD");
    } else {
      setEditSaleStatus("SOLD");
    }

    if (!isNaN(submittedAt.getTime())) {
      setEditSubmittedDate(
        `${String(submittedAt.getDate()).padStart(2, "0")}-${String(
          submittedAt.getMonth() + 1,
        ).padStart(2, "0")}-${submittedAt.getFullYear()}`,
      );
      const hour24 = submittedAt.getHours();
      const hour12 = hour24 % 12 || 12;
      const meridiem = hour24 >= 12 ? "PM" : "AM";
      setEditSubmittedTime(
        `${String(hour12).padStart(2, "0")}:${String(
          submittedAt.getMinutes(),
        ).padStart(2, "0")} ${meridiem}`,
      );
    } else {
      setEditSubmittedDate("");
      setEditSubmittedTime("");
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
      role: newRole,
    });

    if (!validation.isValid) {
      showToast("error", validation.errors[0]);
      return;
    }

    if (allowedTypesSelect.length === 0) {
      showToast("error", "Please allow at least one file type.");
      return;
    }

    const pw = await createUser(
      newCodename,
      newRole,
      newFullName,
      allowedTypesSelect,
      newCanManageRules,
      newPassword,
    );
    if (pw) {
      setGeneratedPassword(null);
      setNewCodename("");
      setNewFullName("");
      setNewRole("user");
      setNewPassword("1234");
      setAllowedTypesSelect(ALL_12_FILE_TYPES);
      setNewCanManageRules(false);
      setIsAddUserModalOpen(false);
    }
  };

  // Admin reset password handled inline inside EditProfileModal

  // Logged-in user complete first-time setup (Customizes username, full name, password)
  const handleFirstTimeSetup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!ownFullName.trim()) {
      showToast("error", "Please enter your full name.");
      return;
    }
    if (!ownCodename.trim() || ownCodename.trim().length < 3) {
      showToast("error", "Codename must be at least 3 characters long.");
      return;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(ownCodename.trim())) {
      showToast(
        "error",
        "Codename can only contain English letters, numbers, - and _.",
      );
      return;
    }

    const validation = validator.validateOnboardingPassword(ownPassword);
    if (!validation.isValid) {
      showToast("error", validation.errors[0]);
      return;
    }
    if (ownPassword !== ownConfirmPassword) {
      showToast("error", "Password confirmation does not match.");
      return;
    }

    const success = await completeFirstTimeSetup(
      ownCodename,
      ownFullName,
      ownPassword,
    );
    if (success) {
      setOwnPassword("");
      setOwnConfirmPassword("");
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
          <span className="text-slate-400 text-xs font-semibold tracking-wider">
            Loading, please wait...
          </span>
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
            <h2 className="text-2xl font-bold text-white bg-clip-text bg-linear-to-r from-blue-400 to-violet-400">
              Profile Settings & Password Change
            </h2>
            <p className="text-xs text-slate-450 mt-1">
              This is your first login. Please verify your details and set a new
              password.
            </p>
          </div>

          <form onSubmit={handleFirstTimeSetup} className="space-y-4">
            <div>
              <label className="flex text-xs font-semibold text-slate-350 mb-1 items-center gap-1">
                <Info className="h-3 w-3 text-blue-500" /> Your Full Name
                {profile?.full_name && profile.full_name.trim() !== "" && (
                  <span className="text-[10px] text-slate-500 font-normal">
                    (Locked - Admin only)
                  </span>
                )}
              </label>
              <input
                type="text"
                required
                disabled={
                  !!(profile?.full_name && profile.full_name.trim() !== "")
                }
                placeholder="e.g. Kamrul Islam"
                value={ownFullName}
                onChange={(e) => setOwnFullName(e.target.value)}
                className="block w-full px-3 py-2 bg-slate-955 border border-slate-800 rounded-lg text-white placeholder-slate-650 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-slate-900/30"
              />
            </div>

            <div>
              <label className="flex text-xs font-semibold text-slate-355 mb-1 items-center gap-1">
                <UserCheck className="h-3 w-3 text-blue-500" /> Your Codename
                {profile?.username && profile.username.trim() !== "" && (
                  <span className="text-[10px] text-slate-500 font-normal">
                    (Locked - Admin only)
                  </span>
                )}
              </label>
              <input
                type="text"
                required
                disabled={
                  !!(profile?.username && profile.username.trim() !== "")
                }
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
                  type={showOwnPass ? "text" : "password"}
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
                  {showOwnPass ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-355 mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showOwnConfirmPass ? "text" : "password"}
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
                  {showOwnConfirmPass ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {passwordFeedback && (
                <p
                  className={`text-xs mt-1.5 font-medium ${passwordFeedback.isError ? "text-red-450" : "text-emerald-450"}`}
                >
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
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 border border-transparent rounded-lg shadow-md text-xs font-semibold text-white bg-linear-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 disabled:opacity-50 transition-all cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="animate-spin h-4 w-4" /> Saving...
                  </>
                ) : (
                  "Save Information"
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
        <aside
          className={`w-full shrink-0 bg-slate-900/50 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-4 shadow-xl transition-all duration-300 ease-out ${
            isSidebarCollapsed ? "md:w-20" : "md:w-64"
          }`}
        >
          <div
            className={`flex items-center gap-2 mb-3 ${
              isSidebarCollapsed
                ? "justify-between md:justify-center md:gap-0"
                : "justify-between"
            }`}
          >
            <span
              className={`text-[11px] font-semibold uppercase tracking-wider text-slate-500 transition-all duration-200 ${
                isSidebarCollapsed
                  ? "md:w-0 md:opacity-0 md:overflow-hidden"
                  : "opacity-100"
              }`}
            >
              Menu
            </span>
            <button
              type="button"
              onClick={handleSidebarToggle}
              title={isSidebarCollapsed ? "Open sidebar" : "Close sidebar"}
              aria-label={
                isSidebarCollapsed ? "Open sidebar" : "Close sidebar"
              }
              className="h-8 w-8 shrink-0 inline-flex items-center justify-center rounded-lg border border-slate-800 bg-slate-955/60 text-slate-400 hover:text-white hover:bg-slate-850 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
            >
              {isSidebarCollapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </button>
          </div>
          <div className="space-y-1">
            <button
              onClick={() => handleTabChange("entry")}
              title={isSidebarCollapsed ? "Daily Entry" : undefined}
              className={`w-full flex items-center rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer ${
                isSidebarCollapsed
                  ? "justify-center gap-3 md:gap-0 px-3 py-3"
                  : "gap-3 px-4 py-3"
              } ${
                activeTab === "entry"
                  ? "bg-blue-600/15 border border-blue-500/30 text-blue-400 shadow-md shadow-blue-900/5"
                  : "text-slate-400 hover:bg-slate-850/80 hover:text-white border border-transparent"
              }`}
            >
              <FileText className="h-5 w-5 shrink-0" />
              <span
                className={`whitespace-nowrap transition-all duration-200 ${
                  isSidebarCollapsed
                    ? "md:w-0 md:opacity-0 md:overflow-hidden"
                    : "opacity-100"
                }`}
              >
                Daily Entry
              </span>
            </button>
            <button
              onClick={() => handleTabChange("monthly")}
              title={isSidebarCollapsed ? "Monthly Entry List" : undefined}
              className={`w-full flex items-center rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer ${
                isSidebarCollapsed
                  ? "justify-center gap-3 md:gap-0 px-3 py-3"
                  : "gap-3 px-4 py-3"
              } ${
                activeTab === "monthly"
                  ? "bg-blue-600/15 border border-blue-500/30 text-blue-400 shadow-md shadow-blue-900/5"
                  : "text-slate-400 hover:bg-slate-850/80 hover:text-white border border-transparent"
              }`}
            >
              <Calendar className="h-5 w-5 shrink-0" />
              <span
                className={`whitespace-nowrap transition-all duration-200 ${
                  isSidebarCollapsed
                    ? "md:w-0 md:opacity-0 md:overflow-hidden"
                    : "opacity-100"
                }`}
              >
                Monthly Entry List
              </span>
            </button>
            <button
              onClick={() => handleTabChange("rules")}
              title={isSidebarCollapsed ? "Quote Rules" : undefined}
              className={`w-full flex items-center rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer ${
                isSidebarCollapsed
                  ? "justify-center gap-3 md:gap-0 px-3 py-3"
                  : "gap-3 px-4 py-3"
              } ${
                activeTab === "rules"
                  ? "bg-blue-600/15 border border-blue-500/30 text-blue-400 shadow-md shadow-blue-900/5"
                  : "text-slate-400 hover:bg-slate-850/80 hover:text-white border border-transparent"
              }`}
            >
              <BookOpen className="h-5 w-5 shrink-0" />
              <span
                className={`whitespace-nowrap transition-all duration-200 ${
                  isSidebarCollapsed
                    ? "md:w-0 md:opacity-0 md:overflow-hidden"
                    : "opacity-100"
                }`}
              >
                Quote Rules
              </span>
            </button>
            {profile?.role === "admin" && (
              <button
                onClick={() => handleTabChange("analytics")}
                title={isSidebarCollapsed ? "Analytics" : undefined}
                className={`w-full flex items-center rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer ${
                  isSidebarCollapsed
                    ? "justify-center gap-3 md:gap-0 px-3 py-3"
                    : "gap-3 px-4 py-3"
                } ${
                  activeTab === "analytics"
                    ? "bg-blue-600/15 border border-blue-500/30 text-blue-400 shadow-md shadow-blue-900/5"
                    : "text-slate-400 hover:bg-slate-850/80 hover:text-white border border-transparent"
                }`}
              >
                <TrendingUp className="h-5 w-5 shrink-0" />
                <span
                  className={`whitespace-nowrap transition-all duration-200 ${
                    isSidebarCollapsed
                      ? "md:w-0 md:opacity-0 md:overflow-hidden"
                      : "opacity-100"
                  }`}
                >
                  Analytics
                </span>
              </button>
            )}
            {profile?.role === "admin" && (
              <button
                onClick={() => handleTabChange("users")}
                title={isSidebarCollapsed ? "User Management" : undefined}
                className={`w-full flex items-center rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer ${
                  isSidebarCollapsed
                    ? "justify-center gap-3 md:gap-0 px-3 py-3"
                    : "gap-3 px-4 py-3"
                } ${
                  activeTab === "users"
                    ? "bg-blue-600/15 border border-blue-500/30 text-blue-400 shadow-md shadow-blue-900/5"
                    : "text-slate-400 hover:bg-slate-850/80 hover:text-white border border-transparent"
                }`}
              >
                <Users className="h-5 w-5 shrink-0" />
                <span
                  className={`whitespace-nowrap transition-all duration-200 ${
                    isSidebarCollapsed
                      ? "md:w-0 md:opacity-0 md:overflow-hidden"
                      : "opacity-100"
                  }`}
                >
                  User Management
                </span>
              </button>
            )}
            {profile?.role === "admin" && (
              <button
                onClick={() => handleTabChange("audit_logs")}
                title={isSidebarCollapsed ? "Audit Logs" : undefined}
                className={`w-full flex items-center rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer ${
                  isSidebarCollapsed
                    ? "justify-center gap-3 md:gap-0 px-3 py-3"
                    : "gap-3 px-4 py-3"
                } ${
                  activeTab === "audit_logs"
                    ? "bg-blue-600/15 border border-blue-500/30 text-blue-400 shadow-md shadow-blue-900/5"
                    : "text-slate-400 hover:bg-slate-850/80 hover:text-white border border-transparent"
                }`}
              >
                <ScrollText className="h-5 w-5 shrink-0" />
                <span
                  className={`whitespace-nowrap transition-all duration-200 ${
                    isSidebarCollapsed
                      ? "md:w-0 md:opacity-0 md:overflow-hidden"
                      : "opacity-100"
                  }`}
                >
                  Audit Logs
                </span>
              </button>
            )}
          </div>
        </aside>

        {/* Content Area */}
        <section className="flex-1 min-w-0 w-full bg-slate-900/50 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 shadow-xl min-h-125">
          {/* TAB 1: DAILY ENTRY */}
          {activeTab === "entry" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white">New File Entry</h2>
                <p className="text-xs text-slate-450 mt-1">
                  Fill out the form below to submit file data.
                </p>
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
                      Date:{" "}
                      {new Date().toLocaleDateString("en-US", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>

                  {/* Filter Controls */}
                  <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
                    <button
                      onClick={() => setShowReportHelper(!showReportHelper)}
                      className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg border transition-all cursor-pointer shadow-md text-xs font-semibold ${
                        showReportHelper
                          ? "border-blue-500/35 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 hover:text-blue-300"
                          : "border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-white"
                      }`}
                      title="Copy Helper Dashboard"
                    >
                      <ScrollText className="h-3.5 w-3.5" />
                      <span>Copy Helper</span>
                    </button>

                    <button
                      onClick={handleExportTodayExcel}
                      className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition-all cursor-pointer shadow-md"
                      title="Export to Excel"
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5" />
                      <span>Excel</span>
                    </button>

                    {profile?.role === "admin" && (
                      <AdminViewToggle
                        viewMode={adminViewMode}
                        onChange={handleAdminViewModeChange}
                      />
                    )}
                  </div>
                </div>

                {showReportHelper ? (
                  <div className="bg-slate-955/20 border border-slate-850 rounded-2xl p-5 space-y-6 animate-fade-in">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="text-md font-bold text-white flex items-center gap-2">
                          <ScrollText className="h-4.5 w-4.5 text-blue-500" />
                          Sales & Files Copy Helper Dashboard
                        </h4>
                        <p className="text-[11px] text-slate-450 mt-0.5">
                          Copy pre-formatted logs for Slack, WhatsApp, or reports.
                        </p>
                      </div>
                      <button
                        onClick={() => setShowReportHelper(false)}
                        className="flex items-center justify-center p-2 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer"
                        title="Back to Table"
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {/* Box 1: Info */}
                      <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-4.5 relative group">
                        <button
                          onClick={copyBox1}
                          className="absolute right-3 top-3 p-1.5 bg-slate-955 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white rounded-lg transition-all cursor-pointer shadow-md"
                          title="Copy to Clipboard"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <h5 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-3">Box 1: Session Info</h5>
                        <div className="space-y-2.5 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 font-medium">Helped By:</span>
                            <span className="text-white font-bold">{codenameInput || profile?.username || "N/A"}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 font-medium">Spoke to:</span>
                            <input
                              type="text"
                              value={spokeTo}
                              onChange={(e) => setSpokeTo(e.target.value)}
                              className="w-32 px-2.5 py-1.5 bg-slate-955 border border-slate-800 rounded-lg text-white text-right placeholder-slate-650 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 font-medium">Sold Date:</span>
                            <input
                              type="text"
                              value={soldDate}
                              onChange={(e) => setSoldDate(e.target.value)}
                              className="w-32 px-2.5 py-1.5 bg-slate-955 border border-slate-800 rounded-lg text-white text-right placeholder-slate-650 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 font-medium">PC Used:</span>
                            <input
                              type="text"
                              value={pcUsed}
                              onChange={(e) => handlePcUsedChange(e.target.value)}
                              className="w-32 px-2.5 py-1.5 bg-slate-955 border border-slate-800 rounded-lg text-white text-right placeholder-slate-650 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Box 3: Quick Static Texts */}
                      <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-4.5 flex flex-col justify-between">
                        <h5 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-3">Box 3: Quick Copy Actions</h5>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-2 bg-slate-955 border border-slate-850 rounded-lg group">
                            <span className="text-xs text-slate-200">Online selling process done & updated.</span>
                            <button
                              onClick={copyText1}
                              className="p-1 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-md transition-all cursor-pointer"
                              title="Copy text"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                          </div>
                          <div className="flex items-center justify-between p-2 bg-slate-955 border border-slate-850 rounded-lg group">
                            <span className="text-xs text-slate-200">Saved & Updated.</span>
                            <button
                              onClick={copyText2}
                              className="p-1 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-md transition-all cursor-pointer"
                              title="Copy text"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Box 2: Sales Attempt stats */}
                      <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-4.5 relative group">
                        <button
                          onClick={copyBox2}
                          className="absolute right-3 top-3 p-1.5 bg-slate-955 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white rounded-lg transition-all cursor-pointer shadow-md"
                          title="Copy to Clipboard"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <h5 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-3">Box 2: Sales Summary</h5>
                        <div className="space-y-2.5 text-xs">
                          <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                            <span className="text-slate-200 font-bold">Sales Report | Date: {soldDate}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 font-medium">Total Attempt:</span>
                            <span className="text-white font-semibold">{totalAttempt} Sale</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-emerald-400 font-medium">Sold:</span>
                            <span className="text-emerald-300 font-semibold">{soldCount} Sale</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-rose-450 font-medium">Unsold:</span>
                            <span className="text-rose-350 font-semibold">{unsoldCount} Sale</span>
                          </div>
                        </div>
                      </div>

                      {/* Box 4: Detail list of today's files */}
                      <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-4.5 relative group">
                        <button
                          onClick={copyBox4}
                          className="absolute right-3 top-3 p-1.5 bg-slate-955 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white rounded-lg transition-all cursor-pointer shadow-md"
                          title="Copy to Clipboard"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <h5 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-3">Box 4: Detailed Report</h5>
                        <div className="space-y-2.5 text-xs max-h-48 overflow-y-auto pr-1">
                          <div className="flex flex-col border-b border-slate-850 pb-2">
                            <span className="text-slate-200 font-bold">
                              {allSales && hasSubmissions ? 'Sales Report' : 'Files Report'} | Date: {soldDate}
                            </span>
                            <span className="text-slate-450 text-[10px] mt-0.5 font-semibold">
                              {allSales && hasSubmissions 
                                ? `Total Sale: ${todayUserRecords.length} Sale` 
                                : `Total Files: ${todayUserRecords.length} File`}
                            </span>
                          </div>
                          <div className="border-t border-slate-800/40 my-1 pt-1.5 space-y-1">
                            {todayUserRecords.length > 0 ? (
                              todayUserRecords.map((r, i) => {
                                const cleanName = r.file_name.replace(/ \[(SOLD|UNSOLD)\]$/, '');
                                return (
                                  <div key={r.id || i} className="text-slate-300 font-mono text-[11px] py-0.5">
                                    {cleanName} {r.branch_name} {r.file_type}
                                  </div>
                                );
                              })
                            ) : (
                              <div className="text-slate-500 italic text-[11px]">No entries today</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Comment/Important Notes Box */}
                    <div className="bg-slate-900/40 border border-slate-850 rounded-xl p-4 space-y-2.5">
                      <div className="flex justify-between items-center">
                        <h5 className="text-xs font-bold text-rose-500 uppercase tracking-wider">Important Notes</h5>
                        <button
                          onClick={copyNotes}
                          className="p-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white rounded-md transition-all cursor-pointer"
                          title="Copy Notes"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                      <textarea
                        value={reportNotes}
                        onChange={(e) => handleNotesChange(e.target.value)}
                        className="w-full h-20 bg-slate-955 border border-slate-800 rounded-lg text-rose-400 placeholder-slate-650 focus:outline-none focus:ring-1 focus:ring-rose-500/30 text-xs p-3 font-semibold resize-none"
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Search Filters for Today's Table - BEFORE Stats */}
                    <div className="space-y-2">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search name, codename, branch..."
                          value={todaySearchQuery}
                          onChange={(e) => setTodaySearchQuery(e.target.value)}
                          className="block w-full pl-8 pr-8 py-1.5 bg-slate-955 border border-slate-800 rounded-lg text-white placeholder-slate-650 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs h-8"
                        />
                        <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-555" />
                        {todaySearchQuery && (
                          <button
                            type="button"
                            onClick={handleClearTodayFilters}
                            className="absolute right-2.5 top-1.5 flex items-center justify-center p-0.5 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-all duration-200 hover:scale-110 active:scale-90 cursor-pointer"
                            title="Clear search"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Stat pills summary Component */}
                    <StatsGrid stats={todayStats} isLoading={recordsLoading} />

                    {/* Today's Records Table Component */}
                    <RecordsTable
                      records={todayFilteredRecords}
                      emptyMessage="No file entries for today matching the filters."
                      showDate={false}
                      onEdit={(record) => handleOpenEditRecord(record, false)}
                      onDelete={setDeletingRecordId}
                      isLoading={recordsLoading}
                      currentUserId={sessionUser?.id}
                      isAdmin={profile?.role === "admin"}
                      onBulkDelete={setBulkDeletingRecordIds}
                    />
                  </>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: MONTHLY LIST */}
          {activeTab === "monthly" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <div>
                  <h2 className="text-xl font-bold text-white">
                    Monthly Quotes & Sales Logs
                  </h2>
                  <p className="text-xs text-slate-450 mt-1">
                    Filter and view data for all months and years.
                  </p>
                </div>

                {/* View toggle & Custom Entry Controls */}
                <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
                  <button
                    onClick={handleExportMonthlyExcel}
                    className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition-all cursor-pointer shadow-md"
                    title="Export to Excel"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                    <span>Excel</span>
                  </button>

                  <button
                    onClick={() => setIsCustomEntryModalOpen(true)}
                    className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg shadow-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 hover:scale-[1.03] active:scale-[0.97] transition-all duration-200 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Custom Entry</span>
                  </button>
                  {profile?.role === "admin" && (
                    <AdminViewToggle
                      viewMode={adminViewMode}
                      onChange={handleAdminViewModeChange}
                    />
                  )}
                </div>
              </div>

              {/* Date selection row & Filters */}
              <div className="space-y-4">
                <div className="bg-slate-955/40 p-4 rounded-2xl border border-slate-850 grid grid-cols-1 md:grid-cols-12 gap-3.5 items-end w-full">
                  {/* 1. Search Box */}
                  <div className="md:col-span-4">
                    <label className="block text-[11px] font-semibold text-slate-350 mb-1">
                      Search
                    </label>
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
                    <label className="block text-[11px] font-semibold text-slate-350 mb-1">
                      Year
                    </label>
                    <select
                      value={selectedYear}
                      disabled={!!selectedDate}
                      onChange={(e) => {
                        setSelectedYear(e.target.value);
                        setSelectedDate(""); // Reset specific date filter
                      }}
                      className="block w-full px-3 py-2 bg-slate-955 border border-slate-800 rounded-lg text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-900/30 h-9"
                    >
                      {dynamicYears.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 3. Month Selection */}
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-355 mb-1">
                      Month
                    </label>
                    <select
                      value={selectedMonth}
                      disabled={!!selectedDate}
                      onChange={(e) => {
                        setSelectedMonth(e.target.value);
                        setSelectedDate(""); // Reset specific date filter
                      }}
                      className="block w-full px-3 py-2 bg-slate-955 border border-slate-800 rounded-lg text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-900/30 h-9"
                    >
                      {dynamicMonths.map((m) => (
                        <option key={m.val} value={m.val}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 4. Specific Date Input */}
                  <div className="md:col-span-4">
                    <label className="block text-[11px] font-semibold text-slate-350 mb-1">
                      Specific Date
                    </label>
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
                          setSelectedDate("");
                          setDateInputVal("");
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
              <StatsGrid stats={monthlyStats} isLoading={recordsLoading} />

              {/* Monthly Table Component */}
              <RecordsTable
                records={monthlyFilteredRecords}
                emptyMessage="No file records found matching the filters."
                showDate={true}
                onEdit={(record) => handleOpenEditRecord(record, true)}
                onDelete={setDeletingRecordId}
                isLoading={recordsLoading}
                currentUserId={sessionUser?.id}
                isAdmin={profile?.role === "admin"}
                onBulkDelete={setBulkDeletingRecordIds}
              />
            </div>
          )}

          {/* TAB 3: USER MANAGEMENT (Admin Only) */}
          {activeTab === "users" && profile?.role === "admin" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white">
                    User Accounts & File Permissions Management
                  </h2>
                  <p className="text-xs text-slate-450 mt-1">
                    Create new staff accounts and select which file types they
                    are permitted to submit.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setGeneratedPassword(null);
                    setIsAddUserModalOpen(true);
                  }}
                  className="sm:self-end flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl shadow-lg text-xs font-semibold text-white bg-linear-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 shadow-blue-950/20 hover:scale-[1.03] active:scale-[0.97] transition-all duration-200 shrink-0 cursor-pointer"
                >
                  <UserPlus className="h-4 w-4" /> Add User
                </button>
              </div>

              {/* Search Bar for Users */}
              <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-850 flex flex-col md:flex-row gap-3 items-center">
                <div className="relative flex-1 w-full">
                  <input
                    type="text"
                    placeholder="Search users by name, codename, or role (e.g. admin or user)..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="block w-full pl-8 pr-8 py-2 bg-slate-955 border border-slate-800 rounded-lg text-white placeholder-slate-650 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs h-9"
                  />
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-555" />
                  {userSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setUserSearchQuery("")}
                      className="absolute right-2.5 top-2.5 flex items-center justify-center p-0.5 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-all cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Full Width Users List Table */}
              <div className="bg-slate-950/40 p-5 rounded-2xl border border-slate-850 space-y-4 overflow-x-auto">
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Shield className="h-4 w-4 text-blue-500" />
                  Registered Users List ({filteredProfiles.length})
                </h3>

                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-955 border-b border-slate-850 text-slate-400 font-semibold uppercase">
                      <th className="px-4 py-3">Codename</th>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Categories</th>
                      <th className="px-4 py-3">Rules Perm</th>
                      <th className="px-4 py-3 text-right">Manage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850 text-slate-355">
                    {!initialFetchDone ? (
                      Array.from({ length: 4 }).map((_, idx) => (
                        <tr key={idx} className="hover:bg-slate-900/10 border-b border-slate-850/40">
                          <td className="px-4 py-3.5">
                            <div className="h-4 w-16 bg-slate-800 rounded animate-pulse" />
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="h-4 w-28 bg-slate-800 rounded animate-pulse" />
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="h-5 w-14 bg-slate-800/80 rounded-full animate-pulse" />
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="h-4 w-48 bg-slate-800 rounded animate-pulse" />
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <div className="flex justify-end gap-2">
                              <div className="h-7 w-12 bg-slate-800/80 rounded-lg animate-pulse" />
                              <div className="h-7 w-12 bg-slate-800/80 rounded-lg animate-pulse" />
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : filteredProfiles.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-8 text-center text-slate-550"
                        >
                          No registered users found.
                        </td>
                      </tr>
                    ) : (
                      filteredProfiles.map((u) => (
                        <tr
                          key={u.id}
                          className="hover:bg-slate-900/30 transition-all"
                        >
                          <td className="px-4 py-2.5 font-bold text-white">
                            {u.username.toUpperCase()}
                          </td>
                          <td className="px-4 py-2.5">{u.full_name || "-"}</td>
                          <td className="px-4 py-2.5">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                u.role === "admin"
                                  ? "bg-purple-950/50 border-purple-900/60 text-purple-450"
                                  : "bg-blue-950/50 border-blue-900/60 text-blue-450"
                              }`}
                            >
                              {u.role === "admin" ? "Admin" : "User"}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex flex-wrap gap-1">
                              {(u.allowed_types || []).map((t) => (
                                <span
                                  key={t}
                                  className="bg-slate-900 border border-slate-800 text-slate-400 text-[9px] px-1.5 py-0.5 rounded"
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-2.5">
                            {u.role === "admin" ? (
                              <span className="text-[10px] text-slate-500 italic">Always (Admin)</span>
                            ) : u.can_manage_rules ? (
                              <span className="text-[10px] font-bold text-emerald-450 px-1.5 py-0.5 rounded bg-emerald-950/40 border border-emerald-900/60">
                                Allowed
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-500">Not Allowed</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <div className="flex justify-end gap-2.5 items-center">
                              <button
                                onClick={() => {
                                  setEditingProfile(u);
                                  setEditUserFullName(u.full_name || "");
                                  setEditUserRole(u.role);
                                  setEditUserAllowedTypes(
                                    u.allowed_types || [],
                                  );
                                  setEditUserCanManageRules(u.role === 'admin' ? true : !!u.can_manage_rules);
                                }}
                                className="p-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-400 hover:text-white rounded-lg transition-all duration-200 hover:scale-125 cursor-pointer"
                                title="Edit Profile"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                              {u.id !== sessionUser?.id && (
                                <button
                                  onClick={() => {
                                    setDeletingUserAccount({
                                      id: u.id,
                                      username: u.username,
                                    });
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

          {/* TAB 4: PERFORMANCE ANALYTICS */}
          {activeTab === "analytics" && profile?.role === "admin" && (
            <Suspense fallback={<div className="flex items-center justify-center py-20 gap-2 text-slate-400"><Loader2 className="h-5 w-5 animate-spin" /> Loading Analytics...</div>}>
              <AnalyticsPanel
                records={records}
                profilesList={profilesList}
                profile={profile}
              />
            </Suspense>
          )}

          {/* TAB 5: SYSTEM AUDIT LOGS */}
          {activeTab === "audit_logs" && profile?.role === "admin" && (
            <Suspense fallback={<div className="flex items-center justify-center py-20 gap-2 text-slate-400"><Loader2 className="h-5 w-5 animate-spin" /> Loading Audit Logs...</div>}>
              <AuditLogsPanel
                logs={auditLogs}
                isLoading={auditLogsLoading}
                onRefresh={fetchAuditLogs}
              />
            </Suspense>
          )}

          {/* TAB 6: QUOTE RULES */}
          {activeTab === "rules" && (
            <Suspense fallback={<div className="flex items-center justify-center py-20 gap-2 text-slate-400"><Loader2 className="h-5 w-5 animate-spin" /> Loading Quote Rules...</div>}>
              <QuoteRulesPanel
                profile={profile}
                sessionUser={sessionUser}
                isOnline={isOnline}
                showToast={showToast}
              />
            </Suspense>
          )}
        </section>
      </main>

      {/* MODAL 0: SOLD/UNSOLD CHOICE */}
      {showSaleModal && saleFormDetails && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center px-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-sm shadow-2xl relative text-center space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white mb-2">Sale Status</h3>
              <p className="text-xs text-slate-400">
                Is this sale for <span className="font-semibold text-white">"{saleFormDetails.fileName}"</span> Sold or Unsold?
              </p>
            </div>
            
            <div className="flex gap-3 justify-center max-w-[280px] mx-auto">
              <button
                onClick={() => handleConfirmSaleStatus("UNSOLD")}
                className="flex-1 py-2.5 px-3.5 bg-slate-950 border border-slate-800 hover:border-rose-950/40 hover:bg-rose-950/10 text-slate-300 hover:text-rose-400 font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <XCircle className="h-3.5 w-3.5 stroke-[2] shrink-0" />
                <span>Unsold</span>
              </button>
              <button
                onClick={() => handleConfirmSaleStatus("SOLD")}
                className="flex-1 py-2.5 px-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-md shadow-emerald-950/20 cursor-pointer"
              >
                <CheckCircle className="h-3.5 w-3.5 stroke-[2] shrink-0" />
                <span>Sold</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: EDIT RECORD */}
      {editingRecord && (
        <EditRecordModal
          editFileName={editFileName}
          setEditFileName={setEditFileName}
          editBranchName={editBranchName}
          setEditBranchName={setEditBranchName}
          editCodename={editCodename}
          setEditCodename={setEditCodename}
          editFileType={editFileType}
          setEditFileType={setEditFileType}
          canEditSubmittedAt={editCanChangeSubmittedAt}
          editSubmittedDate={editSubmittedDate}
          setEditSubmittedDate={setEditSubmittedDate}
          editSubmittedTime={editSubmittedTime}
          setEditSubmittedTime={setEditSubmittedTime}
          allowedCategories={allowedCategories}
          onClose={() => setEditingRecord(null)}
          onSave={handleSaveEdit}
          editSaleStatus={editSaleStatus}
          setEditSaleStatus={setEditSaleStatus}
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
          canManageRules={editUserCanManageRules}
          setCanManageRules={setEditUserCanManageRules}
          submitting={submitting}
          onClose={() => setEditingProfile(null)}
          onSave={async (newPasswordToSet) => {
            if (editUserAllowedTypes.length === 0) {
              showToast("error", "Please allow at least one file type.");
              return;
            }

            const isFullNameSame = (editingProfile.full_name || "").trim() === editUserFullName.trim();
            const isRoleSame = editingProfile.role === editUserRole;
            const oldAllowedTypes = editingProfile.allowed_types || [];
            const isAllowedTypesSame =
              oldAllowedTypes.length === editUserAllowedTypes.length &&
              oldAllowedTypes.every((t) => editUserAllowedTypes.includes(t));
            const isCanManageRulesSame = !!editingProfile.can_manage_rules === editUserCanManageRules;

            const hasProfileChanges = !isFullNameSame || !isRoleSame || !isAllowedTypesSame || !isCanManageRulesSame;

            let profileUpdateSuccess = true;
            if (hasProfileChanges) {
              profileUpdateSuccess = await adminUpdateUserProfile(
                editingProfile.id,
                editUserFullName,
                editUserRole,
                editUserAllowedTypes,
                editUserCanManageRules,
              );
            }

            if (profileUpdateSuccess) {
              if (newPasswordToSet) {
                const pwSuccess = await resetUserPassword(
                  editingProfile.id,
                  newPasswordToSet,
                );
                if (!pwSuccess && hasProfileChanges) {
                  showToast(
                    "error",
                    "Profile updated, but password reset failed.",
                  );
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
          canManageRules={newCanManageRules}
          setCanManageRules={setNewCanManageRules}
          submitting={submitting}
          onSubmit={handleCreateUser}
          generatedPassword={generatedPassword}
          onClose={() => {
            setIsAddUserModalOpen(false);
            setGeneratedPassword(null);
            setNewCanManageRules(false);
          }}
          onCopyPassword={() => {
            if (generatedPassword) {
              navigator.clipboard.writeText(generatedPassword);
              showToast("success", "Password copied to clipboard!");
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
            setDeletingUserAccount(null);
          }
        }}
        title="Delete User Account"
        message={
          <span>
            Are you sure you want to permanently delete the account for{" "}
            <strong className="text-white">
              {deletingUserAccount?.username}
            </strong>
            ? This action cannot be undone.
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
            setDeletingRecordId(null);
          }
        }}
        title="Delete File Record"
        message="Are you sure you want to permanently delete this file record? This action cannot be undone."
        confirmText="Delete Record"
        cancelText="Cancel"
        isDanger={true}
      />

      {/* MODAL 6b: BULK DELETE RECORD CONFIRMATION */}
      <ConfirmModal
        isOpen={!!bulkDeletingRecordIds}
        onClose={() => setBulkDeletingRecordIds(null)}
        onConfirm={async () => {
          if (bulkDeletingRecordIds) {
            const success = await deleteRecords(bulkDeletingRecordIds);
            if (success) {
              setBulkDeletingRecordIds(null);
            }
          }
        }}
        title="Delete Selected Records"
        message={`Are you sure you want to permanently delete the ${bulkDeletingRecordIds?.length} selected file records? This action cannot be undone.`}
        confirmText="Delete Records"
        cancelText="Cancel"
        isDanger={true}
      />

      {/* MODAL 7: CUSTOM DATE ENTRY */}
      <CustomEntryModal
        isOpen={isCustomEntryModalOpen}
        onClose={() => setIsCustomEntryModalOpen(false)}
        profilesList={profilesList}
        currentUserProfile={profile}
        submitting={submitting}
        adminMode={profile?.role === "admin" && adminViewMode === "all"}
        onSubmit={handleAdminCustomEntrySubmit}
      />
    </div>
  );
}
