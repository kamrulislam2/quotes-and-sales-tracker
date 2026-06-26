# Quotes & Sales Tracker

A modern, high-performance, real-time web application designed to track and manage daily office file entries, including quotes, requotes, reviews, and sales. Built with Next.js and Supabase, it features an offline-first resilient sync engine, secure onboarding, role-based access control, dynamic statistics, and real-time database synchronization.

It runs both as a standard PWA web application and a native desktop app powered by Tauri.

---

## 🚀 Tech Stack

- **Core**: Next.js 16 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS 4, Vanilla CSS
- **Local Cache & Storage**: IndexedDB (custom transactional store), LocalStorage
- **Database & Backend**: Supabase (PostgreSQL, Row Level Security, Database Triggers, Real-time Channels, PL/pgSQL RPCs)
- **Icons**: Lucide React
- **Notifications**: React Hot Toast (dark slate theme)
- **Bundler/Dev Server**: Turbopack & Tauri CLI v2

---

## ✨ Features

### 🔐 1. Authentication & Security
- **Codename Login**: Log in directly using your unique codename (e.g. `KI1024`) or email. Custom RPCs map codenames to local account emails behind the scenes.
- **Role-based Access Control (RBAC)**: Supports `admin` and `user` (staff) roles. Pages, components, and API routes adapt dynamically based on permissions.
- **Row-Level Security (RLS)**: PostgreSQL policy rules enforce that:
  - Users can only read, write, and delete their own files.
  - Admins can read, update, and manage all users and records.

### 📶 2. Resilient Offline-First Sync Engine (IndexedDB)
The application implements a robust, transactional local database schema using client IndexedDB (`QuotesOfflineDB`) to enable offline usage:
- **Local Object Stores**: Uses `records_cache` (records), `profiles_cache` (user profiles), `user_profile_cache` (current user details), `pending_records` (unsynced inserts/updates/deletes outbox), and `sync_metadata` (timestamps).
- **Background Delta Sync**: Rather than pulling all records, the sync engine checks for database changes since the last sync time with a 30-second clock skew grace period, saving bandwidth.
- **Full Sync Auto-Fallbacks**: If local caches are empty or session states shift, a full sync is run automatically.
- **Server-Wins Conflict Resolution**: Resolves concurrent mutations on the server/client by prioritizing the server state and notifying the user of conflicts.
- **Active Cache Reconciliation**: When loading, the engine runs a fast month/year ID query against Supabase and prunes any records from IndexedDB that were deleted on the server.
- **Unlimited Pagination Support**: Bypasses the default PostgREST 1000-row query limits in both delta syncs and pruning loops to handle 3000+ logs seamlessly.
- **Multi-User Cache Isolation**: Wipes all IndexedDB data and metadata (`clearAllCache`) on logout or user changes to prevent cross-account leakage.
- **Offline Network Failover**: If network connectivity fails (e.g. dead router or Supabase timeout), the UI gracefully fails over to loading data directly from the local cache.
- **Offline Admin Action Protection**: Safeguards account adjustments by blocking server-only actions (creating users, resets, deletes) when offline, alerting the user with clean notifications.

### 📋 3. Onboarding Flow (First-time Login)
- When a user logs in for the first time (assigned a default password e.g. `1234`), they are redirected to a secure **Profile Settings & Password Change** screen.
- Access to the main dashboard is completely locked until they verify their Full Name, Codename, and set a custom password (6 to 12 characters).
- If the admin updates their password or details later, the onboarding status does not reset unless explicitly required.

### 📊 4. Dynamic Stats Grid & Optimized Counting Rules
- Real-time aggregated stats of the current day or month's records.
- **Double-Digit Padding & Percentages**: Every file category displays its count formatted as a two-digit number (e.g. `07`) alongside its relative percentage of the total files count in parentheses, e.g., `Sale: 07 (40%)`.
- **Other Site Excluded**: The `Total Files` count explicitly excludes `Other Site` entries. `Other Site` displays its count independently but is not counted as a file and does not show a percentage.
- Hides unused file categories (count = 0) to avoid clutter, keeping the dashboard clean.
- The `Total Files` card always remains visible and does not show a percentage.
- **Auto-Scale**: Category cards adjust dynamically depending on the selected user's allowed categories.

### 📂 5. File Categories & Validations
- Supports 12 distinct file categories: `Quote`, `Requote`, `Requote Van`, `Requote Bike`, `Review`, `Review Van`, `Review Bike`, `Individual Review`, `Other Site`, `Van`, `Bike`, and `Sale`.
- Admins configure which specific categories a user is allowed to submit.
- Database triggers (`check_record_type_permission`) validate that users cannot submit records for unauthorized categories.

