import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Play, Pause, RotateCcw, Square, Sparkles } from 'lucide-react';

interface SpeechInsightPlayerProps {
  spokenText: string;
  keyTakeaways?: string[];
  autoPlay?: boolean;
  requestId?: string;
}

export const SpeechInsightPlayer: React.FC<SpeechInsightPlayerProps> = ({
  spokenText,
  keyTakeaways = [],
  autoPlay = false,
  requestId,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [rate, setRate] = useState<number>(1.0);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const spokenForRequestIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }

    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  const speak = (text: string) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();

    if (isMuted || !text.trim()) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.pitch = 1.0;
    utterance.lang = 'en-US';

    const voices = synthRef.current.getVoices();
    const preferredVoice =
      voices.find(
        (v) =>
          v.lang.startsWith('en') &&
          (v.name.includes('Google') ||
            v.name.includes('Natural') ||
            v.name.includes('Samantha') ||
            v.name.includes('Daniel'))
      ) || voices.find((v) => v.lang.startsWith('en'));

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => {
      setIsPlaying(true);
      setIsPaused(false);
    };

    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    utterance.onerror = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    utteranceRef.current = utterance;
    synthRef.current.speak(utterance);
  };

  useEffect(() => {
    const currentKey = requestId ? `${requestId}:${spokenText}` : spokenText;
    if (spokenText && autoPlay && !isMuted) {
      if (spokenForRequestIdRef.current !== currentKey) {
        spokenForRequestIdRef.current = currentKey;
        const timer = setTimeout(() => {
          speak(spokenText);
        }, 250);
        return () => clearTimeout(timer);
      }
    }
  }, [spokenText, autoPlay, requestId, isMuted]);

  const handleTogglePlay = () => {
    if (!synthRef.current) return;

    if (isPlaying) {
      if (isPaused) {
        synthRef.current.resume();
        setIsPaused(false);
      } else {
        synthRef.current.pause();
        setIsPaused(true);
      }
    } else {
      speak(spokenText);
    }
  };

  const handleStop = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    setIsPlaying(false);
    setIsPaused(false);
  };

  const handleReplay = () => {
    speak(spokenText);
  };

  const handleRateChange = () => {
    const rates = [1.0, 1.25, 1.5, 0.9];
    const nextIdx = (rates.indexOf(rate) + 1) % rates.length;
    const newRate = rates[nextIdx];
    setRate(newRate);
    if (isPlaying) {
      speak(spokenText);
    }
  };

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs space-y-4">
      {/* Title & Player Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8F0] pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#12A88A]/10 text-[#12A88A] flex items-center justify-center border border-[#12A88A]/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[#263449]">
              Grounded Business Explanation
            </h4>
            <p className="text-xs text-[#68778D]">
              Derived strictly from executed database query records
            </p>
          </div>
        </div>

        {/* Audio Controls */}
        <div className="flex items-center space-x-1.5 self-end sm:self-auto">
          {/* Play / Pause */}
          <button
            onClick={handleTogglePlay}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-[#12A88A] hover:bg-[#0E8A72] text-white text-xs font-semibold shadow-2xs transition-colors"
            title={isPlaying && !isPaused ? 'Pause Speech' : 'Play Spoken Insight'}
          >
            {isPlaying && !isPaused ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>{isPaused ? 'Resume' : 'Listen'}</span>
              </>
            )}
          </button>

          {/* Replay */}
          <button
            onClick={handleReplay}
            className="p-1.5 rounded-lg bg-[#F7F9FC] hover:bg-[#EDF2F7] text-[#68778D] hover:text-[#263449] transition-colors border border-[#E2E8F0]"
            title="Replay Voice Summary"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Stop */}
          <button
            onClick={handleStop}
            disabled={!isPlaying}
            className="p-1.5 rounded-lg bg-[#F7F9FC] hover:bg-[#EDF2F7] disabled:opacity-40 text-[#68778D] hover:text-[#263449] transition-colors border border-[#E2E8F0]"
            title="Stop Speech"
          >
            <Square className="w-3.5 h-3.5" />
          </button>

          {/* Speed Toggle */}
          <button
            onClick={handleRateChange}
            className="px-2 py-1 rounded-lg bg-[#F7F9FC] hover:bg-[#EDF2F7] text-[#263449] text-xs font-mono font-medium border border-[#E2E8F0]"
            title="Change voice speed"
          >
            {rate}x
          </button>

          {/* Mute */}
          <button
            onClick={() => {
              if (isPlaying) handleStop();
              setIsMuted(!isMuted);
            }}
            className={`p-1.5 rounded-lg border transition-colors ${
              isMuted
                ? 'bg-rose-50 text-rose-600 border-rose-200'
                : 'bg-[#F7F9FC] text-[#68778D] hover:text-[#263449] border-[#E2E8F0]'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Explanation Text */}
      <div className="bg-[#F7F9FC] p-3.5 rounded-lg border border-[#E2E8F0]">
        <p className="text-[#263449] text-sm leading-relaxed">
          {spokenText}
        </p>
      </div>

      {/* Grounded Key Takeaways */}
      {keyTakeaways && keyTakeaways.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#68778D]">
            Key Takeaways
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {keyTakeaways.map((bullet, idx) => (
              <div
                key={idx}
                className="flex items-start space-x-2 p-2.5 rounded-lg bg-white border border-[#E2E8F0] text-xs text-[#263449]"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#12A88A] mt-1.5 shrink-0"></span>
                <span>{bullet}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
