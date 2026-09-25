import React, { useState } from 'react';
import { Sparkles, Copy, Check, Info, Lightbulb, RefreshCw, Layers } from 'lucide-react';

export const StarAnswerBuilder: React.FC = () => {
  const [situation, setSituation] = useState(
    'In Q3, our cloud API endpoints were experiencing high latency (over 450ms P99) during peak placement season traffic.'
  );
  const [task, setTask] = useState(
    'As the lead backend developer, I was responsible for diagnosing the bottleneck, reducing latency below 100ms, and ensuring system uptime.'
  );
  const [action, setAction] = useState(
    'I profiled database queries, added Redis cluster caching for frequent authentication tokens, refactored unindexed Postgres JOINs, and set up Prometheus alert telemetry.'
  );
  const [result, setResult] = useState(
    'P99 API latency dropped by 78% (to 65ms), handling 3x concurrency without downtime, and saving $12,000 in monthly compute costs.'
  );

  const [copied, setCopied] = useState(false);

  const actionVerbs = [
    'Architected', 'Engineered', 'Optimized', 'Refactored',
    'Mitigated', 'Automated', 'Scaled', 'Pioneered', 'Implemented'
  ];

  const handleCopy = () => {
    const fullText = `Situation: ${situation}\nTask: ${task}\nAction: ${action}\nResult: ${result}`;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInsertVerb = (verb: string) => {
    if (!action.includes(verb)) {
      setAction(prev => `${verb} ${prev.charAt(0).toLowerCase() + prev.slice(1)}`);
    }
  };

  const totalWords = (situation + ' ' + task + ' ' + action + ' ' + result)
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
      {/* Decorative Gradient Background Glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-brand-orange/10 blur-3xl rounded-full pointer-events-none" />
      
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-brand-orange/20 text-brand-orange text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> STAR Response Builder
            </span>
            <span className="text-slate-400 text-xs font-medium">100% Free Tool</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-white">
            Draft Your Winning S.T.A.R. Interview Story
          </h3>
          <p className="text-sm text-slate-400 mt-1">
            Fill in the 4 key sections to generate a concise, impact-driven behavioral interview response.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 bg-brand-orange hover:bg-brand-orange/90 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-brand-orange/20"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied to Clipboard!' : 'Copy Formatted STAR Story'}
          </button>
        </div>
      </div>

      {/* Main Grid: Inputs vs Realtime Formatted Output */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column — Input Cards */}
        <div className="lg:col-span-7 space-y-5">
          {/* Situation */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
            <label className="block text-sm font-semibold text-blue-400 mb-1 flex items-center justify-between">
              <span>S — Situation (Context & Setup)</span>
              <span className="text-xs text-slate-500">~20% of response</span>
            </label>
            <textarea
              rows={2}
              value={situation}
              onChange={(e) => setSituation(e.target.value)}
              placeholder="Describe the specific background, project context, or obstacle faced..."
              className="w-full bg-slate-900/90 border border-slate-800 rounded-lg p-3 text-sm text-slate-200 focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-all"
            />
          </div>

          {/* Task */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
            <label className="block text-sm font-semibold text-cyan-400 mb-1 flex items-center justify-between">
              <span>T — Task (Your Specific Goal)</span>
              <span className="text-xs text-slate-500">~15% of response</span>
            </label>
            <textarea
              rows={2}
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="What was your specific responsibility or objective to solve?"
              className="w-full bg-slate-900/90 border border-slate-800 rounded-lg p-3 text-sm text-slate-200 focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-all"
            />
          </div>

          {/* Action */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-semibold text-amber-400">
                A — Action (Your Personal Contribution)
              </label>
              <span className="text-xs text-slate-500">~50% of response</span>
            </div>
            <textarea
              rows={3}
              value={action}
              onChange={(e) => setAction(e.target.value)}
              placeholder="Detail the steps, tools, architectures, and strategies YOU personally executed..."
              className="w-full bg-slate-900/90 border border-slate-800 rounded-lg p-3 text-sm text-slate-200 focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-all"
            />
            {/* Quick Action Verb Chips */}
            <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1 mr-1">
                <Lightbulb className="w-3 h-3 text-amber-400" /> Power Action Verbs:
              </span>
              {actionVerbs.map((verb) => (
                <button
                  key={verb}
                  type="button"
                  onClick={() => handleInsertVerb(verb)}
                  className="text-[11px] bg-slate-900 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 border border-slate-700/60 hover:border-amber-500/40 px-2 py-0.5 rounded-md transition-all"
                >
                  +{verb}
                </button>
              ))}
            </div>
          </div>

          {/* Result */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
            <label className="block text-sm font-semibold text-emerald-400 mb-1 flex items-center justify-between">
              <span>R — Result (Quantified Metrics & Impact)</span>
              <span className="text-xs text-slate-500">~15% of response</span>
            </label>
            <textarea
              rows={2}
              value={result}
              onChange={(e) => setResult(e.target.value)}
              placeholder="What was the outcome? Include numbers, percentages, time saved, or revenue impact..."
              className="w-full bg-slate-900/90 border border-slate-800 rounded-lg p-3 text-sm text-slate-200 focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-all"
            />
          </div>
        </div>

        {/* Right Column — Realtime Live Formatted Preview Card */}
        <div className="lg:col-span-5 flex flex-col h-full">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 sm:p-6 flex-1 flex flex-col justify-between shadow-inner relative">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-brand-orange" /> Live Answer Formatter
                </span>
                <span className="text-xs bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-full text-slate-400">
                  {totalWords} words (~{Math.round(totalWords / 2.5)}s speaking time)
                </span>
              </div>

              <div className="space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
                <div className="p-3 rounded-lg bg-blue-950/30 border-l-2 border-blue-500">
                  <span className="font-bold text-blue-400 block mb-0.5 uppercase text-[11px] tracking-wider">
                    Situation
                  </span>
                  {situation || <span className="text-slate-600 italic">Enter situation...</span>}
                </div>

                <div className="p-3 rounded-lg bg-cyan-950/30 border-l-2 border-cyan-500">
                  <span className="font-bold text-cyan-400 block mb-0.5 uppercase text-[11px] tracking-wider">
                    Task
                  </span>
                  {task || <span className="text-slate-600 italic">Enter task...</span>}
                </div>

                <div className="p-3 rounded-lg bg-amber-950/30 border-l-2 border-amber-500">
                  <span className="font-bold text-amber-400 block mb-0.5 uppercase text-[11px] tracking-wider">
                    Action
                  </span>
                  {action || <span className="text-slate-600 italic">Enter actions taken...</span>}
                </div>

                <div className="p-3 rounded-lg bg-emerald-950/30 border-l-2 border-emerald-500">
                  <span className="font-bold text-emerald-400 block mb-0.5 uppercase text-[11px] tracking-wider">
                    Result
                  </span>
                  {result || <span className="text-slate-600 italic">Enter metrics & results...</span>}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Info className="w-3.5 h-3.5 text-brand-orange" />
                <span>Tip: Aim for 120–180 total words when speaking in live rounds.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