### 🔎 6. Realtime Search & Filters
- **Unified Filters Row**: Search bar is placed directly next to Year, Month, and Specific Date filters in a single aligned row.
- **Specific Date Filter**: Type and format dates with DD-MM-YYYY automatic mask and visual calendar picker.
- **Today's Entries**: View logs submitted today with local time formatting, instant search, and delete/edit modals.
- **Monthly Entry Correction**: Edit entries from the Monthly Entry List and correct the submitted date/time using `DD-MM-YYYY` and `09:21 PM/AM` formats. Daily edits keep the original submitted date/time locked.
- **Admin View Persistence**: Remembers your All Data / My Data toggle selection across page reloads using `localStorage`.
- **Excel Export**: Download filtered data lists as an Excel spreadsheet (CSV with UTF-8 BOM encoding) directly using the download button.

### 🧭 7. Dashboard Layout & Table Readability
- **Collapsible Sidebar**: The left navigation can collapse into icon-only mode to give the records table more horizontal space. The sidebar state persists across reloads.
- **Stable Table Columns**: Monthly date/time and file type columns use fixed minimum widths so values like `09-06-2026` and `Individual Review` stay visually clean.
- **No-wrap Badges**: File type badges stay on one line and use horizontal table scrolling when space is tight instead of breaking awkwardly.

### ⏱️ 8. 21-Day Inactivity Auto-Logout
- Tracks user last active session timestamp in `localStorage`.
- Automatically logs users out, clears security sessions, and redirects to login if the app is not visited or active for 21 consecutive days.

### 🛠️ 9. User Management (Admin Only)
- **Create Users**: Direct creation of staff accounts with customized allowed category checkboxes.
- **Edit Profiles**: Update name, role, and categories, or change their passwords via the UI.
- **Delete Users**: Permanently remove accounts with confirmation dialogs.

### 📅 10. Custom Entry (Backdated Submissions)
- **Reusable CustomEntryModal Component**: Intelligent dual-mode modal for submitting entries on past dates.
- **Admin "All Data" Mode**: Admins can select any user from a dropdown and submit backdated entries for them. Validates submission against the selected user's allowed file categories.
- **Admin "My Data" & Regular Users**: Display non-editable codename field showing the current user. Users add their own data with a custom date picker supporting manual DD-MM-YYYY input or calendar selection.
- **Form Validation**: All custom entries are validated for required fields and checked against the target user's category permissions before submission.
- **Real-Time Feedback**: Toast notifications confirm successful submissions or alert users to validation errors with helpful messages.

### 📜 11. Quote Rules Configuration & Change Archiving (Admin Only)
- **Branch-Wise Quote Rules**: Dedicated "Quote Rules" panel displays rules for specific company branches. Seeded automatically into the database.
- **Admin Management Operations**: Admins can add new rules, modify existing rules, or delete rules. Regular staff users have read-only access.
- **Context Menu Interaction**: Management actions (Edit, Delete) are cleanly mapped to a right-click context menu on rule cards, removing redundant button clutter.
- **Rule Version History & Archiving**: Editing a rule automatically clones the current version to the rules history archive (`archive_rules_history`) before applying updates, ensuring full traceability of rule changes.
- **Audit Logs Tracking**: All administrative adjustments to rules (adding, editing, and deleting rules) are logged in the system's Audit Logs panel.

### 📋 12. MS Word & Outlook Bold Formatting Copy Helper
- **Word/Outlook Bold Paste Support**: When copying items via the Copy Helper, file names that are star-marked (e.g., `*File Name`) are processed and written to the clipboard with an HTML payload, pasting natively as **bold** text in Outlook, Word, and rich-text mail/doc clients.
- **Persistent Helper View State**: Persists Copy Helper navigation state across page reloads. If a user reloads the dashboard while using the copy helper, they remain exactly where they were instead of losing their page.
- **Sleek Navigation**: Replaced the bulky "Back" button in the helper with a modern, responsive back icon.

---

## 📂 Project Structure

