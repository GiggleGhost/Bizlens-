import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Sparkles,
  Database,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import { Navbar } from './components/Navbar';
import { DatasetSection } from './components/DatasetSection';
import { QueryBar } from './components/QueryBar';
import { SpeechInsightPlayer } from './components/SpeechInsightPlayer';
import { SqlViewer } from './components/SqlViewer';
import { ChartRenderer } from './components/ChartRenderer';
import { KpiCard } from './components/KpiCard';
import { UploadModal } from './components/UploadModal';
import { DataDictionaryModal } from './components/DataDictionaryModal';
import { HelpGuideModal } from './components/HelpGuideModal';
import { ConversationHistory } from './components/ConversationHistory';
import { DatasetMetadata, QueryResult, ConversationTurn } from './types/bi';

export default function App() {
  const [datasets, setDatasets] = useState<DatasetMetadata[]>([]);
  const [activeDataset, setActiveDataset] = useState<DatasetMetadata | null>(null);
  const [currentResult, setCurrentResult] = useState<QueryResult | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<string>('');
  const [inputText, setInputText] = useState<string>('');
  const [conversationHistory, setConversationHistory] = useState<ConversationTurn[]>([]);
  const [activeTurnId, setActiveTurnId] = useState<string>('');

  const [isLoading, setIsLoading] = useState(false);
  const [queryError, setQueryError] = useState<string | null>(null);

  // Tracking latest analytical request ID to prevent race conditions and stale speech
  const latestRequestIdRef = useRef<string | null>(null);

  // Modals & Settings
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isSchemaOpen, setIsSchemaOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);

  // Helper to safely speak an error notice if auto-speech is enabled
  const speakErrorNotice = (message: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(message);
        utterance.rate = 1.0;
        utterance.lang = 'en-US';
        window.speechSynthesis.speak(utterance);
      } catch {
        // Speech not available or blocked
      }
    }
  };

  // Helper to cancel any pending speech
  const cancelAllSpeech = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  // Fetch available datasets on initial load
  useEffect(() => {
    fetchDatasets(true);
    return () => {
      cancelAllSpeech();
    };
  }, []);

  const fetchDatasets = async (runDefaultQuery = false) => {
    try {
      const res = await fetch('/api/datasets');
      const data = await res.json();
      if (data.datasets && data.datasets.length > 0) {
        setDatasets(data.datasets);
        const defaultDs = data.datasets[0];
        setActiveDataset(defaultDs);

        if (runDefaultQuery) {
          executeQuestion('Compare total sales by city', defaultDs.id);
        }
      }
    } catch (err) {
      console.error('Failed to load datasets:', err);
    }
  };

  // Run natural language question
  const executeQuestion = async (question: string, targetDatasetId?: string) => {
    const dsId = targetDatasetId || activeDataset?.id;
    if (!dsId) return;

    // 1. Immediately cancel any ongoing speech synthesis from earlier requests
    cancelAllSpeech();

    // 2. Clear previous results and errors so stale data or old speech is never presented
    setCurrentResult(null);
    setQueryError(null);

    // 3. Generate a unique request ID to track this exact transaction and reject out-of-order responses
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    latestRequestIdRef.current = requestId;

    setIsLoading(true);
    setCurrentQuestion(question);
    setInputText(question);

    try {
      // Build conversation context from previous turns
      const historyContext = conversationHistory.slice(0, 4).map((h) => ({
        role: 'user',
        content: `${h.question} -> SQL: ${h.sql || ''}`,
      }));

      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          datasetId: dsId,
          history: historyContext,
        }),
      });

      const json = await res.json();

      // Guard: Ensure response belongs to the latest initiated request
      if (latestRequestIdRef.current !== requestId) {
        return; // Discard stale out-of-order response
      }

      if (!res.ok) {
        const errorMsg = json.error || "I couldn't answer that question. Please try rephrasing it.";
        setCurrentResult(null);
        setQueryError(errorMsg);
        cancelAllSpeech();
        if (autoSpeak) {
          speakErrorNotice("I couldn't answer that question. Please try rephrasing it.");
        }
        return;
      }

      // Valid successful response belonging to this request
      const enrichedResult: QueryResult = {
        ...json,
        requestId,
      };

      setCurrentResult(enrichedResult);

      // Save to conversation turn
      const turnId = `turn-${Date.now()}`;
      const newTurn: ConversationTurn = {
        id: turnId,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        question,
        datasetName: activeDataset?.name || 'Dataset',
        datasetId: dsId,
        sql: json.sql,
        result: enrichedResult,
      };

      setConversationHistory((prev) => [newTurn, ...prev]);
      setActiveTurnId(turnId);
    } catch (err: any) {
      // Guard against stale asynchronous failure callbacks
      if (latestRequestIdRef.current !== requestId) {
        return;
      }
      console.error('Query error:', err);
      const errorMsg = err.message || "I couldn't answer that question. Please try rephrasing it.";
      setCurrentResult(null);
      setQueryError(errorMsg);
      cancelAllSpeech();
      if (autoSpeak) {
        speakErrorNotice("I couldn't answer that question. Please try rephrasing it.");
      }
    } finally {
      if (latestRequestIdRef.current === requestId) {
        setIsLoading(false);
      }
    }
  };

  // Execute directly edited SQL
  const handleExecuteCustomSql = async (customSql: string) => {
    if (!activeDataset) return;

    cancelAllSpeech();
    setCurrentResult(null);
    setQueryError(null);

    const requestId = `sql-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    latestRequestIdRef.current = requestId;

    setIsLoading(true);

    try {
      const res = await fetch('/api/execute-sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sql: customSql,
          datasetId: activeDataset.id,
        }),
      });

      const json = await res.json();

      if (latestRequestIdRef.current !== requestId) return;

      if (!res.ok) {
        throw new Error(json.error || 'Failed to execute custom SQL.');
      }

      setCurrentResult({
        ...json,
        requestId,
      });
    } catch (err: any) {
      if (latestRequestIdRef.current === requestId) {
        setQueryError(err.message || 'Error executing custom SQL.');
        setCurrentResult(null);
        cancelAllSpeech();
        if (autoSpeak) {
          speakErrorNotice("I couldn't execute that SQL query.");
        }
      }
    } finally {
      if (latestRequestIdRef.current === requestId) {
        setIsLoading(false);
      }
    }
  };

  const handleSelectDataset = (id: string) => {
    cancelAllSpeech();
    latestRequestIdRef.current = null;
    const ds = datasets.find((d) => d.id === id);
    if (ds) {
      setActiveDataset(ds);
      setCurrentResult(null);
      setQueryError(null);
      if (ds.isSynthetic) {
        executeQuestion('Compare total sales by city', ds.id);
      } else {
        executeQuestion(`Show overview of rows in "${ds.tableName}"`, ds.id);
      }
    }
  };

  const handleUploadSuccess = (newDataset: DatasetMetadata) => {
    cancelAllSpeech();
    latestRequestIdRef.current = null;
    setDatasets((prev) => [newDataset, ...prev]);
    setActiveDataset(newDataset);
    setCurrentResult(null);
    setQueryError(null);
    executeQuestion(`Show sample rows and total count from "${newDataset.tableName}"`, newDataset.id);
  };

  const handleResetAnalysis = () => {
    cancelAllSpeech();
    latestRequestIdRef.current = null;
    setCurrentResult(null);
    setQueryError(null);
    setCurrentQuestion('');
    setInputText('');
  };

  const handleSelectTurn = (turn: ConversationTurn) => {
    cancelAllSpeech();
    if (turn.result) {
      const requestId = `hist-${turn.id}-${Date.now()}`;
      latestRequestIdRef.current = requestId;
      setCurrentResult({
        ...turn.result,
        requestId,
      });
      setCurrentQuestion(turn.question);
      setInputText(turn.question);
      setQueryError(null);
      setActiveTurnId(turn.id);
    }
  };

  // Suggested prompts based on active dataset
  const suggestedPrompts = useMemo(() => {
    if (activeDataset?.isSynthetic) {
      return [
        'Compare sales by city',
        'Top 5 products by revenue',
        'Monthly sales trend',
        'Which order status has the highest cancellation rate?',
        'What is total revenue in Hyderabad?',
      ];
    }
    return [
      `Show sample records from "${activeDataset?.tableName}"`,
      `Count total records in "${activeDataset?.tableName}"`,
    ];
  }, [activeDataset]);

  // Compute KPI cards
  const kpiData = useMemo(() => {
    if (!currentResult || currentResult.rows.length === 0) return null;

    // Single row aggregate
    if (currentResult.rows.length === 1) {
      const row = currentResult.rows[0];
      return Object.keys(row).map((k) => ({
        key: k,
        val: row[k],
        type: typeof row[k] === 'number' ? 'currency' : 'default',
      }));
    }

    // Multiple rows: summarize primary numeric column
    const numericCols = currentResult.columns.filter(
      (c) => typeof currentResult.rows[0]?.[c] === 'number'
    );

    if (numericCols.length > 0) {
      const primaryCol = numericCols[0];
      const sum = currentResult.rows.reduce((acc, r) => acc + (Number(r[primaryCol]) || 0), 0);
      const avg = sum / currentResult.rows.length;

      return [
        { key: `Total ${primaryCol.replace(/_/g, ' ')}`, val: sum, type: 'currency' },
        { key: `Average ${primaryCol.replace(/_/g, ' ')}`, val: avg, type: 'currency' },
        { key: 'Rows Returned', val: currentResult.rowCount, type: 'number' },
        { key: 'Query Latency', val: `${currentResult.executionTimeMs} ms`, type: 'trend' },
      ];
    }

    return [
      { key: 'Rows Returned', val: currentResult.rowCount, type: 'number' },
      { key: 'Query Latency', val: `${currentResult.executionTimeMs} ms`, type: 'trend' },
    ];
  }, [currentResult]);

  return (
    <div className="min-h-screen bg-[#F7F9FC] text-[#263449] flex flex-col font-sans selection:bg-[#3578D4] selection:text-white">
      {/* Top Navbar */}
      <Navbar onOpenGuide={() => setIsGuideOpen(true)} />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Dedicated Business Dataset Section */}
        <DatasetSection
          datasets={datasets}
          activeDataset={activeDataset}
          onSelectDataset={handleSelectDataset}
          onOpenUpload={() => setIsUploadOpen(true)}
          onOpenSchema={() => setIsSchemaOpen(true)}
        />

        {/* Voice & Text Query Bar */}
        <section aria-label="Query Input">
          <QueryBar
            inputText={inputText}
            setInputText={setInputText}
            onSearch={(q) => executeQuestion(q)}
            isLoading={isLoading}
            initialSuggestions={suggestedPrompts}
            autoSpeak={autoSpeak}
            onToggleAutoSpeak={() => setAutoSpeak(!autoSpeak)}
            placeholderText={`Ask about ${activeDataset?.name || 'your data'} (e.g., "What are total sales by city?" or "Top 5 products by revenue")`}
          />
        </section>

        {/* Error Alert */}
        {queryError && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-3 shadow-2xs">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1 flex-1">
              <div className="flex items-center justify-between">
                <p className="font-bold text-sm text-rose-900">Query Processing Notice</p>
                <button
                  onClick={handleResetAnalysis}
                  className="text-xs text-rose-700 hover:text-rose-900 font-medium flex items-center space-x-1 transition-colors"
                  title="Clear error and reset analysis"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              </div>
              <p className="leading-relaxed">{queryError}</p>
              <p className="text-[11px] text-rose-700">
                Tip: Click "Schema & Columns" above to inspect valid table columns and data types.
              </p>
            </div>
          </div>
        )}

        {/* Loading Spinner */}
        {isLoading && (
          <div className="rounded-xl bg-white border border-[#E2E8F0] p-10 text-center flex flex-col items-center justify-center space-y-3 shadow-xs">
            <div className="relative">
              <div className="w-10 h-10 rounded-full border-3 border-[#3578D4]/20 border-t-[#3578D4] animate-spin"></div>
              <Sparkles className="w-4 h-4 text-[#3578D4] absolute inset-0 m-auto" />
            </div>
            <p className="text-sm font-semibold text-[#263449]">
              Synthesizing safe SQL and querying database...
            </p>
            <p className="text-xs text-[#68778D] max-w-sm">
              Executing read-only query against the local SQLite analytical engine
            </p>
          </div>
        )}

        {/* Main Query Results View */}
        {currentResult && !isLoading && (
          <div className="space-y-6">
            {/* Question Heading & Metadata */}
            {currentQuestion && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E2E8F0] pb-3">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#3578D4]">
                    Database Query Result
                  </span>
                  <h2 className="text-xl font-bold text-[#263449]">
                    "{currentQuestion}"
                  </h2>
                </div>

                <div className="flex items-center space-x-2 text-xs text-[#68778D] flex-wrap gap-y-1">
                  <span className="bg-white px-2.5 py-1 rounded-md border border-[#E2E8F0] font-mono shadow-2xs">
                    {currentResult.rowCount} {currentResult.rowCount === 1 ? 'row' : 'rows'}
                  </span>
                  <span className="bg-white px-2.5 py-1 rounded-md border border-[#E2E8F0] font-mono text-[#12A88A] shadow-2xs">
                    {currentResult.executionTimeMs}ms
                  </span>
                  <span
                    className={`px-2.5 py-1 rounded-md border text-[11px] font-semibold flex items-center space-x-1 shadow-2xs ${
                      currentResult.engine === 'gemini'
                        ? 'bg-blue-50 text-[#3578D4] border-[#3578D4]/20'
                        : 'bg-[#12A88A]/10 text-[#12A88A] border-[#12A88A]/20'
                    }`}
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>
                      {currentResult.engine === 'gemini'
                        ? 'Gemini 3.8 Flash'
                        : 'Local SQLite Engine'}
                    </span>
                  </span>
                </div>
              </div>
            )}

            {/* Quota Exhaustion Notice if engaged */}
            {currentResult.isQuotaExhausted && (
              <div className="p-3 rounded-lg bg-blue-50 border border-[#3578D4]/20 text-[#263449] text-xs flex items-center space-x-2 shadow-2xs">
                <ShieldCheck className="w-4 h-4 text-[#3578D4] shrink-0" />
                <span>
                  High-speed local SQL query engine active: queries run with zero latency, full SQLite accuracy, and grounded insights.
                </span>
              </div>
            )}

            {/* KPI Cards Row */}
            {kpiData && (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {kpiData.slice(0, 4).map((kpi, idx) => (
                  <KpiCard
                    key={idx}
                    title={kpi.key}
                    value={kpi.val}
                    iconType={
                      kpi.type === 'currency'
                        ? 'currency'
                        : kpi.type === 'number'
                        ? 'number'
                        : kpi.type === 'trend'
                        ? 'trend'
                        : 'default'
                    }
                  />
                ))}
              </div>
            )}

            {/* Spoken AI Explanation Player */}
            <SpeechInsightPlayer
              spokenText={currentResult.spokenExplanation}
              keyTakeaways={currentResult.keyTakeaways}
              autoPlay={autoSpeak}
              requestId={currentResult.requestId}
            />

            {/* Visualizations (Interactive Chart / Data Table) */}
            <ChartRenderer
              columns={currentResult.columns}
              rows={currentResult.rows}
              initialConfig={currentResult.chartConfig}
            />

            {/* SQL Query Inspector & Live Editor */}
            <SqlViewer
              sql={currentResult.sql}
              executionTimeMs={currentResult.executionTimeMs}
              rowCount={currentResult.rowCount}
              onExecuteCustomSql={handleExecuteCustomSql}
              isLoading={isLoading}
            />

            {/* Conversational Follow-up Suggestions */}
            {currentResult.followUps && currentResult.followUps.length > 0 && (
              <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-[#3578D4]" />
                  <span className="text-xs font-semibold text-[#263449]">
                    Suggested conversational follow-ups:
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {currentResult.followUps.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => executeQuestion(q)}
                      className="text-xs bg-[#F7F9FC] hover:bg-[#EDF2F7] text-[#263449] hover:text-[#3578D4] px-3 py-1.5 rounded-lg border border-[#E2E8F0] shadow-2xs transition-colors flex items-center space-x-1"
                    >
                      <span>{q}</span>
                      <ArrowRight className="w-3 h-3 text-[#3578D4]" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Conversation History Drawer */}
        <ConversationHistory
          history={conversationHistory}
          currentTurnId={activeTurnId}
          onSelectTurn={handleSelectTurn}
          onClearHistory={() => {
            cancelAllSpeech();
            setConversationHistory([]);
          }}
        />
      </main>

      {/* Clean Professional Footer */}
      <footer className="border-t border-[#E2E8F0] bg-white py-4 text-xs text-[#68778D] mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-[#263449]">BizLens AI</span>
            <span>&bull;</span>
            <span>Voice-Powered Business Intelligence Assistant</span>
            <span>&bull;</span>
            <span className="text-[#12A88A] flex items-center space-x-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Real SQLite Engine &bull; Zero Hallucinations</span>
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsGuideOpen(true)}
              className="hover:text-[#263449] underline transition-colors"
            >
              System Architecture
            </button>
            <button
              onClick={() => setIsSchemaOpen(true)}
              className="hover:text-[#263449] underline transition-colors"
            >
              Schema Dictionary
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={handleUploadSuccess}
      />

      <DataDictionaryModal
        isOpen={isSchemaOpen}
        onClose={() => setIsSchemaOpen(false)}
        dataset={activeDataset}
      />

      <HelpGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />
    </div>
  );
}
