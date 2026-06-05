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

### 📊 3. Dynamic Stats Grid
- Real-time aggregated stats of the current day or month's records.
- Hides unused file categories (count = 0) to avoid clutter, keeping the dashboard clean.
- The `Total Files` card always remains visible.

### 📂 4. File Categories & Validations
- Supports 12 distinct file categories: `Quote`, `Requote`, `Requote Van`, `Requote Bike`, `Review`, `Review Van`, `Review Bike`, `Individual Review`, `Other Site`, `Van`, `Bike`, and `Sale`.
- Admins configure which specific categories a user is allowed to submit.
- Database triggers (`check_record_type_permission`) validate that users cannot submit records for unauthorized categories.

### 🔎 5. Realtime Search & Filters
- **Today's Entries**: View logs submitted today with local time formatting, instant search, and delete/edit modals.
- **Monthly Archives**: Select Year and Month to load past records. Search by file name, branch, codename, or type.
- **Reset Controls**: Easily reset month/year filters back to the current local month with a single click.

### 🛠️ 6. User Management (Admin Only)
- **Create Users**: Direct creation of staff accounts with customized allowed category checkboxes.
- **Edit Profiles**: Update name, role, and categories, or change their passwords via the UI.
- **Delete Users**: Permanently remove accounts with confirmation dialogs.

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
    │   └── modals/
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