```
quotes-sales-tracker/
├── public/                 # Static assets
├── supabase/
│   └── schema.sql          # Complete PostgreSQL DB schema & RPC migrations
└── src/
    ├── app/
    │   ├── layout.tsx      # App wrapper, Google Font, Global Toast container
    │   ├── page.tsx        # Dashboard Main Page Component (entry & tabs)
    │   ├── globals.css     # Global stylesheets and animation classes
    │   ├── pwa-register.tsx# Service worker registration (bypassed inside Tauri)
    │   └── login/
    │       └── page.tsx    # Authentication and Codename resolution page
    ├── components/
    │   ├── Navbar.tsx      # Header navbar with Online status indicator & logout
    │   ├── StatsGrid.tsx   # Floating summary count cards
    │   ├── SearchFilters.tsx# Reusable search query inputs
    │   ├── RecordsTable.tsx# Main file entries logger table
    │   ├── DailyEntryForm.tsx # File submission form (with responsive layout)
    │   ├── ToastProvider.tsx# Floating Toast notifications configuration
    │   ├── CategoryCheckboxList.tsx # Permitted categories list with Select All
    │   ├── CategorySelector.tsx # Reusable category selection grid component
    │   └── modals/
    │       ├── CustomEntryModal.tsx # Reusable custom entry modal (admin & user modes)
    │       ├── AddUserModal.tsx     # Admin create staff modal
    │       ├── EditProfileModal.tsx # Admin edit user settings & reset password
    │       ├── EditRecordModal.tsx  # Edit record details modal
    │       └── ConfirmModal.tsx     # Danger validation dialog
    ├── hooks/
    │   └── useDashboardData.ts # Central React Hook (fetches, sync, and state)
    ├── types/
    │   └── index.ts        # TypeScript Interfaces (Profile, RecordItem, FileType)
    └── utils/
        ├── supabase.ts     # Supabase browser client initialization
        ├── validator.ts    # Frontend inputs validator
        ├── offlineSync.ts  # Transactional IndexedDB manager & Sync engine
        └── dashboardHelpers.ts # Date/time and stats calculations
```

## 📝 Changelog

### v2.1.1

**Tauri Updater Relaunch Permission Fix, Startup Timeout Loop Resolution, & Tab Reload Flicker Prevention**

- ✅ **Updater Relaunch Permission Fix**: Added the custom relaunch command to permitted configuration lists, resolving Tauri permission errors during automatic app relaunch on macOS/Windows updates.
- ✅ **Startup Session Timeout Resolution**: Removed the artificial 4-second session and profile retrieval timeout safety nets in the frontend. This prevents premature aborts and infinite page reload loops on slower network connections.
- ✅ **Active Tab Reload Flicker Prevention**: Locked layout transitions until the user profile load completes, eliminating mount-time visual jumping back to the default tab.
- ✅ **Native Dark Background Configuration**: Integrated native window background color options to eliminate white flashes on Windows startup and reload.

### v2.1.0

**Outlook Rich HTML Document Saving, Skeleton Loaders Performance Optimization, & Reload Persistence**

- ✅ **Outlook Rich HTML Document Saving**: Integrated a "Save File" panel next to "Copy Helper" to paste rich HTML (tables, styles, highlights) from Outlook, select a record to auto-generate the filename, and save as `.docx` documents to today's daily directory (segregated into `Sold/` and `Unsold/` subdirectories for Sales, and directly under base directory for other types).
- ✅ **Lazy Loading & Skeleton Loader Screens**: Extracted heavy panel markups (Copy Helper, Save File, User Management) into modular components, lazy-loaded them alongside main components via React `lazy` to shrink initial bundle sizes, and wrapped them in `Suspense` with bespoke, glassmorphism-themed `SkeletonLoader` presets for stats, tables, forms, logs, rules, and chart cards.
- ✅ **Save File Panel Reload Persistence**: Converted toggle states to React lazy state initializers to prevent mount-time race conditions, ensuring page reloads preserve the active "Save File" helper panel.
- ✅ **Save As Validation & Button Renaming**: Renamed button to "Save As" and added custom states/mutation observers to disable it dynamically when the rich-text editor is empty or no filename record is checked.

### v2.0.4

**macOS App Relaunch Error Fix & Windows Update Relaunch Lock Resolution**

- ✅ **macOS App Relaunch Error Fix**: Resolved "Relaunch and install failed" updater errors on macOS by switching the relaunch mechanism on non-Windows platforms to Tauri's official process plugin (`app.restart()`) instead of spawning the raw binary directly inside the sandboxed `.app` bundle context.
- ✅ **Windows Update Launch Lock & Freeze Resolution**: Fixed the issue where updating the app on Windows caused it to hang on "Loading, please wait..." or a white screen. By adding a 1.2-second startup delay on Windows, the new process gives the exiting old process time to fully terminate and release its WebView2 user data directory and SQLite cache database file locks.
- ✅ **Active Tab Reload Flicker Fix**: Refactored tab selection layout state to load from `localStorage` synchronously during state construction rather than a post-mount effect hook, eliminating visual flickering when reloading the page on non-default tabs.

### v2.0.2

**Escape Key for Choice Modal, Dynamic Branch Filtering, Seeding Lock & State Deduplication**

