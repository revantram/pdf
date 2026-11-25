import React from 'react';
import * as Icons from 'lucide-react';
import type { PDFTool } from '../types';

interface ToolCardProps {
  tool: PDFTool;
  onOpen: (tool: PDFTool) => void;
}

export const ToolCard: React.FC<ToolCardProps> = ({ tool, onOpen }) => {
  const IconComponent = (Icons as any)[tool.icon] || Icons.FileText;

  return (
    <div
      onClick={() => onOpen(tool)}
      className="liquid-glass-card group relative p-4 rounded-2xl cursor-pointer flex flex-col justify-between overflow-hidden h-full min-h-[140px] select-none active:scale-[0.98] transition-transform"
    >
      {/* Subtle ambient light dot */}
      <div
        className="absolute -right-6 -top-6 w-20 h-20 rounded-full opacity-15 group-hover:opacity-30 transition-opacity blur-xl pointer-events-none"
        style={{ backgroundColor: tool.color }}
      />

      <div className="space-y-2.5">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm transition-transform duration-200 group-hover:scale-105"
          style={{
            background: `linear-gradient(135deg, ${tool.color} 0%, ${tool.color}CC 100%)`,
          }}
        >
          <IconComponent className="w-5 h-5 stroke-[2.2]" />
        </div>

        <div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 tracking-tight group-hover:text-ios-blue transition-colors line-clamp-1">
            {tool.title}
          </h3>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 leading-snug line-clamp-2">
            {tool.description}
          </p>
        </div>
      </div>
    </div>
  );
};
