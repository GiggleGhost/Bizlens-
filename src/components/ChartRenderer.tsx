import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  BarChart3,
  LineChart as LineIcon,
  PieChart as PieIcon,
  Table as TableIcon,
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { ChartConfig } from '../types/bi';

interface ChartRendererProps {
  columns: string[];
  rows: Record<string, any>[];
  initialConfig?: ChartConfig;
}

const COMMERCIAL_PALETTE = [
  '#3578D4', // Primary Blue
  '#12A88A', // Teal
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#0284C7', // Sky
  '#10B981', // Emerald
  '#F97316', // Orange
];

export const ChartRenderer: React.FC<ChartRendererProps> = ({ columns, rows, initialConfig }) => {
  const [activeView, setActiveView] = useState<'auto' | 'bar' | 'line' | 'pie' | 'table'>('auto');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const { numericCols, categoricalCols } = useMemo(() => {
    if (rows.length === 0) return { numericCols: [], categoricalCols: [] };
    const firstRow = rows[0];
    const num = columns.filter((c) => typeof firstRow[c] === 'number');
    const cat = columns.filter((c) => typeof firstRow[c] !== 'number');
    return { numericCols: num, categoricalCols: cat };
  }, [columns, rows]);

  const defaultX = initialConfig?.xAxis || categoricalCols[0] || columns[0] || '';
  const defaultY = initialConfig?.yAxis || numericCols[0] || columns[1] || '';

  const [selectedX, setSelectedX] = useState<string>(defaultX);
  const [selectedY, setSelectedY] = useState<string>(defaultY);

  React.useEffect(() => {
    if (initialConfig?.xAxis) setSelectedX(initialConfig.xAxis);
    else if (categoricalCols[0]) setSelectedX(categoricalCols[0]);
    else if (columns[0]) setSelectedX(columns[0]);

    if (initialConfig?.yAxis) setSelectedY(initialConfig.yAxis);
    else if (numericCols[0]) setSelectedY(numericCols[0]);
    else if (columns[1]) setSelectedY(columns[1]);
  }, [columns, initialConfig, categoricalCols, numericCols]);

  const effectiveView = useMemo(() => {
    if (activeView !== 'auto') return activeView;
    return initialConfig?.chartType || 'bar';
  }, [activeView, initialConfig]);

  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rows;
    const term = searchTerm.toLowerCase();
    return rows.filter((r) =>
      columns.some((col) => String(r[col] ?? '').toLowerCase().includes(term))
    );
  }, [rows, columns, searchTerm]);

  const totalPages = Math.ceil(filteredRows.length / rowsPerPage) || 1;
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredRows.slice(start, start + rowsPerPage);
  }, [filteredRows, currentPage]);

  const handleExportCSV = () => {
    if (rows.length === 0) return;
    const headers = columns.join(',');
    const csvContent = [
      headers,
      ...rows.map((r) =>
        columns
          .map((col) => {
            const val = r[col];
            if (val === null || val === undefined) return '';
            const s = String(val).replace(/"/g, '""');
            return s.includes(',') ? `"${s}"` : s;
          })
          .join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bizlens_query_results_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bizlens_query_results_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (rows.length === 0) {
    return (
      <div className="rounded-xl bg-white border border-[#E2E8F0] p-8 text-center shadow-xs">
        <p className="text-[#68778D] text-sm">No records returned by this query.</p>
      </div>
    );
  }

  const chartData = rows.slice(0, 30).map((r) => ({
    name: String(r[selectedX] ?? ''),
    value: Number(r[selectedY]) || 0,
    ...r,
  }));

  return (
    <div className="rounded-xl bg-white border border-[#E2E8F0] shadow-xs overflow-hidden flex flex-col">
      {/* View Switcher & Toolbar */}
      <div className="px-5 py-3.5 bg-[#F7F9FC] border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3">
        {/* Left: View buttons */}
        <div className="flex items-center space-x-1 bg-white p-1 rounded-lg border border-[#E2E8F0]">
          <button
            onClick={() => setActiveView('auto')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
              activeView === 'auto'
                ? 'bg-[#3578D4] text-white shadow-2xs'
                : 'text-[#68778D] hover:text-[#263449]'
            }`}
          >
            Auto
          </button>
          <button
            onClick={() => setActiveView('bar')}
            className={`p-1.5 rounded-md text-xs font-medium transition-colors flex items-center space-x-1 ${
              effectiveView === 'bar' && activeView !== 'auto'
                ? 'bg-[#3578D4] text-white shadow-2xs'
                : 'text-[#68778D] hover:text-[#263449]'
            }`}
            title="Bar Chart"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Bar</span>
          </button>
          <button
            onClick={() => setActiveView('line')}
            className={`p-1.5 rounded-md text-xs font-medium transition-colors flex items-center space-x-1 ${
              effectiveView === 'line' && activeView !== 'auto'
                ? 'bg-[#3578D4] text-white shadow-2xs'
                : 'text-[#68778D] hover:text-[#263449]'
            }`}
            title="Line Chart"
          >
            <LineIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Line</span>
          </button>
          <button
            onClick={() => setActiveView('pie')}
            className={`p-1.5 rounded-md text-xs font-medium transition-colors flex items-center space-x-1 ${
              effectiveView === 'pie' && activeView !== 'auto'
                ? 'bg-[#3578D4] text-white shadow-2xs'
                : 'text-[#68778D] hover:text-[#263449]'
            }`}
            title="Pie / Donut Chart"
          >
            <PieIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Pie</span>
          </button>
          <button
            onClick={() => setActiveView('table')}
            className={`p-1.5 rounded-md text-xs font-medium transition-colors flex items-center space-x-1 ${
              effectiveView === 'table' && activeView !== 'auto'
                ? 'bg-[#3578D4] text-white shadow-2xs'
                : 'text-[#68778D] hover:text-[#263449]'
            }`}
            title="Data Table"
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Table</span>
          </button>
        </div>

        {/* Center: Axis selectors (for charts) */}
        {effectiveView !== 'table' && (
          <div className="flex items-center space-x-2 text-xs">
            <div className="flex items-center space-x-1 bg-white px-2 py-1 rounded-md border border-[#E2E8F0]">
              <span className="text-[#68778D] font-semibold">X:</span>
              <select
                value={selectedX}
                onChange={(e) => setSelectedX(e.target.value)}
                className="bg-transparent text-[#263449] font-medium focus:outline-none cursor-pointer max-w-[120px] truncate"
              >
                {columns.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-1 bg-white px-2 py-1 rounded-md border border-[#E2E8F0]">
              <span className="text-[#68778D] font-semibold">Y:</span>
              <select
                value={selectedY}
                onChange={(e) => setSelectedY(e.target.value)}
                className="bg-transparent text-[#263449] font-medium focus:outline-none cursor-pointer max-w-[120px] truncate"
              >
                {columns.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Right: Export buttons */}
        <div className="flex items-center space-x-1.5">
          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-md bg-white hover:bg-[#EDF2F7] text-[#263449] text-xs font-medium border border-[#E2E8F0] shadow-2xs transition-colors"
            title="Export query results as CSV"
          >
            <Download className="w-3.5 h-3.5 text-[#3578D4]" />
            <span className="hidden md:inline">CSV</span>
          </button>
          <button
            onClick={handleExportJSON}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-md bg-white hover:bg-[#EDF2F7] text-[#263449] text-xs font-medium border border-[#E2E8F0] shadow-2xs transition-colors"
            title="Export query results as JSON"
          >
            <Download className="w-3.5 h-3.5 text-[#12A88A]" />
            <span className="hidden md:inline">JSON</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-5 flex-1 min-h-[340px] flex flex-col justify-center">
        {effectiveView === 'bar' && (
          <div className="w-full h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="#68778D"
                  fontSize={11}
                  angle={-20}
                  textAnchor="end"
                  interval={0}
                  tick={{ fill: '#68778D' }}
                />
                <YAxis stroke="#68778D" fontSize={11} tick={{ fill: '#68778D' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#E2E8F0',
                    borderRadius: '0.5rem',
                    color: '#263449',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                  itemStyle={{ color: '#3578D4' }}
                />
                <Legend wrapperStyle={{ paddingTop: '10px' }} />
                <Bar
                  dataKey="value"
                  name={selectedY.replace(/_/g, ' ')}
                  fill="#3578D4"
                  radius={[4, 4, 0, 0]}
                >
                  {chartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COMMERCIAL_PALETTE[index % COMMERCIAL_PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {effectiveView === 'line' && (
          <div className="w-full h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="#68778D"
                  fontSize={11}
                  angle={-20}
                  textAnchor="end"
                  interval={0}
                  tick={{ fill: '#68778D' }}
                />
                <YAxis stroke="#68778D" fontSize={11} tick={{ fill: '#68778D' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#E2E8F0',
                    borderRadius: '0.5rem',
                    color: '#263449',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                  itemStyle={{ color: '#3578D4' }}
                />
                <Legend wrapperStyle={{ paddingTop: '10px' }} />
                <Line
                  type="monotone"
                  dataKey="value"
                  name={selectedY.replace(/_/g, ' ')}
                  stroke="#3578D4"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#3578D4' }}
                  activeDot={{ r: 6, fill: '#12A88A' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {effectiveView === 'pie' && (
          <div className="w-full h-80 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  label={({ name, percent }: any) =>
                    `${name} (${(percent ? percent * 100 : 0).toFixed(0)}%)`
                  }
                  labelLine={false}
                >
                  {chartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COMMERCIAL_PALETTE[index % COMMERCIAL_PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#E2E8F0',
                    borderRadius: '0.5rem',
                    color: '#263449',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {effectiveView === 'table' && (
          <div className="space-y-3">
            {/* Table Search filter */}
            <div className="flex items-center justify-between">
              <div className="relative w-64">
                <Search className="w-3.5 h-3.5 text-[#68778D] absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Filter records..."
                  className="w-full bg-[#F7F9FC] border border-[#E2E8F0] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#263449] placeholder-[#68778D] focus:outline-none focus:border-[#3578D4]"
                />
              </div>

              <span className="text-xs text-[#68778D]">
                Showing {paginatedRows.length} of {filteredRows.length} rows
              </span>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-lg border border-[#E2E8F0] bg-white max-h-96">
              <table className="w-full text-left text-xs text-[#263449]">
                <thead className="bg-[#F7F9FC] text-[#68778D] uppercase text-[10px] font-semibold sticky top-0 border-b border-[#E2E8F0]">
                  <tr>
                    {columns.map((col) => (
                      <th key={col} className="px-3.5 py-2.5 whitespace-nowrap">
                        {col.replace(/_/g, ' ')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] font-mono text-[11px]">
                  {paginatedRows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-[#F7F9FC] transition-colors">
                      {columns.map((col) => {
                        const val = row[col];
                        return (
                          <td key={col} className="px-3.5 py-2 whitespace-nowrap text-[#263449]">
                            {val !== undefined && val !== null ? (
                              typeof val === 'number' ? (
                                val.toLocaleString()
                              ) : (
                                String(val)
                              )
                            ) : (
                              <span className="text-[#68778D] italic">null</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-[#68778D]">
                  Page {currentPage} of {totalPages}
                </span>
                <div className="flex items-center space-x-1">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-md bg-[#F7F9FC] hover:bg-[#EDF2F7] disabled:opacity-40 text-[#263449] border border-[#E2E8F0] transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1.5 rounded-md bg-[#F7F9FC] hover:bg-[#EDF2F7] disabled:opacity-40 text-[#263449] border border-[#E2E8F0] transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