- ✅ **SOLD/UNSOLD Choice Modal Escape Close**: Added a global keyboard event listener specifically for the SOLD/UNSOLD decision dialog. Pressing `Escape` now safely closes the modal, allowing users to return to edit form fields without losing their input.
- ✅ **Dynamic Branch Rules Relevance Filtering**: Implemented company keyword mapping to filter rules and admin fines. Dynamic logic checks if a rule text contains key terms from other companies (e.g. `EUI`, `Second Best Price`) and automatically hides them unless the corresponding company is selected, avoiding cross-branch mistakes.
- ✅ **Seeding Concurrency Lock & Database Pre-checks**: Added a module-level `seedingInProgress` flag and pre-flight database rule checks inside `seedRules` to prevent concurrent execution/double seeding in React 18/19 StrictMode and concurrent renders.
- ✅ **Rules Deduplication & Background Database Cleanup**: Cleaned up duplicated rules from the Supabase backend database for admins, and added client-side deduplication using composite keys on rules data fetching.
- ✅ **React Compiler Hook Dependency Alignment**: Updated `useCallback` hook dependencies to comply with strict memoization rules, listing root object dependencies (e.g. `profile`) directly.

### v2.0.1

**Circular Checkbox Redesign, escape Close Modals, Admin Permission Auto-checked & Codebase Audit Refinement**

- ✅ **Circular Checkboxes & UI Redesign**: Redesigned all permitted category checkboxes and permission checkboxes (e.g. "Can Manage Quote Rules?", "Change Password?") to render as modern, circular, custom-styled check indicators using Check icons, matching dashboard count cards styling.
- ✅ **Escape Key Support**: Added keyboard action listeners so that pressing the `Escape` key closes all active sub-dialogs/modals (Add, Edit, Delete, History) in the Quote Rules and other panels.
- ✅ **Instant Admin Permission Sync**: Resolved layout shift and permission tick mark flicker when opening the user profile modal for admins by deriving checks instantly via direct role checks, and disabled rules checkbox toggling for Admins.
- ✅ **Modern Status Selection Buttons**: Redesigned UNSOLD/SOLD selection buttons in the main record submit form with elegant linear gradients, CheckCircle/XCircle visual icons, and responsive scaling.
- ✅ **Full Codebase Audit & Warning Cleanups**: Resolved all TypeScript and ESLint warnings. Moved static `monthsList` outside the component scope in `AnalyticsPanel.tsx` to eliminate re-creation and resolve missing dependency warnings, cleaned up unused imports and unused references in `QuoteRulesPanel.tsx`, and removed unused variables in `page.tsx`.

### v2.0.0

**Quote Rules Panel, MS Word/Outlook Bold Formatting Copy Helper, and Major System Audit & Optimizations**

- ✅ **Quote Rules Management Panel**: Implemented a new Quote Rules configurations and panel. Allows branch-wise rules management (adding new company rules, modifying rules, deleting rules) with built-in database tables and initial seeding logic.
- ✅ **Role-Based Rules Security**: Restricts Quote Rules management exclusively to `admin` roles, granting read-only access to staff/user roles.
- ✅ **Context Menu Actions**: Cleaned up rule cards by shifting Edit and Delete icons into a right-click context menu handler on the cards.
- ✅ **Rules Change Archiving & History**: Editing any rule automatically saves a clone of the old configuration into the database (`archive_rules_history`) for full historical compliance tracking.
- ✅ **Audit Trail Integration**: All administrative actions on rules (creating, modifying, or deleting rules) are logged and searchable in the Audit Logs panel.
- ✅ **Rich Text Word/Outlook Bold Copying**: Upgraded the Copy Helper script to use `ClipboardItem` with `text/html` payloads. Star-marked file names copy in a formatting wrapper so they paste directly as bold in Outlook, Word, and rich text apps.
- ✅ **Copy Helper View State Persistence**: Replaced the "Back" button in the Copy Helper with a modern back icon. Persisted Copy Helper active state (active branch views) across page reloads in localStorage.
- ✅ **Advanced Performance Tuning (Audit)**:
  - **Dynamic Lazy Loading**: Lazy-loaded the Analytics, Audit Logs, and Quote Rules panels to reduce initial bundle loading size by ~131KB.
  - **Scoped CSS Transitions**: Removed broad CSS transition rules applied to all elements (forcing compositor recalculations on huge tables) and scoped them strictly to root layouts.
  - **Re-render Minimization**: Wrapped rule items and action buttons with `React.memo` to eliminate redundant re-rendering inside loop maps.
- ✅ **Viewport & Stability Fixes**:
  - Centered modals in the screen viewport, resolving a layout bug that forced modals to render below the fold.
  - Fixed bulk delete `setRecords` cache updates that bypassed active month/year filters.
  - Corrected ConfirmModal to prevent premature closing during asynchronous actions.
  - Resolved `useEffect` warning for missing dependency in seeding hooks.

