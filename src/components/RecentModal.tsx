import React from 'react';
import { X, Clock, Download, Trash2, FileCheck } from 'lucide-react';
import type { RecentItem } from '../types';

interface RecentModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: RecentItem[];
  onClear: () => void;
}

export const RecentModal: React.FC<RecentModalProps> = ({ isOpen, onClose, items, onClear }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-fade-in">
      <div className="liquid-glass w-full max-w-lg rounded-3xl overflow-hidden flex flex-col shadow-2xl border border-white/60 dark:border-white/15">
        
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800/60">
          <div className="flex items-center gap-2.5">
            <Clock className="w-5 h-5 text-ios-blue" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Local Output History
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-200/50 dark:hover:bg-slate-700/50 text-slate-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 max-h-[60vh] overflow-y-auto space-y-2.5">
          {items.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <FileCheck className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-semibold">No recent files yet</p>
              <p className="text-xs mt-1">Processed files will appear here locally in this browser.</p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="liquid-glass-card p-3 rounded-2xl flex items-center justify-between gap-3 border border-slate-200/50 dark:border-slate-700/50"
              >
                <div className="truncate">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                    {item.name}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {item.tool} &bull; {(item.size / 1024).toFixed(1)} KB &bull;{' '}
                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                {item.blobUrl && (
                  <a
                    href={item.blobUrl}
                    download={item.name}
                    className="p-2 rounded-xl bg-ios-blue/15 hover:bg-ios-blue/25 text-ios-blue transition-colors shrink-0"
                    title="Download Again"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="px-6 py-3 border-t border-slate-200/50 dark:border-slate-800/60 flex items-center justify-between bg-slate-100/40 dark:bg-slate-800/30">
            <button
              onClick={onClear}
              className="text-xs font-semibold text-ios-pink hover:underline flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear History
            </button>
            <span className="text-[11px] text-slate-400">
              Stored locally &bull; 0 server trace
            </span>
          </div>
        )}

      </div>
    </div>
  );
};
