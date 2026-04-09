'use client';
import { useEffect, useRef, useState } from 'react';
import { AgentLog } from '@/hooks/useAgentLogs';

interface Props {
  logs: AgentLog[];
  isActive: boolean;
}

const STEP_CONFIG: Record<string, { icon: string; label: string; plain: string; color: string; borderColor: string }> = {
  OBSERVE_PROFILE:      { icon: '👁️', label: 'OBSERVE_PROFILE',      plain: 'Looking up the student profile and upcoming drive',         color: 'text-blue-400',    borderColor: '#3b82f6' },
  COLD_START_DETECTED:  { icon: '❄️', label: 'COLD_START_DETECTED',   plain: 'Checking if we have enough data to analyze this student',   color: 'text-purple-400',  borderColor: '#a855f7' },
  QUERY_LOCAL_DB:       { icon: '🗄️', label: 'QUERY_LOCAL_DB',        plain: 'Checking what past LPU students told us about this company', color: 'text-yellow-400',  borderColor: '#eab308' },
  QUERY_GLOBAL_DB:      { icon: '🌍', label: 'QUERY_GLOBAL_DB',       plain: 'LPU data was thin — pulling reports from other colleges',    color: 'text-orange-400',  borderColor: '#f97316' },
  SCRAPE_COMPANY_INTEL: { icon: '🕷️', label: 'SCRAPE_COMPANY_INTEL',  plain: 'Not enough data anywhere — scraping the web for intel',     color: 'text-red-400',     borderColor: '#ef4444' },
  ASSESS_READINESS:     { icon: '📊', label: 'ASSESS_READINESS',      plain: 'Comparing student skills to what this company actually tests',color: 'text-indigo-400',  borderColor: '#6366f1' },
  SELECT_STRATEGY:      { icon: '🧠', label: 'SELECT_STRATEGY',       plain: 'Choosing the best preparation approach based on past results',color: 'text-emerald-400', borderColor: '#10b981' },
  GENERATE_BRIEF:       { icon: '📝', label: 'GENERATE_BRIEF',        plain: 'Writing the personalized preparation plan with Gemini AI',   color: 'text-cyan-400',    borderColor: '#06b6d4' },
  GENERATE_ASSESSMENT:  { icon: '✍️', label: 'GENERATE_ASSESSMENT',   plain: 'Generating targeted interview questions for the weak topic', color: 'text-violet-400',  borderColor: '#8b5cf6' },
  SCHEDULE_SESSION:     { icon: '📅', label: 'SCHEDULE_SESSION',      plain: 'Booking a coaching session with the TPC coordinator',        color: 'text-pink-400',    borderColor: '#ec4899' },
  ALERT_TPC:            { icon: '⚠️', label: 'ALERT_TPC',             plain: 'Telling the TPC coordinator which students need intervention',color: 'text-amber-400',   borderColor: '#f59e0b' },
  UPDATE_STUDENT_STATE: { icon: '🔄', label: 'UPDATE_STUDENT_STATE',  plain: 'Saving the student\'s new readiness level to the database',  color: 'text-teal-400',    borderColor: '#14b8a6' },
  ERROR:                { icon: '❌', label: 'ERROR',                  plain: 'Something went wrong — using backup data',                  color: 'text-red-500',     borderColor: '#ef4444' },
};

const STATUS_ICONS: Record<string, string> = {
  success: '✓',
  failed: '✗',
  skipped: '⏭',
  fallback_triggered: '↩',
};