### v1.4.2

**Detailed Audit Logging and Relaunch Loading Freeze Fix**

- ✅ **Specific User Audit Logs**: Enhanced the `UPDATE_USER` audit logging description. It now performs a smart diff comparison to output only the specific user properties changed (Full Name, Role, or specific file permission items newly Granted or Revoked) instead of listing all 12 allowed file types on every single edit.
- ✅ **Post-Update Reload Freeze Fix**: Removed the legacy frontend self-healing reload workaround on component mount and update-flag setting. The 2-second backend delay relaunch already fully mitigates WebView2 locking, so removing the redundant reload prevents the app from interrupting session initialization and freezing on the loading spinner.

### v1.4.1

**System Theme Match, Deferred Sync Toasts, Audit Log Tuning, and Windows Relaunch Fix**

- ✅ **System Theme Auto-Toggle**: Detects user's OS color scheme preferences (Windows/macOS) and updates the theme dynamically on the fly with live listeners. Manual toggle selection overrides system preferences and locks in localStorage.
- ✅ **Deferred Success Toasts**: Synchronized all database-connected operations (records creation/updates/deletions, user CRUD, password updates, and onboarding setup) to show success toasts only after Supabase queries execute and dashboard state is refetched/re-rendered.
- ✅ **Audit Log Database Tuning**: Disabled `CREATE_RECORD` logs to save storage space and avoid database bloat from high monthly submission volumes (5,000–10,000 logs). Added logging for `EXPORT_EXCEL` events to track report generation details.
- ✅ **Delayed Windows Relaunch**: Implemented a custom 2-second timeout delay on Windows during automatic updater relaunch. This prevents WebView2 file-locking conflicts that cause the app to freeze on a blank white screen upon auto-starting.

### v1.2.0

**Branch Selector optimizations, Period-over-Period Growth, Category Breakdown list, Operational Insights, and Skeleton Loader**

- ✅ **Advanced Branch Selector Dropdown**: Built a custom selector dropdown with intelligent sub-options for specific branch variations (e.g. `PRIDE COMPARE` and `EAZY COMPARE`) to prevent spelling errors and simplify input logs.
- ✅ **Period-over-Period (PoP) Comparison Badges**: Integrated automatic growth metrics comparing current Stats cards against previous period limits (previous month/year), rendered as Emerald-Green / Rose-Red glassmorphic badges.
- ✅ **File Category Distribution Breakdown**: Created a full-height, double-column category breakdown component covering all 12 custom file types.
- ✅ **Automated Operational Insights**: Implemented day-by-day averages, dynamic dominant file selectors, and automated textual summaries.
- ✅ **Premium UI Skeleton Loader**: Introduced a custom, pulse-animated skeleton page loader to make page loads feel responsive.

### v1.1.0

**Supabase Recovery, RLS Restoration, Client Caching Optimizations & Interactive Performance Analytics**

- ✅ **Interactive Performance Analytics Panel**: Added a custom, highly interactive, and responsive SVG-based analytics dashboard. Displays real-time metrics cards, monthly grouped bar charts with tooltips, branch-level contribution distribution, a staff leaderboard (admin-only), and a day-by-day progression chart (staff-only).
- ✅ **RLS Policy Restoration**: Created and configured Row-Level Security (RLS) policies on the `records` table to safely authorize users to manage their own records and allow administrators to view and manage all records, resolving the blank dashboard screen.
- ✅ **Admin Password Reset Resolution**: Resolved the PostgREST function overloading conflict (`PGRST203`) by dropping the redundant 2-argument `admin_update_user_credentials` function and writing a unified, 3-argument version that updates user passwords and safely resets `has_changed_password` states.
- ✅ **Self-Healing & Cache Pruning Re-enabled**: Safely restored client-side self-healing checks and active cache pruning functions post-recovery to keep the client cache aligned with the server.
- ✅ **Snappy UI Deletion**: Enhanced `deleteRecord` to optimistically remove records from the browser cache immediately upon successful deletion, providing instant visual feedback in the UI.

---

### v1.0.0 (Production Release)

**Resilient Offline-First Synchronization & Major Production Polish**

