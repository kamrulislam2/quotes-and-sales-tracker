# Quotes & Sales Tracker

A modern, high-performance, real-time web application designed to track and manage daily office file entries, including quotes, requotes, reviews, and sales. Built with Next.js and Supabase, it features secure onboarding, role-based access control, dynamic statistics, and real-time database synchronization.

---

## 🚀 Tech Stack

- **Core**: Next.js 16 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS 4, Vanilla CSS
- **Database & Backend**: Supabase (PostgreSQL, Row Level Security, Database Triggers, Real-time Channels, PL/pgSQL RPCs)
- **Icons**: Lucide React
- **Notifications**: React Hot Toast (dark slate theme)
- **Bundler/Dev Server**: Turbopack

---

## ✨ Features

### 🔐 1. Authentication & Security

- **Codename Login**: Log in directly using your unique codename (e.g. `KI1024`) or email. Custom RPCs map codenames to local account emails behind the scenes.
- **Role-based Access Control (RBAC)**: Supports `admin` and `user` (staff) roles. Pages, components, and API routes adapt dynamically based on permissions.
- **Row-Level Security (RLS)**: PostgreSQL policy rules enforce that:
  - Users can only read, write, and delete their own files.
  - Admins can read, update, and manage all users and records.

### 📋 2. Onboarding Flow (First-time Login)

- When a user logs in for the first time (assigned a default password e.g. `1234`), they are redirected to a secure **Profile Settings & Password Change** screen.
- Access to the main dashboard is completely locked until they verify their Full Name, Codename, and set a custom password (6 to 12 characters).
- If the admin updates their password or details later, the onboarding status does not reset unless explicitly required.

### 📊 3. Dynamic Stats Grid & Optimized Counting Rules

- Real-time aggregated stats of the current day or month's records.
- **Double-Digit Padding & Percentages**: Every file category displays its count formatted as a two-digit number (e.g. `07`) alongside its relative percentage of the total files count in parentheses, e.g., `Sale: 07 (40%)`.
- **Other Site Excluded**: The `Total Files` count explicitly excludes `Other Site` entries. `Other Site` displays its count independently but is not counted as a file and does not show a percentage.
- Hides unused file categories (count = 0) to avoid clutter, keeping the dashboard clean.
- The `Total Files` card always remains visible and does not show a percentage.
- **Auto-Scale**: Category cards adjust dynamically depending on the selected user's allowed categories.

### 📂 4. File Categories & Validations

- Supports 12 distinct file categories: `Quote`, `Requote`, `Requote Van`, `Requote Bike`, `Review`, `Review Van`, `Review Bike`, `Individual Review`, `Other Site`, `Van`, `Bike`, and `Sale`.
- Admins configure which specific categories a user is allowed to submit.
- Database triggers (`check_record_type_permission`) validate that users cannot submit records for unauthorized categories.

### 🔎 5. Realtime Search & Filters

- **Unified Filters Row**: Search bar is placed directly next to Year, Month, and Specific Date filters in a single aligned row.
- **Specific Date Filter**: Type and format dates with DD-MM-YYYY automatic mask and visual calendar picker.
- **Today's Entries**: View logs submitted today with local time formatting, instant search, and delete/edit modals.
- **Monthly Entry Correction**: Edit entries from the Monthly Entry List and correct the submitted date/time using `DD-MM-YYYY` and `09:21 PM/AM` formats. Daily edits keep the original submitted date/time locked.
- **Admin View Persistence**: Remembers your All Data / My Data toggle selection across page reloads using `localStorage`.
- **Excel & PDF Exports**: Download filtered data lists as an Excel spreadsheet (CSV with UTF-8 BOM encoding) or PDF (native OS print-to-PDF layout) directly using the download buttons in the headers.

### 🧭 6. Dashboard Layout & Table Readability

- **Collapsible Sidebar**: The left navigation can collapse into icon-only mode to give the records table more horizontal space. The sidebar state persists across reloads.
- **Stable Table Columns**: Monthly date/time and file type columns use fixed minimum widths so values like `09-06-2026` and `Individual Review` stay visually clean.
- **No-wrap Badges**: File type badges stay on one line and use horizontal table scrolling when space is tight instead of breaking awkwardly.

### ⏱️ 7. 21-Day Inactivity Auto-Logout

