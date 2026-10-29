import React, { useState, useEffect } from 'react';
import { Code, Copy, Check, Play, Edit3, Clock, Database, ChevronDown, ChevronUp } from 'lucide-react';

interface SqlViewerProps {
  sql: string;
  executionTimeMs: number;
  rowCount: number;
  onExecuteCustomSql: (customSql: string) => void;
  isLoading?: boolean;
}

export const SqlViewer: React.FC<SqlViewerProps> = ({
  sql,
  executionTimeMs,
  rowCount,
  onExecuteCustomSql,
  isLoading = false,
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [editedSql, setEditedSql] = useState(sql);

  useEffect(() => {
    setEditedSql(sql);
  }, [sql]);

  const handleCopy = () => {
    navigator.clipboard.writeText(sql);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleRun = () => {
    if (editedSql.trim()) {
      onExecuteCustomSql(editedSql.trim());
    }
  };

  return (
    <div className="rounded-xl bg-white border border-[#E2E8F0] overflow-hidden shadow-xs">
      {/* Header Bar */}
      <div className="px-4 py-3 bg-[#F7F9FC] border-b border-[#E2E8F0] flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Code className="w-4 h-4 text-[#3578D4]" />
          <span className="text-xs font-bold uppercase tracking-wider text-[#263449]">
            Executed SQL Query
          </span>
          <span className="text-[10px] font-semibold text-[#3578D4] bg-[#3578D4]/10 px-2 py-0.5 rounded-md border border-[#3578D4]/20">
            Read-Only
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Execution Time */}
          <span className="text-[11px] font-mono text-[#68778D] flex items-center space-x-1 bg-white px-2 py-0.5 rounded border border-[#E2E8F0]">
            <Clock className="w-3 h-3 text-[#12A88A]" />
            <span>{executionTimeMs}ms</span>
          </span>

          {/* Row Count */}
          <span className="text-[11px] font-mono text-[#68778D] flex items-center space-x-1 bg-white px-2 py-0.5 rounded border border-[#E2E8F0]">
            <Database className="w-3 h-3 text-[#3578D4]" />
            <span>{rowCount} rows</span>
          </span>

          {/* Toggle Edit */}
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`p-1.5 rounded-md text-xs font-medium transition-colors flex items-center space-x-1 ${
              isEditing
                ? 'bg-[#3578D4]/10 text-[#3578D4] border border-[#3578D4]/30'
                : 'text-[#68778D] hover:text-[#263449] bg-white border border-[#E2E8F0]'
            }`}
            title="Edit and re-run SQL query"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isEditing ? 'Close' : 'Edit SQL'}</span>
          </button>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-md text-[#68778D] hover:text-[#263449] hover:bg-white border border-[#E2E8F0] transition-colors"
            title="Copy SQL to clipboard"
          >
            {isCopied ? <Check className="w-4 h-4 text-[#12A88A]" /> : <Copy className="w-4 h-4" />}
          </button>

          {/* Collapse Toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-md text-[#68778D] hover:text-[#263449] hover:bg-white border border-[#E2E8F0] transition-colors"
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* SQL Code Body */}
      {!isCollapsed && (
        <div className="p-4 bg-[#F8FAFC] font-mono text-xs">
          {isEditing ? (
            <div className="space-y-3">
              <textarea
                value={editedSql}
                onChange={(e) => setEditedSql(e.target.value)}
                rows={4}
                className="w-full bg-white border border-[#3578D4] rounded-lg p-3 text-[#263449] text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#3578D4] leading-relaxed"
                placeholder="Enter read-only SELECT query..."
              />
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#68778D]">
                  Strict read-only: Only SELECT statements can be executed.
                </span>
                <button
                  onClick={handleRun}
                  disabled={isLoading}
                  className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-[#3578D4] hover:bg-[#2B63B3] disabled:opacity-50 text-white text-xs font-semibold transition-colors shadow-2xs"
                >
                  <Play className="w-3 h-3" />
                  <span>Execute SQL</span>
                </button>
              </div>
            </div>
          ) : (
            <pre className="text-[#263449] overflow-x-auto whitespace-pre-wrap leading-relaxed">
              <code>{sql}</code>
            </pre>
          )}
        </div>
      )}
    </div>
  );
};