- ✅ **PostgREST 1000-Row Pagination Fix**: Added paginated block requests (`.range(from, to)`) in both delta fetching and active pruning loops. This prevents older entries (3000+ data sets) from going missing on client systems.
- ✅ **Multi-User Cache Isolation**: Added `clearAllCache` triggers in `offlineSync.ts` and hooked it to the logout workflow. When a session ends or changes, all IndexedDB data and sync metadata are wiped to avoid data mixing.
- ✅ **Network Failure Cache Fallback**: Implemented robust failover catching. In cases where the client indicates it is online but has no database connection (dead routers, firewalls, or Supabase drops), the app falls back to loading local cache instead of throwing blank screen errors.
- ✅ **Tauri Service Worker Skip**: Prevented service worker registrations inside the native desktop app framework to eliminate console `SecurityError` flags.
- ✅ **Offline Guards**: Implemented internet validation rules to alert users if they attempt to execute admin account alterations while offline.

---

### v0.3.0

**Silent Background Sync & Refetches**

- ✅ **Silent Background Fetching**: Implemented `isSilent` mode in `fetchRecords`. Background refetches (such as real-time updates, window focus events, network status restores, and user CRUD actions like add/update/delete) now execute in the background without showing full-screen/table loading spinners. Spinners are now reserved exclusively for the initial page load.

---

### v0.2.9

**User Management Loading Improvements**

- ✅ **User Table Loading State**: Added loading spinner state to the "User Accounts & File Permissions Management" table when fetching data to prevent showing 0 records initially.

---

### v0.2.8

**Code Quality, Performance & Accessibility Improvements**

- ✅ **Shared Download Utility**: Extracted duplicated GitHub download logic from `Navbar.tsx` and `login/page.tsx` into a shared `downloadHelper.ts` utility for better maintainability.
- ✅ **Independent Profile Timeout**: Fixed a bug where the profile fetch reused the session's timeout promise, giving it almost no time if the session check was slow. Each now gets its own independent 4-second timeout.
- ✅ **Dead Code Removal**: Removed unused `changeOwnPassword` function from `useDashboardData.ts`.
- ✅ **Optimized Date Queries**: Replaced the paginated all-records fetch in `fetchAvailableDates` with a lightweight min/max date range query (2 rows instead of potentially thousands).
- ✅ **Real-time Debounce**: Added 500ms debounce to real-time record subscription to prevent double-fetching when user mutations echo back via WebSocket.
- ✅ **Modal Escape Key**: All 5 modals (Confirm, EditRecord, EditProfile, AddUser, CustomEntry) now close on `Escape` key press for improved accessibility.
- ✅ **Spinner Fix**: Fixed submit button spinner width bug in Daily Entry Form (`w-2` → `w-5`).
- ✅ **Activity Timer Fix**: Added missing `updateLastActivity()` calls to `deleteUser` and `adminUpdateUserProfile` to prevent admin sessions from expiring during user management.

---

### v0.2.7

**Offline Startup & Cache Recovery**

- ✅ **Offline Startup & Cache Recovery**: Added local storage user profile caching and fallback startup loaders. If database connection times out or fails (due to a locked WebView/process on Windows relaunch, or network drops), the app recovers using the cached profile to load the dashboard, resolving the infinite loading loop.

---

### v0.2.6

**Global Reload Shortcut & Background Auto-Sync**

- ✅ **Global Reload Keyboard Shortcut**: Added keydown handlers for `Cmd+R` (macOS) and `Ctrl+R` (Windows/Linux) to reload the application window.
- ✅ **Background Auto-Sync on Focus**: Added event listeners for window `focus` and `visibilitychange` to refetch database records immediately when the app window is brought back from the background.

---

### v0.2.5

**macOS Apple Silicon CI Build Fix**

- ✅ **macOS Apple Silicon CI Build Fix**: Added `CI: true` configuration in the release workflow. This bypasses AppleScript Finder UI-styling steps that hang on headless runners, fixing the macOS aarch64 DMG bundling pipeline freeze.

---

### v0.2.4

**Self-Healing Startup Delay & Fetching Loader States**

- ✅ **WebView Startup Delay**: Added a 200ms initialization delay before session queries on mount. This ensures the Webview's network and disk cache handles are fully ready before running Supabase checks, preventing startup locks.
- ✅ **Self-Healing Auto-Reload**: Added one-time automatic page refresh fallbacks if a connection check fails or times out (using a 4-second safety net), resolving startup white screen hangs.
- ✅ **Fetching Loader States**: Added visual loading spinner states during database queries instead of displaying "Total Files: 0" and "No records found" while fetching data.

---

### v0.2.3

*Internal release configurations and loader components refinement.*

---

### v0.2.2

**Granular Update Flow Controls & Download Separation**

- ✅ **Granular Update Flow Controls**: Separated Tauri updater package downloading and installation. The app now only downloads the update payload in the background, but defers installation until the user explicitly clicks the "Restart to Update" button. This prevents Windows from closing/installing the app automatically in the background.

---

### v0.2.1