- Tracks user last active session timestamp in `localStorage`.
- Automatically logs users out, clears security sessions, and redirects to login if the app is not visited or active for 21 consecutive days.

### 🛠️ 8. User Management (Admin Only)

- **Create Users**: Direct creation of staff accounts with customized allowed category checkboxes.
- **Edit Profiles**: Update name, role, and categories, or change their passwords via the UI.
- **Delete Users**: Permanently remove accounts with confirmation dialogs.

### 📅 9. Custom Entry (Backdated Submissions)

- **Reusable CustomEntryModal Component**: Intelligent dual-mode modal for submitting entries on past dates.
- **Admin "All Data" Mode**: Admins can select any user from a dropdown and submit backdated entries for them. Validates submission against the selected user's allowed file categories.
- **Admin "My Data" & Regular Users**: Display non-editable codename field showing the current user. Users add their own data with a custom date picker supporting manual DD-MM-YYYY input or calendar selection.
- **Form Validation**: All custom entries are validated for required fields and checked against the target user's category permissions before submission.
- **Real-Time Feedback**: Toast notifications confirm successful submissions or alert users to validation errors with helpful messages.

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
    │   └── useDashboardData.ts # Central React Hook (fetches, triggers, and state)
    ├── types/
    │   └── index.ts        # TypeScript Interfaces (Profile, RecordItem, FileType)
    └── utils/
        ├── supabase.ts     # Supabase browser client initialization
        ├── validator.ts    # Frontend inputs validator
        └── dashboardHelpers.ts # Date/time and stats calculations
