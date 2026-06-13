import React from 'react';
import { 
  LogOut, 
  User, 
  Wifi, 
  WifiOff, 
  Sun, 
  Moon,
  Download,
  Monitor,
  Apple
} from 'lucide-react';
import { Profile } from '@/types';

interface NavbarProps {
  profile: Profile | null;
  isOnline: boolean;
  theme: 'dark' | 'light';
  onThemeToggle: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  profile,
  isOnline,
  theme,
  onThemeToggle,
  onLogout,
}) => {
  const [isTauri, setIsTauri] = React.useState(true);
  const [downloadLoading, setDownloadLoading] = React.useState(false);
  const [showDownloadDropdown, setShowDownloadDropdown] = React.useState(false);

  React.useEffect(() => {
    const isTauriEnv = typeof window !== 'undefined' && (window as unknown as { __TAURI__?: unknown }).__TAURI__ !== undefined;
    setIsTauri(isTauriEnv);
  }, []);

  // Close dropdown on click outside
  React.useEffect(() => {
    if (!showDownloadDropdown) return;
    const handleOutsideClick = () => setShowDownloadDropdown(false);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, [showDownloadDropdown]);

  const handleDownload = async (platform: 'windows' | 'macos-silicon' | 'macos-intel', e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent dropdown from closing immediately
    setDownloadLoading(true);
    try {
      const res = await fetch("https://api.github.com/repos/kamrulislam2/quotes-and-sales-tracker/releases/latest");
      if (!res.ok) throw new Error("Failed to fetch release");
      const release = await res.json();
      
      const assets = release.assets || [];
      let downloadUrl = "";

      if (platform === 'windows') {
        const exeAsset = assets.find((asset: { name: string; browser_download_url: string }) => asset.name.endsWith('.exe'));
        if (exeAsset) downloadUrl = exeAsset.browser_download_url;
      } else if (platform === 'macos-silicon') {
        // Find assets ending in .dmg and containing aarch64 or arm64
        const siliconAsset = assets.find((asset: { name: string; browser_download_url: string }) => 
          asset.name.endsWith('.dmg') && (asset.name.includes('aarch64') || asset.name.includes('arm64'))
        );
        if (siliconAsset) downloadUrl = siliconAsset.browser_download_url;
      } else if (platform === 'macos-intel') {
        // Find assets ending in .dmg and containing x64 or x86_64
        const intelAsset = assets.find((asset: { name: string; browser_download_url: string }) => 
          asset.name.endsWith('.dmg') && (asset.name.includes('x64') || asset.name.includes('x86_64'))
        );
        if (intelAsset) downloadUrl = intelAsset.browser_download_url;
      }

      if (downloadUrl) {
        window.open(downloadUrl, '_blank');
      } else {
        window.open("https://github.com/kamrulislam2/quotes-and-sales-tracker/releases/latest", '_blank');
      }
    } catch (err) {
      console.error("Failed to fetch latest download link:", err);
      window.open("https://github.com/kamrulislam2/quotes-and-sales-tracker/releases/latest", '_blank');
    } finally {
      setDownloadLoading(false);
      setShowDownloadDropdown(false);
    }
  };
  return (
    <header className="bg-slate-900/40 backdrop-blur-md border-b border-slate-800/50 px-4 py-4 sm:px-6 lg:px-8 z-30">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-600/15 rounded-xl border border-blue-500/20 text-blue-400">
            <User className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              Welcome, {profile?.full_name || 'User'} ({profile?.username ? profile.username.toUpperCase() : ''})
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                profile?.role === 'admin'
                  ? 'bg-purple-950/60 border-purple-800 text-purple-300' 
                  : 'bg-blue-950/60 border-blue-800 text-blue-300'
              }`}>
                {profile?.role === 'admin' ? 'Admin' : 'Staff'}
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">Quotes & Sales Tracking Dashboard</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Online/Offline Badge */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium ${
            isOnline 
              ? 'bg-emerald-950/50 border-emerald-800/80 text-emerald-400' 
              : 'bg-amber-950/50 border-amber-800/80 text-amber-400'
          }`}>
            {isOnline ? (
              <>
                <Wifi className="h-4 w-4" /> Online
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4" /> Offline
              </>
            )}
          </div>

          {/* Theme Toggle */}
          <button
            onClick={onThemeToggle}
            className="p-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg cursor-pointer hover:scale-[1.03] active:scale-[0.97] transition-all flex items-center justify-center"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? (
              <Sun className="h-4.5 w-4.5 text-amber-500" />
            ) : (
              <Moon className="h-4.5 w-4.5 text-indigo-400" />
            )}
          </button>

          {/* Download App Dropdown (Only for Web Browser) */}
          {!isTauri && (
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDownloadDropdown(!showDownloadDropdown);
                }}
                disabled={downloadLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg text-xs font-semibold cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                title="Download Desktop App"
              >
                <Download className={`h-4 w-4 ${downloadLoading ? 'animate-bounce' : ''}`} />
                <span>Get App</span>
              </button>

              {showDownloadDropdown && (
                <div 
                  className="absolute right-0 mt-2 w-48 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl p-2 z-[999] animate-in fade-in slide-in-from-top-2 duration-200"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="px-2.5 py-1.5 border-b border-slate-900/10 mb-1">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Download Platform</p>
                  </div>
                  <button
                    onClick={(e) => handleDownload('windows', e)}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 hover:bg-slate-900 text-slate-200 hover:text-white rounded-lg text-xs font-medium text-left transition-colors cursor-pointer"
                  >
                    <Monitor className="h-4 w-4 text-blue-400" />
                    Windows (.exe)
                  </button>
                  <button
                    onClick={(e) => handleDownload('macos-silicon', e)}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 hover:bg-slate-900 text-slate-200 hover:text-white rounded-lg text-xs font-medium text-left transition-colors cursor-pointer"
                  >
                    <Apple className="h-4 w-4 text-indigo-400" />
                    macOS (Apple Silicon)
                  </button>
                  <button
                    onClick={(e) => handleDownload('macos-intel', e)}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 hover:bg-slate-900 text-slate-200 hover:text-white rounded-lg text-xs font-medium text-left transition-colors cursor-pointer"
                  >
                    <Apple className="h-4 w-4 text-slate-400" />
                    macOS (Intel)
                  </button>
                </div>
              )}
            </div>
          )}

          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-350 hover:text-white rounded-lg text-xs font-semibold cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      </div>
    </header>
  );
};