- ✅ **Maximized Startup State**: Configured the Tauri application window to start fully maximized (`"maximized": true` in `tauri.conf.json`) to provide a complete and immersive layout immediately on launch.
- ✅ **Dynamic Architecture Downloads**: Added a "Download Desktop App" section on the login page and a "Get App" dropdown menu in the header (Navbar) that only render in web browsers. They query the GitHub Releases API dynamically to let users download the precise installer for **Windows**, **macOS Apple Silicon (M1/M2/M3)**, or **macOS Intel**.
- ✅ **Supabase Build Injection**: Resolved client database login errors by injecting `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` variables from GitHub Secrets directly into the build environment of the release workflow.
- ✅ **Updater Silence Check**: Silenced update checker error logs to prevent intrusive error boxes when the user is offline or when no update configuration has been published yet.

---

### v0.2.0

**Offline Standalone App, Background Auto-Updater & Percentage Accuracy**

- ✅ **Offline Standalone App**: Configured Next.js static HTML export (`output: 'export'`) with `trailingSlash: true` and disabled image optimization. The app now compiles directly into local files bundled within the Tauri installer, meaning it works fully offline and is immune to Vercel/network delays.
- ✅ **Background Auto-Updater**: Integrated Tauri v2's native auto-updater plugin (`@tauri-apps/plugin-updater`). When updates are pushed, the app downloads them automatically in the background.
- ✅ **Restart to Update UI Banner**: Added a subtle, modern sliding toast banner in the UI. When an update is ready, it provides a "Restart to Update" button that relaunches the app instantly.
- ✅ **Accurate Percentage Counts**: Modified calculations in `StatsGrid` to display exactly 2 decimal places (e.g., `33.11%`). Replaced rounding logic so that categories with low count (e.g., 1 or 2 files) display their actual decimal percentages (e.g., `0.05%`) instead of rounding down to `0%`.

---

### v0.1.9

