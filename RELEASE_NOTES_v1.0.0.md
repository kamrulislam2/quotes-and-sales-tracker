# Release v1.0.0 - Resilient Offline-First Sync & Major Production Polish

This major release marks the transition of **Quotes & Sales Tracker** to version **1.0.0** (Production Ready). This release focuses on resolving critical database sync bottlenecks for environments with large data footprints (3000+ entries), implementing multi-user session segregation, adding network drop failover handlers, and polishing Tauri desktop builds.

---

## 🚀 Key Enhancements & Resiliency Upgrades

### 1. PostgREST 1000-Row Pagination Sync (Resilient Sync Loop)
* **What changed**: Modified the delta fetching and active pruning engines to perform looping range queries (`.range(from, to)`) in page blocks of 1,000.
* **Why it was done**: Supabase (PostgREST) caps server response queries at a hard limit of 1,000 records. With client databases exceeding 3000+ entries, the delta sync would only fetch the first 1000 items, and the cache pruning script would assume the remaining 2000+ rows were deleted from the server and aggressively wipe them from local IndexedDB storage.
* **Result**: Complete data integrity. Client caches stay perfectly synced with all 3000+ submissions on the server.

### 2. Multi-User Session Cache Isolation & Self-Healing
* **What changed**: Implemented a complete IndexedDB store flush (`clearAllCache`) on logout or session change. Added user verification hooks (`active_user_id`) to automatically rebuild the database cache if a user change is detected.
* **Why it was done**: Logging out of a Tauri or web view did not clear IndexedDB stores automatically. If User B logged in on the same device after User A, they inherited the cached data and delta sync metadata timestamp of User A, resulting in mixed data logs.
* **Result**: Perfect privacy and data isolation between different login accounts on the same system.

### 3. Failover Local Cache Fallbacks (Network Drop Safety)
* **What changed**: Re-routed error catchers in `fetchRecords` and `fetchAvailableDates` to load the local IndexedDB cache immediately if the database fetch fails due to network dropout or server downtime.
* **Why it was done**: If the user had a connected network interface but no real internet routing (dead router or firewalled network), the query would throw a crash error rather than loading local cache, resulting in an empty dashboard table.
* **Result**: App remains fully interactive and displays local data records even during active connection dropouts.

### 4. Tauri Desktop Service Worker Optimization
* **What changed**: Prevented PWA service worker registrations when running inside native desktop views (Tauri wrappers).
* **Why it was done**: Tauri runs on custom protocols (`tauri://` or `https://tauri.localhost`) which natively block service workers, resulting in console `SecurityError` exceptions on app launch.
* **Result**: Cleaner developer logs, better startup performance, and zero protocol errors in the desktop console.

### 5. Offline Admin Action Safety Guards
* **What changed**: Added connectivity checks to block server-reliant administrative processes (creating users, resets, deletes) when the system is offline.
* **Why it was done**: Executing these queries while offline triggered unhandled background fetch errors.
* **Result**: Users receive a friendly notification toast: *"This action requires an active internet connection."* instead of background application locks.

---

## 📦 What's Included in the Build

* **Next.js PWA Production Build**: Exported as a standalone, zero-JS-chunk-delay HTML directory.
* **Tauri Desktop Executables (v1.0.0)**:
  * **Windows Installer**: Custom brand branding, NSIS setup `.exe` featuring auto-update bindings.
  * **macOS Installers**: Native DMGs for Apple Silicon (`aarch64`) and Intel (`x64`) architectures.

---

## 🔧 Database Schema Compatibility
This update is fully compatible with the existing Supabase schema migrations in `supabase/schema.sql`. No structural PostgreSQL tables or trigger modifications are required.

## 🛠️ Verification Done
* Run `npm run lint` - 0 errors.
* Run `npm run build` - Export completed successfully with Next.js Turbopack compiler.
