import React, { useState, useEffect } from 'react';
import { X, Play, Clock, Sparkles, CheckCircle2, Award, ArrowRight, Eye, RefreshCw, Star } from 'lucide-react';
import { saveInterviewCourseProgressApi } from '@/lib/api';

interface MockInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  modules: any[];
  onXpEarned?: (xp: number) => void;
}

export const MockInterviewModal: React.FC<MockInterviewModalProps> = ({
  isOpen,
  onClose,
  modules,
  onXpEarned
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [candidateResponse, setCandidateResponse] = useState('');
  const [showModelAnswer, setShowModelAnswer] = useState(false);
  const [selfRating, setSelfRating] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(120);
  const [timerActive, setTimerActive] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const currentModule = modules && modules.length > 0 ? modules[currentIndex] : null;

  useEffect(() => {
    let interval: any = null;
    if (timerActive && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft((prev) => prev - 1);
      }, 1000);
    } else if (secondsLeft === 0) {
      setTimerActive(false);
    }
    return () => clearInterval(interval);
  }, [timerActive, secondsLeft]);

  if (!isOpen || !currentModule) return null;

  const handleStartTimer = () => {
    setSecondsLeft(120);
    setTimerActive(true);
  };

  const handleNextQuestion = () => {
    const nextIdx = (currentIndex + 1) % modules.length;
    setCurrentIndex(nextIdx);
    setCandidateResponse('');
    setShowModelAnswer(false);
    setSelfRating(null);
    setSubmitted(false);
    setSecondsLeft(120);
    setTimerActive(false);
  };

  const handleSubmitAnswer = async () => {
    setSubmitted(true);
    setShowModelAnswer(true);
    setTimerActive(false);
    await saveInterviewCourseProgressApi(currentModule.id);
    if (onXpEarned) {
      onXpEarned(50);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2">
            <span className="bg-brand-orange/20 text-brand-orange p-1.5 rounded-lg">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Mock Interview Practice Room
                <span className="text-xs bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-full font-mono">
                  Module {currentIndex + 1} of {modules.length}
                </span>
              </h3>
              <p className="text-xs text-slate-400">Simulate live technical & behavioral interview rounds</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Question Card */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 relative">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-brand-orange uppercase tracking-wider">
                {currentModule.category} — {currentModule.title}
              </span>

              {/* Timer Pill */}
              <div className="flex items-center gap-2">
                <span className={`text-xs font-mono font-bold px-3 py-1 rounded-full flex items-center gap-1.5 border ${
                  secondsLeft < 30
                    ? 'bg-rose-950/50 border-rose-800 text-rose-400 animate-pulse'
                    : 'bg-slate-900 border-slate-800 text-amber-400'
                }`}>
                  <Clock className="w-3.5 h-3.5" /> {formatTime(secondsLeft)}
                </span>

                {!timerActive && (
                  <button
                    onClick={handleStartTimer}
                    className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded-full flex items-center gap-1 transition-colors"
                  >
                    <Play className="w-3 h-3 text-emerald-400" /> Start Timer
                  </button>
                )}
              </div>
            </div>

            <h4 className="text-lg font-bold text-white leading-snug">
              &ldquo;{currentModule.question}&rdquo;
            </h4>
            <p className="text-xs text-slate-400 mt-2 italic">
              💡 {currentModule.summary}
            </p>
          </div>

          {/* Candidate Text Workspace */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-slate-200">
                Your Answer Draft / Verbal Notes:
              </label>
              <span className="text-xs text-slate-500">
                {candidateResponse.split(/\s+/).filter(Boolean).length} words
              </span>
            </div>
            <textarea
              rows={4}
              value={candidateResponse}
              onChange={(e) => setCandidateResponse(e.target.value)}
              placeholder="Type your response here using S.T.A.R or speak out loud..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-100 focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-all placeholder:text-slate-600"
            />
          </div>

          {/* Model Answer Reveal & Scoring Rubric */}
          {showModelAnswer && (
            <div className="space-y-4 animate-fadeIn">
              {/* Expert Sample Answer Card */}
              <div className="bg-emerald-950/30 border border-emerald-800/50 rounded-xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Gold-Standard Model Answer
                  </span>
                  <span className="text-xs text-emerald-300 font-medium">+50 XP Earned!</span>
                </div>
                <p className="text-sm text-emerald-100 leading-relaxed font-sans bg-emerald-950/40 p-3.5 rounded-lg border border-emerald-900/60">
                  {currentModule.sample_answer}
                </p>
              </div>

              {/* Expert Tip & Red-Flag Warnings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-950 border border-amber-900/40 rounded-xl p-4">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block mb-1">
                    💡 Expert Advice
                  </span>
                  <p className="text-xs text-slate-300">{currentModule.expert_tip}</p>
                </div>

                <div className="bg-slate-950 border border-rose-900/40 rounded-xl p-4">
                  <span className="text-xs font-bold text-rose-400 uppercase tracking-wider block mb-1">
                    ⚠️ Red-Flag Trap to Avoid
                  </span>
                  <p className="text-xs text-slate-300">{currentModule.red_flag_trap}</p>
                </div>
              </div>

              {/* Self-Rating Stars */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-center">
                <span className="text-xs font-semibold text-slate-300 block mb-2">
                  Rate your performance on this question:
                </span>
                <div className="flex items-center justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setSelfRating(star)}
                      className={`p-2 rounded-lg transition-all ${
                        selfRating && selfRating >= star
                          ? 'text-amber-400 scale-110'
                          : 'text-slate-600 hover:text-slate-400'
                      }`}
                    >
                      <Star className="w-6 h-6 fill-current" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <button
            onClick={() => setShowModelAnswer(!showModelAnswer)}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors"
          >
            <Eye className="w-4 h-4 text-brand-orange" />
            {showModelAnswer ? 'Hide Model Answer' : 'Reveal Model Answer'}
          </button>

          <div className="flex items-center gap-3">
            {!submitted ? (
              <button
                onClick={handleSubmitAnswer}
                className="bg-brand-orange hover:bg-brand-orange/90 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-brand-orange/20"
              >
                Submit & Reveal Model Answer
              </button>
            ) : (
              <button
                onClick={handleNextQuestion}
                className="bg-emerald-700 hover:bg-emerald-700 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/20"
              >
                Next Question <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
