import React from 'react';
import { ShieldCheck, Moon, Sun, Clock, Sparkles } from 'lucide-react';
import type { ToolCategory } from '../types';

interface NavbarProps {
  currentCategory: ToolCategory;
  onSelectCategory: (cat: ToolCategory) => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenRecent: () => void;
  recentCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentCategory,
  onSelectCategory,
  isDark,
  onToggleTheme,
  onOpenRecent,
  recentCount,
}) => {
  const categories: { id: ToolCategory; label: string }[] = [
    { id: 'all', label: 'All Tools' },
    { id: 'organize', label: 'Organize' },
    { id: 'edit', label: 'Edit & Sign' },
    { id: 'convert', label: 'Convert' },
    { id: 'security', label: 'Security' },
    { id: 'optimize', label: 'Optimize' },
    { id: 'business', label: 'Business' },
  ];

  return (
    <header className="sticky top-4 z-40 px-4 sm:px-6 max-w-7xl mx-auto">
      <div className="liquid-glass rounded-3xl px-5 py-3.5 flex flex-col md:flex-row items-center justify-between gap-4 transition-all duration-300">
        
        {/* Logo and Brand */}
        <div className="flex items-center justify-between w-full md:w-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-ios-blue to-ios-purple flex items-center justify-center text-white font-black text-xl shadow-lg shadow-ios-blue/30 tracking-tight">
              RV
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300">
                  RV PDF
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-ios-blue/15 text-ios-blue border border-ios-blue/20">
                  PRO FREE
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-ios-green" /> 100% Client-Side Private
              </p>
            </div>
          </div>

          {/* Mobile Right Action Buttons */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={onOpenRecent}
              className="relative p-2.5 rounded-2xl liquid-glass-btn text-slate-700 dark:text-slate-200"
              title="Recent Files"
            >
              <Clock className="w-4 h-4" />
              {recentCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-ios-pink text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {recentCount}
                </span>
              )}
            </button>
            <button
              onClick={onToggleTheme}
              className="p-2.5 rounded-2xl liquid-glass-btn text-slate-700 dark:text-slate-200"
              title="Toggle Theme"
            >
              {isDark ? <Sun className="w-4 h-4 text-ios-yellow" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>
          </div>
        </div>

        {/* Category Pills (iOS Segmented Style) */}
        <nav className="flex items-center gap-1.5 overflow-x-auto max-w-full py-1 px-1.5 rounded-2xl bg-slate-200/50 dark:bg-slate-800/50 backdrop-blur-md scrollbar-none">
          {categories.map((cat) => {
            const isActive = currentCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                className={`whitespace-nowrap px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm shadow-black/10 scale-[1.02]'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </nav>

        {/* Desktop Action Buttons */}
        <div className="hidden md:flex items-center gap-2.5">
          <button
            onClick={onOpenRecent}
            className="relative px-3.5 py-2 rounded-2xl liquid-glass-btn text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Recent</span>
            {recentCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-ios-blue text-white text-[10px] font-bold">
                {recentCount}
              </span>
            )}
          </button>

          <button
            onClick={onToggleTheme}
            className="p-2.5 rounded-2xl liquid-glass-btn text-slate-700 dark:text-slate-200"
            title="Toggle Light/Dark Theme"
          >
            {isDark ? <Sun className="w-4 h-4 text-ios-yellow" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>
        </div>

      </div>
    </header>
  );
};
