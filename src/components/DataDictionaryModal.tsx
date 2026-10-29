import React from 'react';
import { X, Database, Layers, CheckCircle, AlertTriangle, ShieldCheck } from 'lucide-react';
import { DatasetMetadata } from '../types/bi';

interface DataDictionaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataset: DatasetMetadata | null;
}

export const DataDictionaryModal: React.FC<DataDictionaryModalProps> = ({ isOpen, onClose, dataset }) => {
  if (!isOpen || !dataset) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-[#E2E8F0] rounded-xl w-full max-w-3xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-white">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-[#3578D4]/10 text-[#3578D4] rounded-lg border border-[#3578D4]/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-[#263449]">{dataset.name}</h3>
                {dataset.isSynthetic ? (
                  <span className="text-[10px] font-medium bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
                    Synthetic Demo Data
                  </span>
                ) : (
                  <span className="text-[10px] font-medium bg-[#12A88A]/10 text-[#12A88A] px-2 py-0.5 rounded-full border border-[#12A88A]/20">
                    Custom Dataset
                  </span>
                )}
              </div>
              <p className="text-xs text-[#68778D]">
                SQLite Table: <code className="text-[#3578D4] font-mono">"{dataset.tableName}"</code> &bull;{' '}
                {dataset.rowCount.toLocaleString()} rows &bull; {dataset.columns.length} columns
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

        {/* Description */}
        <div className="px-6 py-3 bg-[#F7F9FC] border-b border-[#E2E8F0] text-xs text-[#68778D]">
          {dataset.description}
        </div>

        {/* Table Schema list */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#68778D] flex items-center space-x-1.5">
            <Layers className="w-4 h-4 text-[#3578D4]" />
            <span>Column Schema & Data Types</span>
          </h4>

          <div className="overflow-x-auto rounded-lg border border-[#E2E8F0] bg-white">
            <table className="w-full text-left text-xs text-[#263449]">
              <thead className="bg-[#F7F9FC] text-[#68778D] uppercase text-[10px] font-semibold border-b border-[#E2E8F0]">
                <tr>
                  <th className="px-4 py-2.5">Column Name</th>
                  <th className="px-4 py-2.5">SQL Type</th>
                  <th className="px-4 py-2.5">Data Quality</th>
                  <th className="px-4 py-2.5">Sample Values</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] font-mono text-[11px]">
                {dataset.columns.map((col) => (
                  <tr key={col.name} className="hover:bg-[#F7F9FC] transition-colors">
                    <td className="px-4 py-2 text-[#263449] font-semibold">{col.name}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-mono font-semibold ${
                          col.type === 'INTEGER' || col.type === 'REAL'
                            ? 'bg-blue-50 text-[#3578D4]'
                            : col.type === 'DATE'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {col.type}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {col.nullCount > 0 ? (
                        <span className="text-amber-700 flex items-center space-x-1 text-[10px]">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          <span>{col.nullCount} nulls</span>
                        </span>
                      ) : (
                        <span className="text-emerald-700 flex items-center space-x-1 text-[10px]">
                          <CheckCircle className="w-3 h-3 text-emerald-600" />
                          <span>100% complete</span>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-[#68778D] font-mono truncate max-w-xs">
                      {col.sampleValues.map((v) => JSON.stringify(v)).join(', ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#E2E8F0] bg-[#F7F9FC] flex items-center justify-between text-xs text-[#68778D]">
          <span className="flex items-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#12A88A]" />
            <span>BizLens AI uses this schema to synthesize valid SQLite SELECT statements.</span>
          </span>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-[#EDF2F7] text-[#263449] text-xs font-semibold border border-[#E2E8F0] shadow-2xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
