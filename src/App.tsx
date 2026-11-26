import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { ToolCard } from './components/ToolCard';
import { ToolModal } from './components/ToolModal';
import { RecentModal } from './components/RecentModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ALL_TOOLS } from './services/toolList';
import type { ToolCategory, PDFTool, RecentItem } from './types';
import { Search } from 'lucide-react';

declare global {
  interface Window {
    __rvPdfHandleBack?: () => 'handled' | 'exit';
  }
}

export const App: React.FC = () => {
  const [currentCategory, setCurrentCategory] = useState<ToolCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTool, setActiveTool] = useState<PDFTool | null>(null);
  const [isRecentOpen, setIsRecentOpen] = useState(false);
  const [recentItems, setRecentItems] = useState<RecentItem[]>(() => {
    try {
      const saved = localStorage.getItem('rv_pdf_recent');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Dark Mode Theme (Default to Dark for OLED aesthetic)
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('rv_pdf_theme');
    if (saved) return saved === 'dark';
    return true; // default dark OLED
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('rv_pdf_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('rv_pdf_theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);

  // Keep latest state refs for synchronous Android hardware/gesture back button handling
  const stateRef = useRef({ activeTool, isRecentOpen, searchQuery, currentCategory });
  stateRef.current = { activeTool, isRecentOpen, searchQuery, currentCategory };

  useEffect(() => {
    window.__rvPdfHandleBack = () => {
      const s = stateRef.current;
      if (s.activeTool) {
        setActiveTool(null);
        return 'handled';
      }
      if (s.isRecentOpen) {
        setIsRecentOpen(false);
        return 'handled';
      }
      if (s.searchQuery) {
        setSearchQuery('');
        return 'handled';
      }
      if (s.currentCategory !== 'all') {
        setCurrentCategory('all');
        return 'handled';
      }
      return 'exit';
    };

    const handlePopState = () => {
      const s = stateRef.current;
      if (s.activeTool) {
        setActiveTool(null);
      } else if (s.isRecentOpen) {
        setIsRecentOpen(false);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      delete window.__rvPdfHandleBack;
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Push browser history state when opening a modal so back navigation stays inside the app
  useEffect(() => {
    if (activeTool || isRecentOpen) {
      if (!window.history.state?.rvModal) {
        window.history.pushState({ rvModal: true }, '');
      }
    }
  }, [activeTool, isRecentOpen]);

  const handleSaveRecent = (item: RecentItem) => {
    setRecentItems((prev) => {
      const updated = [item, ...prev.filter((i) => i.id !== item.id)].slice(0, 20);
      try {
        localStorage.setItem('rv_pdf_recent', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleClearRecent = () => {
    setRecentItems([]);
    try {
      localStorage.removeItem('rv_pdf_recent');
    } catch {}
  };

  // Filter tools by category and search
  const filteredTools = useMemo(() => {
    return ALL_TOOLS.filter((tool) => {
      const matchesCategory =
        currentCategory === 'all' || tool.category === currentCategory;
      const matchesSearch =
        tool.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [currentCategory, searchQuery]);

  return (
    <div className="relative min-h-screen bg-[#F2F2F7] dark:bg-[#000000] text-slate-800 dark:text-slate-100 pb-16 overflow-x-hidden selection:bg-ios-blue/20">
      {/* Header and Category Tabs */}
      <Navbar
        currentCategory={currentCategory}
        onSelectCategory={setCurrentCategory}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        onOpenRecent={() => setIsRecentOpen(true)}
        recentCount={recentItems.length}
      />

      {/* Main Content */}
      <main className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 pt-4 space-y-4">
        
        {/* Search Bar */}
        <div className="w-full">
          <div className="liquid-glass rounded-2xl p-1 flex items-center gap-2 border border-white/60 dark:border-white/10 shadow-sm">
            <Search className="w-4 h-4 text-slate-400 ml-3 shrink-0" />
            <input
              type="text"
              placeholder="Search tools (e.g. merge, split, watermark)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-xs sm:text-sm py-2 px-1 focus:outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mr-3 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Section Title */}
        <div className="flex items-center justify-between px-1 pt-1">
          <h2 className="text-sm font-bold tracking-tight text-slate-700 dark:text-slate-300">
            Available Tools
          </h2>
          <span className="text-[11px] font-semibold text-slate-400">
            {filteredTools.length} tools
          </span>
        </div>

        {/* Structured 2x2 Grid Layout */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {filteredTools.map((tool) => (
            <ToolCard
              key={tool.id}
              tool={tool}
              onOpen={(t) => setActiveTool(t)}
            />
          ))}
        </div>

        {filteredTools.length === 0 && (
          <div className="text-center py-16 liquid-glass rounded-2xl">
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              No tools found matching "{searchQuery}"
            </p>
          </div>
        )}

      </main>

      {/* Modals */}
      {activeTool && (
        <ErrorBoundary
          fallbackTitle={`${activeTool.title} Error`}
          onReset={() => setActiveTool(null)}
        >
          <ToolModal
            tool={activeTool}
            onClose={() => setActiveTool(null)}
            onSaveRecent={handleSaveRecent}
          />
        </ErrorBoundary>
      )}

      <RecentModal
        isOpen={isRecentOpen}
        onClose={() => setIsRecentOpen(false)}
        items={recentItems}
        onClear={handleClearRecent}
      />
    </div>
  );
};
