import React from 'react';
import { X, Sparkles, Mic, Database, ShieldCheck, CheckCircle2, Terminal, Cpu, Layers } from 'lucide-react';

interface HelpGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpGuideModal: React.FC<HelpGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-[#E2E8F0] rounded-xl w-full max-w-3xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-white">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-[#3578D4]/10 text-[#3578D4] rounded-lg border border-[#3578D4]/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-[#263449]">BizLens AI System Architecture</h3>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#12A88A]/10 text-[#12A88A] border border-[#12A88A]/20">
                  Business Intelligence
                </span>
              </div>
              <p className="text-xs text-[#68778D]">
                Voice-Enabled Analytics & Safe SQL Execution Engine
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#68778D] hover:text-[#263449] hover:bg-[#F7F9FC] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-[#263449] text-xs leading-relaxed">
          {/* Executive Overview */}
          <div className="p-4 rounded-xl bg-[#F7F9FC] border border-[#E2E8F0] space-y-1.5">
            <h4 className="text-sm font-bold text-[#263449] flex items-center space-x-1.5">
              <Sparkles className="w-4 h-4 text-[#3578D4]" />
              <span>Core Principle: Real SQL Execution, Zero Fabricated Numbers</span>
            </h4>
            <p className="text-[#68778D]">
              Small business owners need answers without wrestling with complex SQL syntax or static BI tools.
              <strong> BizLens AI</strong> bridges that gap: speak or type natural business questions, generate safe
              SQLite queries, execute them on a sandboxed database engine, and receive interactive visualizations plus
              grounded spoken business insights.
            </p>
          </div>

          {/* 4-Step Pipeline */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#68778D]">
              End-to-End Processing Pipeline
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-white border border-[#E2E8F0] space-y-1.5 shadow-2xs">
                <div className="flex items-center space-x-2 text-[#3578D4] font-bold">
                  <Mic className="w-4 h-4" />
                  <span>1. Voice to English Text</span>
                </div>
                <p className="text-[#68778D]">
                  Browser Speech Recognition captures spoken English, displays real-time transcription, and allows user
                  editing prior to submitting queries.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-white border border-[#E2E8F0] space-y-1.5 shadow-2xs">
                <div className="flex items-center space-x-2 text-[#12A88A] font-bold">
                  <Cpu className="w-4 h-4" />
                  <span>2. Schema-Aware SQL Generation</span>
                </div>
                <p className="text-[#68778D]">
                  The server supplies the active table's exact column names, data types, and conversational history to
                  produce precise SQLite queries.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-white border border-[#E2E8F0] space-y-1.5 shadow-2xs">
                <div className="flex items-center space-x-2 text-[#3578D4] font-bold">
                  <Database className="w-4 h-4" />
                  <span>3. In-Memory SQLite Engine</span>
                </div>
                <p className="text-[#68778D]">
                  Strict AST safety checks ensure read-only SELECT execution (blocking destructive statements). Queries
                  execute against in-memory SQLite in single-digit milliseconds.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-white border border-[#E2E8F0] space-y-1.5 shadow-2xs">
                <div className="flex items-center space-x-2 text-[#12A88A] font-bold">
                  <Sparkles className="w-4 h-4" />
                  <span>4. Dynamic Charts & Spoken Insight</span>
                </div>
                <p className="text-[#68778D]">
                  Actual database records are presented as KPI summary cards, interactive charts, and sortable tables,
                  with a concise voice summary spoken aloud via browser speech synthesis.
                </p>
              </div>
            </div>
          </div>

          {/* Safe & Trustworthy */}
          <div className="p-4 rounded-xl bg-[#F7F9FC] border border-[#E2E8F0] space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#263449] flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-[#12A88A]" />
              <span>Trust & Security Architecture</span>
            </h4>
            <ul className="space-y-1 text-[#68778D]">
              <li className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#12A88A] shrink-0" />
                <span>API credentials remain strictly server-side (<code className="text-[#3578D4] font-mono">process.env.GEMINI_API_KEY</code>); never exposed in browser code.</span>
              </li>
              <li className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#12A88A] shrink-0" />
                <span>SQL execution restricts access to read-only SELECT; mutating operations (DROP, DELETE, UPDATE) are strictly blocked.</span>
              </li>
              <li className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#12A88A] shrink-0" />
                <span>Zero hallucination policy: insights and key takeaways are strictly grounded in executed query records.</span>
              </li>
            </ul>
          </div>

          {/* Running & Deployment */}
          <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] space-y-2 shadow-2xs">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#68778D] flex items-center space-x-1.5">
              <Terminal className="w-4 h-4 text-[#3578D4]" />
              <span>Running Commands</span>
            </h4>
            <div className="bg-[#F7F9FC] border border-[#E2E8F0] p-3 rounded-lg font-mono text-[11px] text-[#263449] space-y-1">
              <p className="text-[#68778D]"># Full-Stack Development Server (Express + Vite)</p>
              <p className="font-semibold text-[#3578D4]">npm run dev</p>
              <p className="text-[#68778D] pt-1"># Production Build</p>
              <p className="font-semibold text-[#3578D4]">npm run build && npm start</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#E2E8F0] bg-[#F7F9FC] flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#3578D4] hover:bg-[#2B63B3] text-white text-xs font-semibold shadow-2xs transition-colors"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
