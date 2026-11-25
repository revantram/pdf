import React, { useState, useEffect, useMemo } from 'react';
import { Navbar } from './components/Navbar';
import { ToolCard } from './components/ToolCard';
import { ToolModal } from './components/ToolModal';
import { RecentModal } from './components/RecentModal';
import { ALL_TOOLS } from './services/toolList';
import type { ToolCategory, PDFTool, RecentItem } from './types';
import { Search, Shield, Zap, Sparkles, Heart } from 'lucide-react';

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

  // Dark Mode Theme
  const [isDark, setIsDark] = useState(() => {
    return (
      localStorage.getItem('rv_pdf_theme') === 'dark' ||
      (!('rv_pdf_theme' in localStorage) &&
        window.matchMedia('(prefers-color-scheme: dark)').matches)
    );
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
    <div className="relative min-h-screen text-slate-800 dark:text-slate-100 pb-20 overflow-hidden">
      {/* iOS Fluid Mesh Ambient Lights */}
      <div className="ambient-glow-1" />
      <div className="ambient-glow-2" />
      <div className="ambient-glow-3" />

      {/* Navigation Header */}
      <Navbar
        currentCategory={currentCategory}
        onSelectCategory={setCurrentCategory}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        onOpenRecent={() => setIsRecentOpen(true)}
        recentCount={recentItems.length}
      />

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-10 space-y-10">
        
        {/* Hero Section */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full liquid-glass text-xs font-bold text-ios-blue shadow-sm border border-ios-blue/20 animate-bounce-subtle">
            <Sparkles className="w-3.5 h-3.5 text-ios-blue" />
            <span>Apple iOS Liquid Glass UI &bull; 100% Free Forever</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-tight">
            Next-Gen PDF Studio,{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-ios-blue via-ios-purple to-ios-pink">
              Right in Your Device.
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 font-medium leading-relaxed max-w-2xl mx-auto">
            Merge, split, edit, sign, watermark, protect, and convert PDFs locally. 
            No logins, no server uploads, no limits, and absolute privacy.
          </p>

          {/* Liquid Glass Search Bar */}
          <div className="pt-2 max-w-md mx-auto">
            <div className="liquid-glass rounded-2xl p-1.5 flex items-center gap-2 shadow-lg shadow-black/5 border border-white/60 dark:border-white/10">
              <Search className="w-5 h-5 text-slate-400 ml-3 shrink-0" />
              <input
                type="text"
                placeholder="Search tools (e.g. merge, split, watermark, invoice)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-xs sm:text-sm py-2 px-1 focus:outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="mr-2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Feature Badges */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto">
          {[
            { icon: Shield, title: 'Zero Uploads', desc: 'Runs entirely in WebAssembly' },
            { icon: Zap, title: 'Lightning Speed', desc: 'No upload or download delays' },
            { icon: Sparkles, title: '26+ Pro Tools', desc: 'Full PDF chef feature set' },
            { icon: Heart, title: '100% Free', desc: 'No subscriptions or accounts' },
          ].map((item, i) => (
            <div
              key={i}
              className="liquid-glass-card p-3 rounded-2xl flex items-center gap-2.5"
            >
              <div className="w-8 h-8 rounded-xl bg-ios-blue/10 dark:bg-ios-blue/20 text-ios-blue flex items-center justify-center shrink-0">
                <item.icon className="w-4 h-4" />
              </div>
              <div className="truncate">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                  {item.title}
                </h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Tools Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <span>Available Tools</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                {filteredTools.length}
              </span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredTools.map((tool) => (
              <ToolCard
                key={tool.id}
                tool={tool}
                onOpen={(t) => setActiveTool(t)}
              />
            ))}
          </div>

          {filteredTools.length === 0 && (
            <div className="text-center py-16 liquid-glass rounded-3xl">
              <p className="text-base font-bold text-slate-600 dark:text-slate-300">
                No tools found matching "{searchQuery}"
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Try searching for another keyword or switch category.
              </p>
            </div>
          )}
        </div>

        {/* Privacy Note Banner */}
        <div className="liquid-glass rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 border border-white/60 dark:border-white/10">
          <div className="space-y-1 text-center md:text-left">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center justify-center md:justify-start gap-2">
              <Shield className="w-5 h-5 text-ios-green" /> Why RV PDF is Completely Private
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl">
              Unlike traditional online PDF converters that send your personal documents to remote servers,
              RV PDF executes all operations directly within your local browser runtime.
              Your confidential documents never touch any server.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTool(ALL_TOOLS.find((t) => t.id === 'merge') || null)}
              className="px-5 py-2.5 rounded-2xl bg-ios-blue text-white font-bold text-xs shadow-lg shadow-ios-blue/30 active:scale-95 transition-all"
            >
              Start with Merge PDF
            </button>
          </div>
        </div>

      </main>

      {/* Modals */}
      <ToolModal
        tool={activeTool}
        onClose={() => setActiveTool(null)}
        onSaveRecent={handleSaveRecent}
      />

      <RecentModal
        isOpen={isRecentOpen}
        onClose={() => setIsRecentOpen(false)}
        items={recentItems}
        onClear={handleClearRecent}
      />
    </div>
  );
};