export default function ReasoningTrace({ logs, isActive }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<'plain' | 'technical'>('plain');

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="bg-[#0c0c18] border border-[#2a2a3d] rounded-2xl flex flex-col h-[500px] font-mono text-sm shadow-2xl overflow-hidden relative">
      {/* Header */}
      <div className="flex justify-between items-center px-5 py-3 border-b border-[#2a2a3d] bg-[#0a0a14]">
        <div className="flex items-center gap-3">
          <h3 className="text-[#9b9bbb] font-semibold uppercase tracking-wider text-xs">🧠 Agent Reasoning Trace</h3>
          {isActive && (
            <span className="flex items-center gap-1.5 text-emerald-400 text-[10px]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              AGENT ACTIVE
            </span>
          )}
        </div>

        {/* Plain / Technical toggle */}
        <div className="flex items-center gap-1 bg-[#1a1a2e] border border-[#2a2a3d] rounded-lg p-0.5">
          <button
            onClick={() => setViewMode('plain')}
            className={`px-3 py-1 rounded-md text-[10px] font-semibold transition-all ${
              viewMode === 'plain' ? 'bg-indigo-600 text-white' : 'text-[#6b7280] hover:text-[#c4c4d8]'
            }`}
          >
            Plain English
          </button>
          <button
            onClick={() => setViewMode('technical')}
            className={`px-3 py-1 rounded-md text-[10px] font-semibold transition-all ${
              viewMode === 'technical' ? 'bg-indigo-600 text-white' : 'text-[#6b7280] hover:text-[#c4c4d8]'
            }`}
          >
            Technical
          </button>
        </div>
      </div>

      {/* Trace feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {logs.length === 0 && !isActive && (
          <div className="h-full flex items-center justify-center text-[#4b4b6b] text-sm">
            Awaiting trigger...
          </div>
        )}

        {logs.map((log) => {
          const config = STEP_CONFIG[log.step_name] || { icon: '⚙️', label: log.step_name, plain: log.step_name, color: 'text-gray-400', borderColor: '#4b5563' };
          const isFallback = log.status === 'fallback_triggered';
          const isError = log.status === 'failed';

          return (
            <div
              key={log.id}
              className="step-card-enter rounded-xl p-4 relative overflow-hidden"
              style={{
                background: '#0f0f1a',
                borderLeft: `3px solid ${isFallback ? '#f59e0b' : isError ? '#ef4444' : config.borderColor}`,
                border: `1px solid #2a2a3d`,
                borderLeftColor: isFallback ? '#f59e0b' : isError ? '#ef4444' : config.borderColor,
                borderLeftWidth: '3px',
              }}
            >
              {/* Top row */}
              <div className="flex items-center justify-between mb-2">
                <span className={`flex items-center gap-2 text-xs font-semibold ${config.color}`}>
                  <span>{config.icon}</span>
                  <span>{viewMode === 'plain' ? config.plain : config.label}</span>
                </span>
                <div className="flex items-center gap-2">
                  {log.duration_ms !== null && (
                    <span className="text-[10px] text-[#4b4b6b] font-mono">{log.duration_ms}ms</span>
                  )}
                  {isFallback ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400">↩ FALLBACK</span>
                  ) : (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                      log.status === 'success' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' :
                      log.status === 'skipped' ? 'text-[#4b4b6b]' :
                      'bg-red-500/10 border border-red-500/30 text-red-400'
                    }`}>
                      {STATUS_ICONS[log.status] || ''} {log.decision_made || log.status}
                    </span>
                  )}
                </div>
              </div>

              {/* Reasoning basis */}
              {log.decision_basis && viewMode === 'technical' && (
                <div className="mt-1.5 text-[11px] leading-relaxed text-[#9b9bbb]">
                  <span className="text-amber-500/80">REASONING</span>{' '}
                  <span className="text-[#6b7280]">{log.decision_basis}</span>
                </div>
              )}

              {/* Plain mode: show simplified decision */}
              {viewMode === 'plain' && log.decision_made && log.decision_made !== 'CONTINUE' && (
                <div className="mt-1.5 text-[11px]">
                  <span className="text-indigo-400">Decision →</span>{' '}
                  <span className="text-[#c4c4d8] font-semibold">{log.decision_made.replace(/_/g, ' ')}</span>
                </div>
              )}

              {isFallback && (
                <div className="mt-2 text-[11px] text-amber-400/80 italic bg-amber-500/5 rounded-lg px-3 py-2">
                  ⚠️ API was busy — using pre-built backup data to keep the demo running.
                </div>
              )}
            </div>
          );
        })}

        {isActive && (
          <div className="rounded-xl p-4 bg-[#0f0f1a] border border-emerald-500/20 border-l-[3px] border-l-emerald-500">
            <span className="text-emerald-400 text-xs flex items-center gap-2">
              <span className="animate-pulse">●</span>
              {viewMode === 'plain' ? 'AI is thinking...' : 'Processing...'}
            </span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
