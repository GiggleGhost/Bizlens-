import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Send, Sparkles, Volume2, VolumeX, AlertCircle, RefreshCw, ExternalLink } from 'lucide-react';

interface QueryBarProps {
  inputText: string;
  setInputText: (text: string) => void;
  onSearch: (question: string) => void;
  isLoading: boolean;
  initialSuggestions: string[];
  placeholderText?: string;
  autoSpeak: boolean;
  onToggleAutoSpeak: () => void;
}

export const QueryBar: React.FC<QueryBarProps> = ({
  inputText,
  setInputText,
  onSearch,
  isLoading,
  initialSuggestions,
  placeholderText = 'Ask a question in plain English (e.g. "What are total sales by city?" or "Top 5 products by revenue")',
  autoSpeak,
  onToggleAutoSpeak,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<{ message: string; isIframeBlocked?: boolean } | null>(null);
  const [isSpeechSupported, setIsSpeechSupported] = useState(true);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSpeechSupported(false);
    }
  }, []);

  const startVoiceInput = async () => {
    // 1. Stop any currently active speech synthesis so it doesn't feed back into mic
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    setSpeechError(null);

    // 2. Check secure context
    if (window.isSecureContext === false && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
      setSpeechError({
        message: 'Speech recognition requires a secure HTTPS context. Please type your query in the prompt bar below.',
      });
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechError({
        message: 'Speech recognition is not supported in this browser. Please use Google Chrome, Edge, or type your question below.',
      });
      return;
    }

    const isInsideIframe = window.self !== window.top;

    // 3. Request user media to verify permission explicitly
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Close test stream immediately
        stream.getTracks().forEach((track) => track.stop());
      } catch (mediaErr: any) {
        if (mediaErr.name === 'NotAllowedError' || mediaErr.name === 'PermissionDeniedError') {
          if (isInsideIframe) {
            setSpeechError({
              message:
                'Microphone access is restricted by the embedded preview frame. To use voice input, open the app in a new top-level browser tab or use text input below.',
              isIframeBlocked: true,
            });
          } else {
            setSpeechError({
              message:
                'Microphone permission was not granted. Please allow microphone access in your browser address bar and click Retry.',
            });
          }
          return;
        } else if (mediaErr.name === 'NotFoundError' || mediaErr.name === 'DevicesNotFoundError') {
          setSpeechError({
            message: 'No microphone was detected on your device. Please plug in a microphone or use text input.',
          });
          return;
        }
      }
    }

    // 4. Initialize and start SpeechRecognition
    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          currentTranscript += event.results[i][0].transcript;
        }
        if (currentTranscript.trim()) {
          setInputText(currentTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        if (event.error === 'not-allowed') {
          if (isInsideIframe) {
            setSpeechError({
              message:
                'Microphone access is restricted by the embedded preview frame. Open in a new tab or use text input below.',
              isIframeBlocked: true,
            });
          } else {
            setSpeechError({
              message:
                'Microphone permission was not allowed. Check browser site permissions and click Retry.',
            });
          }
        } else if (event.error === 'no-speech') {
          // Do not treat no-speech as a fatal error
          setSpeechError({
            message: 'No speech was detected. Please click the microphone again and speak clearly.',
          });
        } else if (event.error === 'network') {
          setSpeechError({
            message: 'Speech recognition network service error. You can continue by typing your question.',
          });
        } else {
          setSpeechError({
            message: `Speech recognition error: ${event.error}. You can type your question in the prompt box.`,
          });
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      setIsListening(false);
      setSpeechError({
        message: 'Could not initialize speech recognition. Please use the text input below.',
      });
    }
  };

  const stopVoiceInput = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
    }
    setIsListening(false);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = inputText.trim();
    if (clean && !isLoading) {
      if (isListening) stopVoiceInput();
      onSearch(clean);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputText(suggestion);
    if (!isLoading) {
      onSearch(suggestion);
    }
  };

  return (
    <div className="w-full space-y-3">
      {/* Voice Warning & Context Help */}
      {speechError && (
        <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">{speechError.message}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 shrink-0 self-end sm:self-auto">
            {speechError.isIframeBlocked && (
              <a
                href={window.location.href}
                target="_blank"
                rel="noreferrer"
                className="flex items-center space-x-1 px-2.5 py-1 rounded-md bg-white border border-amber-300 text-amber-800 text-xs font-medium hover:bg-amber-100 transition-colors"
              >
                <span>Open in Tab</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            <button
              onClick={() => {
                setSpeechError(null);
                startVoiceInput();
              }}
              className="flex items-center space-x-1 px-2.5 py-1 rounded-md bg-amber-600 text-white text-xs font-medium hover:bg-amber-700 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry</span>
            </button>
            <button
              onClick={() => setSpeechError(null)}
              className="text-xs text-amber-700 hover:text-amber-900 underline ml-1"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Listening State Bar */}
      {isListening && (
        <div className="p-3.5 rounded-xl bg-blue-50 border border-[#3578D4]/40 flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-3">
            <div className="w-7 h-7 rounded-full bg-[#3578D4] text-white flex items-center justify-center animate-pulse">
              <Mic className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#3578D4]">Listening to your voice...</p>
              <p className="text-xs text-[#263449] font-medium">
                {inputText || 'Speak your question now (e.g. "What are total sales by city?")...'}
              </p>
            </div>
          </div>

          <button
            onClick={stopVoiceInput}
            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors"
          >
            Stop Listening
          </button>
        </div>
      )}

      {/* Main Search Input Form */}
      <form
        onSubmit={handleSubmit}
        className="relative flex items-center bg-white border border-[#E2E8F0] focus-within:border-[#3578D4] focus-within:ring-2 focus-within:ring-[#3578D4]/15 rounded-xl shadow-xs transition-all"
      >
        {/* Voice Microphone Button */}
        <button
          type="button"
          onClick={isListening ? stopVoiceInput : startVoiceInput}
          disabled={isLoading}
          className={`ml-2 p-2.5 rounded-lg transition-colors ${
            isListening
              ? 'bg-rose-50 text-rose-600'
              : 'text-[#68778D] hover:text-[#3578D4] hover:bg-[#F7F9FC]'
          }`}
          title={isListening ? 'Click to stop listening' : 'Ask using your microphone'}
          aria-label="Microphone Voice Input"
        >
          {isListening ? (
            <MicOff className="w-5 h-5 text-rose-600 animate-pulse" />
          ) : (
            <Mic className="w-5 h-5" />
          )}
        </button>

        {/* Input Text Box */}
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={isLoading}
          placeholder={isListening ? 'Listening...' : placeholderText}
          className="w-full bg-transparent py-3.5 px-3 text-sm text-[#263449] placeholder-[#68778D] focus:outline-none"
        />

        {/* Voice Assistant Auto-Read Toggle Button */}
        <button
          type="button"
          onClick={onToggleAutoSpeak}
          className={`p-2 mr-1 rounded-lg transition-colors ${
            autoSpeak
              ? 'text-[#12A88A] bg-[#12A88A]/10 hover:bg-[#12A88A]/20'
              : 'text-[#68778D] hover:text-[#263449] hover:bg-[#F7F9FC]'
          }`}
          title={autoSpeak ? 'Spoken Voice: Enabled (answers read aloud)' : 'Spoken Voice: Muted'}
          aria-label="Toggle Spoken Response"
        >
          {autoSpeak ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>

        {/* Submit Query Button */}
        <button
          type="submit"
          disabled={!inputText.trim() || isLoading}
          className="mr-2 px-4 py-2 rounded-lg bg-[#3578D4] hover:bg-[#2B63B3] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold flex items-center space-x-1.5 shadow-xs transition-colors"
        >
          {isLoading ? (
            <span className="flex items-center space-x-1.5">
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              <span>Analyzing...</span>
            </span>
          ) : (
            <>
              <span>Ask BizLens</span>
              <Send className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </form>

      {/* Initial Suggestions (Only displayed before querying or when clean) */}
      {initialSuggestions && initialSuggestions.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] font-semibold text-[#68778D] flex items-center space-x-1 mr-1">
            <Sparkles className="w-3 h-3 text-[#3578D4]" />
            <span>Try asking:</span>
          </span>
          {initialSuggestions.map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSuggestionClick(prompt)}
              disabled={isLoading}
              className="text-xs bg-white hover:bg-[#F7F9FC] text-[#263449] hover:text-[#3578D4] px-2.5 py-1 rounded-md border border-[#E2E8F0] shadow-2xs transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
