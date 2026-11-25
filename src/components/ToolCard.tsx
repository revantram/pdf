import React from 'react';
import * as Icons from 'lucide-react';
import type { PDFTool } from '../types';

interface ToolCardProps {
  tool: PDFTool;
  onOpen: (tool: PDFTool) => void;
}

export const ToolCard: React.FC<ToolCardProps> = ({ tool, onOpen }) => {
  // Dynamically get Lucide icon
  const IconComponent = (Icons as any)[tool.icon] || Icons.FileText;

  return (
    <div
      onClick={() => onOpen(tool)}
      className="liquid-glass-card group relative p-5 rounded-3xl cursor-pointer flex flex-col justify-between overflow-hidden"
    >
      {/* Subtle background ambient blur glow for each card */}
      <div
        className="absolute -right-8 -top-8 w-24 h-24 rounded-full opacity-20 group-hover:opacity-40 transition-opacity blur-2xl pointer-events-none"
        style={{ backgroundColor: tool.color }}
      />

      <div>
        <div className="flex items-center justify-between mb-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md transition-transform duration-300 group-hover:scale-110"
            style={{
              background: `linear-gradient(135deg, ${tool.color} 0%, ${tool.color}CC 100%)`,
              boxShadow: `0 8px 18px -4px ${tool.color}55`,
            }}
          >
            <IconComponent className="w-6 h-6 stroke-[2.2]" />
          </div>

          {tool.badge && (
            <span
              className="text-[10px] font-bold tracking-wide uppercase px-2.5 py-1 rounded-full border"
              style={{
                color: tool.color,
                backgroundColor: `${tool.color}15`,
                borderColor: `${tool.color}30`,
              }}
            >
              {tool.badge}
            </span>
          )}
        </div>

        <h3 className="font-bold text-base text-slate-800 dark:text-slate-100 tracking-tight group-hover:text-ios-blue transition-colors">
          {tool.title}
        </h3>
        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          {tool.description}
        </p>
      </div>

      <div className="mt-5 pt-3.5 border-t border-slate-200/40 dark:border-slate-700/40 flex items-center justify-between text-[11px] font-semibold text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200">
        <span className="flex items-center gap-1">
          {tool.multiple ? 'Multi-file' : 'Instant Run'}
        </span>
        <span className="flex items-center gap-0.5 text-ios-blue group-hover:translate-x-1 transition-transform">
          Open &rarr;
        </span>
      </div>
    </div>
  );
};
