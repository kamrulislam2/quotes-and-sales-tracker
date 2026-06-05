import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import PWARegister from "./pwa-register";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ToastProvider } from "@/components/ToastProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Quotes & Sales Tracker",
  description: "Track your quotes and sales data in real time.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Quotes",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="bn" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var savedTheme = localStorage.getItem('theme');
                  var theme = savedTheme || 'dark';
                  if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                  document.documentElement.classList.add('preload');
                  if (document.readyState === 'interactive' || document.readyState === 'complete') {
                    setTimeout(function() {
                      document.documentElement.classList.remove('preload');
                    }, 100);
                  } else {
                    window.addEventListener('DOMContentLoaded', function() {
                      setTimeout(function() {
                        document.documentElement.classList.remove('preload');
                      }, 100);
                    });
                  }
                } catch (e) {}
              })();
            `
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-slate-955 text-slate-100">
        <PWARegister />
        <ToastProvider />
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}