- ✅ **Custom NSIS Installer Icons**: Configured the Tauri Windows NSIS installer and uninstaller settings to use the custom Quotes icon (`icon.ico`), showing the correct brand logo on the downloaded setup `.exe` file and the installation wizard header.
- ✅ **B&F Corporate Installer Metadata & Branding**: Configured the bundler to target only NSIS and DMG/App formats (removing the WiX `.msi` target). This allows using the raw ampersand `&` in the publisher and copyright fields without WiX XML toolchain compiler issues. Set the copyright/branding text to `"Apps Developed by Kamrul Islam, IT Officer, B&F Corporate"`, showing it at the bottom left of the installer page.
- ✅ **PDF Export Removal**: Completely removed all PDF export options, button layouts, icon graphics, and handler logic from the application (today's logs and monthly logs tabs), keeping only the Microsoft Excel compatible CSV export.
- ✅ **Clean Web UI Layouts**: Kept the web application UI clean and free of custom attribution footers on both the Login page and the Dashboard sidebar.
- ✅ **Frontend Table Pagination (50 files/page)**: Implemented pagination (50 logs per page) in `RecordsTable` with sleek, modern controls ("Previous", "Next", dynamic visible page numbers, and "Showing X-Y of Z entries") to prevent UI lag.
- ✅ **Tauri Custom File Saving via RFD**: Added native file save dialogs (using the Rust `rfd` crate) triggered from the Vercel remote app.
- ✅ **Tauri Configuration & Security Policies**: Exposed global Tauri APIs (`withGlobalTauri: true`) and granted safe remote capabilities for Vercel deployment inside the capability configuration rules.

---

### v0.1.7

**Data Visibility & Export Cleanup**

- ✅ **Snappy Paginated Data Fetching**: Implemented page-by-page fetching in chunks of 1,000 using `.range()` inside `fetchRecords` and `fetchAvailableDates` to query all rows matching the filters. This fixes the PostgREST/Supabase default limit of 1,000 records, restoring visibility of older entries (June 1, 3, 4, etc.) on the dashboard.
- ✅ **Export Buttons Removed**: Removed all Excel and PDF download buttons, click handlers, and related helper imports from the Daily Entry List and Monthly Logs to keep the dashboard focused.

---

### v0.1.6

**Dashboard Usability & Data Correction**

- ✅ **Collapsible Sidebar Navigation**: Added a sidebar collapse/open control with icon-only compact mode. The collapsed state is saved in `localStorage` and gives the records table more room for longer names, branches, codenames, and file types.
- ✅ **Monthly-only Submitted Date/Time Editing**: Edit modal now allows submitted date/time correction only from the Monthly Entry List. Date uses `DD-MM-YYYY`; time uses `09:21 PM/AM`. Daily Entry edits keep submitted date/time unchanged.
- ✅ **Table Readability Fixes**: Fixed Monthly Entry List date wrapping by giving the Date/Time column a stable width. File type badges such as `Individual Review` now stay on one line.
- ✅ **Update Flow Support**: Record updates can optionally include `submitted_at`, while ordinary daily edits continue updating only record details.
- ✅ **Lint Cleanup**: Removed an unused dashboard import so lint now completes without warnings.

---

### Previous Release

**Quality & Code Health Improvements**

- ✅ **CSS & Tailwind Modernization**: Fixed conflicting `block` and `flex` display classes across all form components (DailyEntryForm, CustomEntryModal, page.tsx). Updated deprecated gradient syntax from `bg-gradient-to-r` to `bg-linear-to-r` throughout buttons and headers. Replaced arbitrary Tailwind values with standard scale (`h-[42px]` → `h-10.5`, `w-[42px]` → `w-10.5`, `min-h-[500px]` → `min-h-125`, `flex-2` → `flex-1`).
- ✅ **Component Consolidation**: Removed deprecated `AdminCustomEntryModal.tsx` after consolidating functionality into a reusable `CustomEntryModal` component with intelligent dual-mode support.
- ✅ **CustomEntryModal Enhancements**: New reusable component with `adminMode` prop for intelligent behavior switching:
  - **Admin "all data" view** (`adminMode=true`): User selector dropdown to submit backdated entries for any team member
  - **Admin "my data" & Regular users** (`adminMode=false`): Non-editable read-only codename field showing current user
  - Full form validation against target user's allowed file categories
- ✅ **Enhanced Form Validation & Error Handling**: Comprehensive validation with proper null/undefined safety checks. Form submission validates all fields and checks against target user's permissions. Clear, user-friendly error messages via toast notifications.
- ✅ **Data Integrity & Code Quality**: Verified userId and profile handling throughout data flow. All async operations include proper try-catch error handling. Form validations enforce user permission constraints.

---

### v0.1.4

- CSS & Tailwind quality improvements (block/flex conflicts, gradient syntax, arbitrary values)
- Code cleanup and component consolidation
- CustomEntryModal component implementation
- Enhanced form validation and error handling

---

## ⚙️ Configuration & Local Setup

### 1. Prerequisites

- Node.js (v18+)
- npm or yarn

### 2. Environment Variables

Create a `.env.local` file in the root folder with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Build for Production

```bash
npm run build
```

---

## 🗄️ Database Setup & Migrations

If configuring a new Supabase project, execute the SQL definitions found in [schema.sql](file:///Users/bnfcorporate/Documents/Web%20Dev/quotes-sales-tracker/supabase/schema.sql) in the **Supabase SQL Editor**:

1. Creates `profiles` and `records` tables.
2. Configures Row Level Security (RLS) policies.
3. Sets up triggers to auto-create user profiles when users sign up in Auth.
4. Initializes SECURITY DEFINER RPC helper functions:
   - `create_new_user`: Admin creates a confirmed user bypass.
   - `admin_update_user_credentials`: Admin resets password (safeguards `has_changed_password` states for the caller).
   - `delete_user_by_id`: Admin deletes user record from auth schema.
   - `complete_profile_setup`: Completes onboarding profile details.
   - `list_all_users`, `inspect_auth_users`, etc. (Schema metadata inspection scripts).

---

## 🖥️ Desktop Application (Tauri Wrapper)

The project includes a **Tauri Desktop Application Wrapper** configuration. This wraps your Next.js website (Vercel deployment) inside a lightweight native desktop application window.

### Features

- **Zero-config Updates**: Because the desktop app loads the remote Vercel subdomain URL directly, any changes or bug fixes you push to Git will automatically update in the desktop app instantly, without requiring users to reinstall anything.
- **Lightweight**: Tauri uses your OS's native webview, keeping the package size extremely small (usually under 5 MB).

### Setup & Local Development

1. Start your local Next.js dev server:
   ```bash
   npm run dev
   ```
2. Run the Tauri desktop window in development mode:
   ```bash
   npm run tauri:dev
   ```

### Production Configuration

1. Open [tauri.conf.json](file:///Users/bnfcorporate/Documents/Web%20Dev/quotes-sales-tracker/src-tauri/tauri.conf.json).
2. Locate the `tauri > windows > [0] > url` property and replace the placeholder URL (`https://quotes-sales-tracker.vercel.app`) with your live Vercel deployment/subdomain URL.
3. Compile the production installer for your operating system:

   ```bash
   npm run tauri:build
   ```

   - The generated installers (`.dmg` on macOS, `.exe` on Windows, `.deb` on Linux) will be output in the `src-tauri/target/release/bundle/` directory.
