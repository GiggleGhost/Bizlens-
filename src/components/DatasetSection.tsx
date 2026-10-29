import React from 'react';
import { Database, Upload, FileSpreadsheet, Download, CheckCircle2, Info } from 'lucide-react';
import { DatasetMetadata } from '../types/bi';

interface DatasetSectionProps {
  datasets: DatasetMetadata[];
  activeDataset: DatasetMetadata | null;
  onSelectDataset: (id: string) => void;
  onOpenUpload: () => void;
  onOpenSchema: () => void;
}

export const DatasetSection: React.FC<DatasetSectionProps> = ({
  datasets,
  activeDataset,
  onSelectDataset,
  onOpenUpload,
  onOpenSchema,
}) => {
  const handleDownloadSample = async () => {
    try {
      const res = await fetch('/api/sample-csv');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'synthetic_retail_sales.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download sample error:', err);
    }
  };

  return (
    <section className="bg-white border border-[#E2E8F0] rounded-xl p-4 sm:p-5 shadow-xs transition-all">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Active Dataset Selector & Info */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#68778D] flex items-center space-x-1.5">
              <Database className="w-3.5 h-3.5 text-[#3578D4]" />
              <span>Active Business Dataset</span>
            </span>

            {activeDataset?.isSynthetic ? (
              <span className="text-[11px] font-medium bg-amber-50 text-amber-700 px-2.5 py-0.5 rounded-full border border-amber-200">
                Synthetic Demonstration Data
              </span>
            ) : (
              <span className="text-[11px] font-medium bg-[#12A88A]/10 text-[#12A88A] px-2.5 py-0.5 rounded-full border border-[#12A88A]/20">
                Custom Uploaded CSV
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Dataset Dropdown */}
            <div className="relative">
              <select
                value={activeDataset?.id || ''}
                onChange={(e) => onSelectDataset(e.target.value)}
                className="bg-[#F7F9FC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm font-semibold text-[#263449] focus:outline-none focus:ring-2 focus:ring-[#3578D4]/20 focus:border-[#3578D4] cursor-pointer min-w-[220px]"
                aria-label="Select Active Business Dataset"
              >
                {datasets.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} {d.isSynthetic ? '(Sample)' : `(${d.rowCount} rows)`}
                  </option>
                ))}
              </select>
            </div>

            {/* Factual Stats Badge */}
            {activeDataset && (
              <div className="flex items-center space-x-3 text-xs text-[#68778D] bg-[#F7F9FC] px-3 py-2 rounded-lg border border-[#E2E8F0]">
                <span>
                  Table: <strong className="text-[#263449] font-mono">{activeDataset.tableName}</strong>
                </span>
                <span className="text-[#E2E8F0]">&bull;</span>
                <span>
                  Records: <strong className="text-[#263449]">{activeDataset.rowCount.toLocaleString()}</strong>
                </span>
                <span className="text-[#E2E8F0]">&bull;</span>
                <span>
                  Columns: <strong className="text-[#263449]">{activeDataset.columns.length}</strong>
                </span>
              </div>
            )}
          </div>

          {activeDataset && (
            <p className="text-xs text-[#68778D] max-w-2xl leading-relaxed">
              {activeDataset.description}
            </p>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-center shrink-0">
          <button
            onClick={onOpenSchema}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-[#F7F9FC] hover:bg-[#EDF2F7] text-[#263449] text-xs font-semibold border border-[#E2E8F0] transition-colors"
            title="Inspect dataset columns, types, and sample records"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#3578D4]" />
            <span>Schema & Columns</span>
          </button>

          {activeDataset?.isSynthetic && (
            <button
              onClick={handleDownloadSample}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-[#F7F9FC] hover:bg-[#EDF2F7] text-[#68778D] hover:text-[#263449] text-xs font-medium border border-[#E2E8F0] transition-colors"
              title="Download sample retail CSV to test uploading"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sample CSV</span>
            </button>
          )}

          <button
            onClick={onOpenUpload}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-[#3578D4] hover:bg-[#2B63B3] text-white text-xs font-semibold shadow-xs transition-colors"
            title="Upload your business spreadsheet (.csv)"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload CSV Data</span>
          </button>
        </div>
      </div>
    </section>
  );
};