```

## 📝 Changelog

### v0.2.6 (Latest)

**Global Reload Shortcut & Background Auto-Sync**

- ✅ **Global Reload Keyboard Shortcut**: Added keydown handlers for `Cmd+R` (macOS) and `Ctrl+R` (Windows/Linux) to reload the application window.
- ✅ **Background Auto-Sync on Focus**: Added event listeners for window `focus` and `visibilitychange` to refetch database records immediately when the app window is brought back from the background.

### v0.2.5

**macOS Apple Silicon CI Build Fix**

- ✅ **macOS Apple Silicon CI Build Fix**: Added `CI: true` configuration in the release workflow. This bypasses AppleScript Finder UI-styling steps that hang on headless runners, fixing the macOS aarch64 DMG bundling pipeline freeze.

### v0.2.4

**Self-Healing Startup Delay & Fetching Loader States**

- ✅ **WebView Startup Delay**: Added a 200ms initialization delay before session queries on mount. This ensures the Webview's network and disk cache handles are fully ready before running Supabase checks, preventing startup locks.
- ✅ **Self-Healing Auto-Reload**: Added one-time automatic page refresh fallbacks if a connection check fails or times out (using a 4-second safety net), resolving startup white screen hangs.
- ✅ **Fetching Loader States**: Added visual loading spinner states during database queries instead of displaying "Total Files: 0" and "No records found" while fetching data.

### v0.2.3

*Internal release configurations and loader components refinement.*

### v0.2.2

**Granular Update Flow Controls & Download Separation**

- ✅ **Granular Update Flow Controls**: Separated Tauri updater package downloading and installation. The app now only downloads the update payload in the background, but defers installation until the user explicitly clicks the "Restart to Update" button. This prevents Windows from closing/installing the app automatically in the background.

### v0.2.1

- ✅ **Maximized Startup State**: Configured the Tauri application window to start fully maximized (`"maximized": true` in `tauri.conf.json`) to provide a complete and immersive layout immediately on launch.
- ✅ **Dynamic Architecture Downloads**: Added a "Download Desktop App" section on the login page and a "Get App" dropdown menu in the header (Navbar) that only render in web browsers. They query the GitHub Releases API dynamically to let users download the precise installer for **Windows**, **macOS Apple Silicon (M1/M2/M3)**, or **macOS Intel**.
- ✅ **Supabase Build Injection**: Resolved client database login errors by injecting `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` variables from GitHub Secrets directly into the build environment of the release workflow.
- ✅ **Updater Silence Check**: Silenced update checker error logs to prevent intrusive error boxes when the user is offline or when no update configuration has been published yet.

### v0.2.0

**Offline Standalone App, Background Auto-Updater & Percentage Accuracy**

- ✅ **Offline Standalone App**: Configured Next.js static HTML export (`output: 'export'`) with `trailingSlash: true` and disabled image optimization. The app now compiles directly into local files bundled within the Tauri installer, meaning it works fully offline and is immune to Vercel/network delays.
- ✅ **Background Auto-Updater**: Integrated Tauri v2's native auto-updater plugin (`@tauri-apps/plugin-updater`). When updates are pushed, the app downloads them automatically in the background.
- ✅ **Restart to Update UI Banner**: Added a subtle, modern sliding toast banner in the UI. When an update is ready, it provides a "Restart to Update" button that relaunches the app instantly.
- ✅ **Accurate Percentage Counts**: Modified calculations in `StatsGrid` to display exactly 2 decimal places (e.g., `33.11%`). Replaced rounding logic so that categories with low count (e.g., 1 or 2 files) display their actual decimal percentages (e.g., `0.05%`) instead of rounding down to `0%`.

### v0.1.9

- ✅ **Custom NSIS Installer Icons**: Configured the Tauri Windows NSIS installer and uninstaller settings to use the custom Quotes icon (`icon.ico`), showing the correct brand logo on the downloaded setup `.exe` file and the installation wizard header.
- ✅ **B&F Corporate Installer Metadata & Branding**: Configured the bundler to target only NSIS and DMG/App formats (removing the WiX `.msi` target). This allows using the raw ampersand `&` in the publisher and copyright fields without WiX XML toolchain compiler issues. Set the copyright/branding text to `"Apps Developed by Kamrul Islam, IT Officer, B&F Corporate"`, showing it at the bottom left of the installer page.
- ✅ **PDF Export Removal**: Completely removed all PDF export options, button layouts, icon graphics, and handler logic from the application (today's logs and monthly logs tabs), keeping only the Microsoft Excel compatible CSV export.
- ✅ **Clean Web UI Layouts**: Kept the web application UI clean and free of custom attribution footers on both the Login page and the Dashboard sidebar.
- ✅ **Frontend Table Pagination (50 files/page)**: Implemented pagination (50 logs per page) in `RecordsTable` with sleek, modern controls ("Previous", "Next", dynamic visible page numbers, and "Showing X-Y of Z entries") to prevent UI lag.
- ✅ **Tauri Custom File Saving via RFD**: Added native file save dialogs (using the Rust `rfd` crate) triggered from the Vercel remote app.
- ✅ **Tauri Configuration & Security Policies**: Exposed global Tauri APIs (`withGlobalTauri: true`) and granted safe remote capabilities for Vercel deployment inside the capability configuration rules.

### v0.1.7

**Data Visibility & Export Cleanup**

- ✅ **Snappy Paginated Data Fetching**: Implemented page-by-page fetching in chunks of 1,000 using `.range()` inside `fetchRecords` and `fetchAvailableDates` to query all rows matching the filters. This fixes the PostgREST/Supabase default limit of 1,000 records, restoring visibility of older entries (June 1, 3, 4, etc.) on the dashboard.
- ✅ **Export Buttons Removed**: Removed all Excel and PDF download buttons, click handlers, and related helper imports from the Daily Entry List and Monthly Logs to keep the dashboard focused.

### v0.1.6

**Dashboard Usability & Data Correction**

- ✅ **Collapsible Sidebar Navigation**: Added a sidebar collapse/open control with icon-only compact mode. The collapsed state is saved in `localStorage` and gives the records table more room for longer names, branches, codenames, and file types.
- ✅ **Monthly-only Submitted Date/Time Editing**: Edit modal now allows submitted date/time correction only from the Monthly Entry List. Date uses `DD-MM-YYYY`; time uses `09:21 PM/AM`. Daily Entry edits keep submitted date/time unchanged.
- ✅ **Table Readability Fixes**: Fixed Monthly Entry List date wrapping by giving the Date/Time column a stable width. File type badges such as `Individual Review` now stay on one line.
- ✅ **Update Flow Support**: Record updates can optionally include `submitted_at`, while ordinary daily edits continue updating only record details.
- ✅ **Lint Cleanup**: Removed an unused dashboard import so lint now completes without warnings.

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

   - The generated installers (`.dmg` on macOS, `.msi` or `.exe` on Windows, `.deb` on Linux) will be output in the `src-tauri/target/release/bundle/` directory.
