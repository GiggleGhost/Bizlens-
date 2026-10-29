import React, { useState, useRef } from 'react';
import { X, Upload, FileText, AlertTriangle, CheckCircle, Download, Table, Layers, ArrowRight } from 'lucide-react';
import Papa from 'papaparse';
import { DatasetMetadata } from '../types/bi';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (newDataset: DatasetMetadata) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onUploadSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [datasetName, setDatasetName] = useState('');
  const [csvRawText, setCsvRawText] = useState<string>('');
  const [previewRows, setPreviewRows] = useState<Record<string, any>[]>([]);
  const [columnsSummary, setColumnsSummary] = useState<
    { name: string; type: string; sample: string; nulls: number }[]
  >([]);
  const [totalRows, setTotalRows] = useState<number>(0);
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = (selectedFile: File) => {
    if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
      setErrorMsg('Please select a valid CSV file (.csv format only).');
      return;
    }

    setFile(selectedFile);
    setDatasetName(selectedFile.name.replace(/\.csv$/i, '').replace(/[-_]/g, ' '));
    setErrorMsg(null);
    setIsParsing(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setCsvRawText(text);

      Papa.parse(text, {
        header: true,
        skipEmptyLines: 'greedy',
        complete: (results) => {
          setIsParsing(false);
          if (results.errors.length > 0 && (!results.data || results.data.length === 0)) {
            setErrorMsg(`CSV Parsing issue: ${results.errors[0].message}`);
            return;
          }

          const data = results.data as Record<string, any>[];
          if (data.length === 0) {
            setErrorMsg('The selected CSV file has no data rows.');
            return;
          }

          setTotalRows(data.length);
          setPreviewRows(data.slice(0, 10));

          const headers = Object.keys(data[0]);
          const summary = headers.map((header) => {
            const vals = data.map((r) => r[header]);
            const nulls = vals.filter((v) => v === null || v === undefined || String(v).trim() === '').length;
            const nonNulls = vals.filter((v) => v !== null && v !== undefined && String(v).trim() !== '');

            let detectedType = 'TEXT';
            if (nonNulls.length > 0) {
              const allInt = nonNulls.every((v) => /^-?\d+$/.test(String(v).trim()));
              const allFloat = nonNulls.every((v) => /^-?\d+(\.\d+)?$/.test(String(v).trim()));
              const allDate = nonNulls.every((v) => /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(String(v).trim()));

              if (allDate) detectedType = 'DATE';
              else if (allInt) detectedType = 'INTEGER';
              else if (allFloat) detectedType = 'REAL';
            }

            return {
              name: header,
              type: detectedType,
              sample: String(nonNulls[0] ?? '—'),
              nulls,
            };
          });

          setColumnsSummary(summary);
        },
        error: (err: any) => {
          setIsParsing(false);
          setErrorMsg(`Failed to read CSV: ${err.message}`);
        },
      });
    };

    reader.onerror = () => {
      setIsParsing(false);
      setErrorMsg('Failed to read the local file.');
    };

    reader.readAsText(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!csvRawText || !file) {
      setErrorMsg('Please upload a CSV file first.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/upload-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csvData: csvRawText,
          fileName: file.name,
          datasetName: datasetName.trim() || 'Uploaded CSV Data',
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Server failed to process dataset.');
      }

      onUploadSuccess(json.dataset);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error occurred while uploading.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-[#E2E8F0] rounded-xl w-full max-w-4xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-white">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-[#3578D4]/10 text-[#3578D4] rounded-lg border border-[#3578D4]/20">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#263449]">Upload CSV Business Data</h3>
              <p className="text-xs text-[#68778D]">
                Make any spreadsheet queryable with natural language and voice
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

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {errorMsg && (
            <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Upload Dropzone */}
          {!file ? (
            <div>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#E2E8F0] hover:border-[#3578D4] rounded-xl p-8 text-center cursor-pointer transition-colors bg-[#F7F9FC] hover:bg-[#EDF2F7] group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                />
                <div className="w-12 h-12 mx-auto rounded-full bg-white text-[#68778D] group-hover:text-[#3578D4] flex items-center justify-center mb-3 shadow-2xs transition-colors border border-[#E2E8F0]">
                  <Upload className="w-5 h-5" />
                </div>
                <p className="text-sm font-semibold text-[#263449]">
                  Click or drag and drop your CSV file here
                </p>
                <p className="text-xs text-[#68778D] mt-1">
                  Supports sales, customer orders, inventory, or financial data (.csv)
                </p>
              </div>

              {/* Sample file download option */}
              <div className="mt-4 p-4 rounded-xl bg-[#F7F9FC] border border-[#E2E8F0] flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FileText className="w-5 h-5 text-[#3578D4]" />
                  <div>
                    <p className="text-xs font-semibold text-[#263449]">
                      Need a sample file to test uploading?
                    </p>
                    <p className="text-[11px] text-[#68778D]">
                      Download our 200-order retail sales CSV to test custom upload right away.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadSample}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-white hover:bg-[#EDF2F7] text-[#263449] text-xs font-medium transition-colors border border-[#E2E8F0] shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Sample CSV</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* File Info Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-[#F7F9FC] border border-[#E2E8F0]">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-[#3578D4]/10 text-[#3578D4] rounded-lg">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#263449]">{file.name}</p>
                    <p className="text-xs text-[#68778D]">
                      {(file.size / 1024).toFixed(1)} KB &bull; {totalRows.toLocaleString()} rows detected
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={datasetName}
                    onChange={(e) => setDatasetName(e.target.value)}
                    placeholder="Dataset Display Name"
                    className="bg-white border border-[#E2E8F0] rounded-lg px-3 py-1.5 text-xs text-[#263449] focus:outline-none focus:border-[#3578D4] w-48"
                  />
                  <button
                    onClick={() => {
                      setFile(null);
                      setPreviewRows([]);
                      setColumnsSummary([]);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-[#EDF2F7] text-[#68778D] hover:text-[#263449] text-xs font-medium border border-[#E2E8F0] transition-colors"
                  >
                    Change File
                  </button>
                </div>
              </div>

              {/* Detected Columns & Types */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#68778D] mb-2 flex items-center space-x-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#3578D4]" />
                  <span>Detected Schema ({columnsSummary.length} Columns)</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {columnsSummary.map((col) => (
                    <div
                      key={col.name}
                      className="p-2.5 rounded-lg bg-white border border-[#E2E8F0] text-xs shadow-2xs"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-[#263449] truncate" title={col.name}>
                          {col.name}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold ${
                            col.type === 'INTEGER' || col.type === 'REAL'
                              ? 'bg-blue-50 text-[#3578D4]'
                              : col.type === 'DATE'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {col.type}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#68778D] truncate">
                        Sample: <span className="text-[#263449] font-mono">{col.sample}</span>
                      </p>
                      {col.nulls > 0 ? (
                        <p className="text-[10px] text-amber-600 mt-1 flex items-center space-x-1">
                          <AlertTriangle className="w-3 h-3" />
                          <span>{col.nulls} empty cells</span>
                        </p>
                      ) : (
                        <p className="text-[10px] text-emerald-600 mt-1 flex items-center space-x-1">
                          <CheckCircle className="w-3 h-3" />
                          <span>Complete column</span>
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Preview Table (First 10 rows) */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#68778D] mb-2 flex items-center space-x-1.5">
                  <Table className="w-3.5 h-3.5 text-[#3578D4]" />
                  <span>Preview First 10 Rows</span>
                </h4>
                <div className="overflow-x-auto rounded-lg border border-[#E2E8F0] bg-white max-h-56">
                  <table className="w-full text-left text-xs text-[#263449]">
                    <thead className="bg-[#F7F9FC] text-[#68778D] uppercase text-[10px] font-semibold sticky top-0 border-b border-[#E2E8F0]">
                      <tr>
                        {columnsSummary.map((col) => (
                          <th key={col.name} className="px-3 py-2 whitespace-nowrap">
                            {col.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0] font-mono text-[11px]">
                      {previewRows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-[#F7F9FC]">
                          {columnsSummary.map((col) => (
                            <td key={col.name} className="px-3 py-1.5 whitespace-nowrap text-[#263449]">
                              {row[col.name] !== undefined && row[col.name] !== null && row[col.name] !== ''
                                ? String(row[col.name])
                                : <span className="text-slate-400 italic">null</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#E2E8F0] bg-[#F7F9FC] flex items-center justify-between">
          <p className="text-xs text-[#68778D]">
            Data is stored in your private in-memory SQLite database.
          </p>
          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-white hover:bg-[#EDF2F7] text-[#68778D] hover:text-[#263449] text-xs font-semibold border border-[#E2E8F0] transition-colors"
            >
              Cancel
            </button>
            <button
              disabled={!file || isSubmitting || isParsing}
              onClick={handleSubmit}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-[#3578D4] hover:bg-[#2B63B3] disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              {isSubmitting ? (
                <span>Registering SQL Table...</span>
              ) : (
                <>
                  <span>Confirm & Register</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
