import React from 'react';
import { MessageSquare, Clock, Trash2 } from 'lucide-react';
import { ConversationTurn } from '../types/bi';

interface ConversationHistoryProps {
  history: ConversationTurn[];
  onSelectTurn: (turn: ConversationTurn) => void;
  onClearHistory: () => void;
  currentTurnId?: string;
}

export const ConversationHistory: React.FC<ConversationHistoryProps> = ({
  history,
  onSelectTurn,
  onClearHistory,
  currentTurnId,
}) => {
  if (history.length === 0) return null;

  return (
    <div className="rounded-xl bg-white border border-[#E2E8F0] p-4 shadow-xs space-y-3">
      <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2.5">
        <div className="flex items-center space-x-2">
          <MessageSquare className="w-4 h-4 text-[#3578D4]" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#263449]">
            Query Session History ({history.length})
          </h4>
        </div>
        <button
          onClick={onClearHistory}
          className="text-xs text-[#68778D] hover:text-rose-600 flex items-center space-x-1 transition-colors"
          title="Clear query history"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Clear History</span>
        </button>
      </div>

      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
        {history.map((turn, idx) => {
          const isSelected = turn.id === currentTurnId;
          return (
            <div
              key={turn.id}
              onClick={() => onSelectTurn(turn)}
              className={`p-3 rounded-lg border transition-all cursor-pointer flex flex-col space-y-1.5 ${
                isSelected
                  ? 'bg-blue-50/50 border-[#3578D4]'
                  : 'bg-[#F7F9FC] hover:bg-[#EDF2F7] border-[#E2E8F0]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-mono text-[#68778D]">#{idx + 1}</span>
                  <span className="text-xs font-semibold text-[#263449] truncate max-w-[200px] sm:max-w-xs">
                    {turn.question}
                  </span>
                </div>
                <span className="text-[10px] text-[#68778D] flex items-center space-x-1">
                  <Clock className="w-3 h-3 text-[#68778D]" />
                  <span>{turn.timestamp}</span>
                </span>
              </div>

              {turn.sql && (
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-mono text-[#3578D4] truncate max-w-[250px] sm:max-w-md">
                    {turn.sql}
                  </span>
                  {turn.result && (
                    <span className="text-[10px] text-[#68778D] bg-white px-1.5 py-0.5 rounded border border-[#E2E8F0] shrink-0 ml-2">
                      {turn.result.rowCount} rows &bull; {turn.result.executionTimeMs}ms
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
