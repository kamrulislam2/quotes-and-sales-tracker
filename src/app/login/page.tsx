"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase";
import { Lock, Mail, AlertCircle, Loader, Eye, EyeOff, Monitor, Apple } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isTauri, setIsTauri] = useState(true); // Default to true to prevent screen flash on desktop app
  const [downloadLoading, setDownloadLoading] = useState(false);
  const router = useRouter();

  // Load theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "dark";
    if (savedTheme === "light") {
      document.documentElement.classList.remove("dark");
    } else {
      document.documentElement.classList.add("dark");
    }

    const isTauriEnv = typeof window !== 'undefined' && (window as unknown as { __TAURI__?: unknown }).__TAURI__ !== undefined;
    setIsTauri(isTauriEnv);
  }, []);

  const handleDownload = async (platform: 'windows' | 'macos-silicon' | 'macos-intel') => {
    setDownloadLoading(true);
    try {
      const res = await fetch("https://api.github.com/repos/kamrulislam2/quotes-and-sales-tracker/releases/latest");
      if (!res.ok) throw new Error("Failed to fetch release");
      const release = await res.json();
      
      const assets = release.assets || [];
      let downloadUrl = "";

      if (platform === 'windows') {
        // Find assets ending in .exe
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
    }
  };

  // Redirect if already logged in
  useEffect(() => {
    const checkUser = async () => {
      try {
        // Create a 4-second timeout promise to prevent hanging on initial boot database locks
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Session check timed out')), 4000)
        );

        const result = await Promise.race([
          supabase.auth.getSession(),
          timeoutPromise
        ]) as { data: { session: unknown } | null; error: unknown };

        const session = result?.data?.session;
        const sessionError = result?.error;
        if (sessionError) throw sessionError;

        if (session) {
          router.push("/");
        }
      } catch (err) {
        console.error("Error during checkUser session check:", err);

        // Self-healing reload on timeout/error
        if (typeof window !== "undefined") {
          const reloadCount = sessionStorage.getItem("quotes_sales_login_reload_count") || "0";
          if (parseInt(reloadCount, 10) < 1) {
            sessionStorage.setItem("quotes_sales_login_reload_count", "1");
            console.warn("Session check failed or timed out. Attempting self-healing reload...");
            window.location.reload();
            return;
          }
        }
      }
    };
    
    // Delay the initial check by 200ms to allow WebView to fully initialize
    const timer = setTimeout(() => {
      checkUser();
    }, 200);

    return () => clearTimeout(timer);
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Try resolving username/codename to registered email first
    let loginEmail = email.trim();
    if (!loginEmail.includes("@")) {
      try {
        const { data: resolvedEmail } = await supabase.rpc(
          "get_user_email_by_username",
          { p_username: loginEmail },
        );
        if (resolvedEmail) {
          loginEmail = resolvedEmail;
        } else {
          // fallback mapping
          loginEmail = `${loginEmail.toLowerCase()}@office.local`;
        }
      } catch {
        // fallback mapping
        loginEmail = `${loginEmail.toLowerCase()}@office.local`;
      }
    }

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword(
        {
          email: loginEmail,
          password: password,
        },
      );

      if (authError) {
        setError(
          authError.message === "Invalid login credentials"
            ? "Invalid codename or password..."
            : authError.message,
        );
        setLoading(false);
        return;
      }

      if (data.session) {
        router.push("/");
        router.refresh();
      }
    } catch {
      setError("An error occurred during login. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-slate-950 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-blue-900/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-violet-900/20 blur-[120px] pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
        <h2 className="mt-6 text-center text-3xl font-extrabold tracking-tight text-white bg-clip-text bg-linear-to-r from-blue-400 to-violet-400">
          Quotes
        </h2>
        <p className="mt-2 text-center text-sm text-slate-405">
          Login to submit your file entries
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4 sm:px-0">
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/80 py-8 px-4 shadow-2xl rounded-2xl sm:px-10">
          <form className="space-y-6" onSubmit={handleLogin}>
            {error && (
              <div className="rounded-lg bg-red-950/50 border border-red-800/50 p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                <div className="text-sm text-red-200">{error}</div>
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-300"
              >
                Codename
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-500" aria-hidden="true" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="text"
                  required
                  placeholder="e.g. KI1024"
                  value={email}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEmail(val.includes("@") ? val : val.toUpperCase());
                  }}
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-955 border border-slate-800 rounded-lg text-white placeholder-slate-550 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-300"
              >
                Password
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-500" aria-hidden="true" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-2.5 bg-slate-950/80 border border-slate-800 rounded-lg text-white placeholder-slate-550 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors focus:outline-none"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <Eye className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-semibold text-white bg-linear-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:via-indigo-500 hover:to-violet-500 hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-blue-950/20"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader className="animate-spin h-5 w-5 text-white" />{" "}
                    Loading...
                  </span>
                ) : (
                  "Login"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Download Desktop App button section - only shown in web browser */}
      {!isTauri && (
        <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4 sm:px-0 text-center animate-in fade-in slide-in-from-bottom-3 duration-500">
          <div className="bg-slate-900/30 backdrop-blur-md border border-slate-800/50 py-4 px-6 rounded-2xl flex flex-col items-center justify-center gap-3">
            <div className="flex flex-col">
              <span className="text-xs text-slate-400 font-medium">Submit files faster with the</span>
              <span className="text-sm text-slate-100 font-semibold bg-clip-text bg-linear-to-r from-blue-400 to-violet-400">Quotes Desktop Application</span>
            </div>
            
            <div className="grid grid-cols-3 gap-2 w-full">
              <button
                onClick={() => handleDownload('windows')}
                disabled={downloadLoading}
                className="flex flex-col items-center justify-center gap-1.5 py-2 px-1 border border-slate-800/80 rounded-xl bg-slate-900/40 text-[10px] font-semibold text-slate-200 hover:bg-slate-800/80 hover:text-white hover:border-slate-700 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
              >
                <Monitor className="w-3.5 h-3.5" />
                Windows
              </button>
              <button
                onClick={() => handleDownload('macos-silicon')}
                disabled={downloadLoading}
                className="flex flex-col items-center justify-center gap-1.5 py-2 px-1 border border-slate-800/80 rounded-xl bg-slate-900/40 text-[10px] font-semibold text-slate-200 hover:bg-slate-800/80 hover:text-white hover:border-slate-700 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
              >
                <Apple className="w-3.5 h-3.5 text-indigo-400" />
                Mac (Silicon)
              </button>
              <button
                onClick={() => handleDownload('macos-intel')}
                disabled={downloadLoading}
                className="flex flex-col items-center justify-center gap-1.5 py-2 px-1 border border-slate-800/80 rounded-xl bg-slate-900/40 text-[10px] font-semibold text-slate-200 hover:bg-slate-800/80 hover:text-white hover:border-slate-700 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
              >
                <Apple className="w-3.5 h-3.5 text-slate-400" />
                Mac (Intel)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
