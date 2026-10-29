import React from 'react';
import { Layers, HelpCircle } from 'lucide-react';

interface NavbarProps {
  onOpenGuide: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenGuide }) => {
  return (
    <header className="bg-white border-b border-[#E2E8F0] sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-[#3578D4] text-white flex items-center justify-center font-bold shadow-xs">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg text-[#263449] tracking-tight">
                BizLens AI
              </span>
              <span className="text-[11px] font-medium text-[#12A88A] bg-[#12A88A]/10 px-2 py-0.5 rounded-md border border-[#12A88A]/20">
                Business Intelligence
              </span>
            </div>
            <p className="text-xs text-[#68778D] hidden sm:block">
              Natural Language & Voice Analytics Assistant
            </p>
          </div>
        </div>

        {/* Right Actions: Simple Help & Docs Button */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onOpenGuide}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#68778D] hover:text-[#263449] hover:bg-[#F7F9FC] border border-[#E2E8F0] transition-colors"
            title="View system architecture and guides"
          >
            <HelpCircle className="w-4 h-4 text-[#3578D4]" />
            <span className="hidden sm:inline">System Guide</span>
          </button>
        </div>
      </div>
    </header>
  );
};
