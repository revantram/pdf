import React from 'react';
import { Moon, Sun, Clock } from 'lucide-react';
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
    <header className="w-full z-40 pt-[max(env(safe-area-inset-top,42px),42px)] px-4 sm:px-6 max-w-4xl mx-auto">
      <div className="liquid-glass rounded-2xl px-4 py-3 flex items-center justify-between transition-all duration-300">
        
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-ios-blue to-ios-purple flex items-center justify-center text-white font-black text-lg shadow-md shadow-ios-blue/30 tracking-tight">
            RV
          </div>
          <span className="font-extrabold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300">
            RV PDF
          </span>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenRecent}
            className="relative p-2 rounded-xl liquid-glass-btn text-slate-700 dark:text-slate-200"
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
            className="p-2 rounded-xl liquid-glass-btn text-slate-700 dark:text-slate-200"
            title="Toggle Light/Dark Theme"
          >
            {isDark ? <Sun className="w-4 h-4 text-ios-yellow" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>
        </div>

      </div>

      {/* Category Tabs below header */}
      <div className="mt-3 overflow-x-auto scrollbar-none py-1">
        <nav className="flex items-center gap-1.5 w-max mx-auto px-1">
          {categories.map((cat) => {
            const isActive = currentCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                className={`whitespace-nowrap px-3 py-1.5 text-xs font-semibold rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-ios-blue text-white shadow-sm shadow-ios-blue/20 scale-[1.02]'
                    : 'bg-white/40 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-white/40 dark:border-white/5'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
