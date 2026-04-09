'use client';
import { useState } from 'react';

const BRIEF = {
  headline: 'Google at LPU heavily tests Dynamic Programming and System Design. Your biggest risk is system_design — you have 68 hours. Prioritize it above everything else.',
  confidence: 'MEDIUM',
  data_source: 'LOCAL_DB',
  debrief_count: 8,
  topics: [
    {
      name: 'System Design', priority: 1, frequency: 0.75, student_level: 0.15, required: 0.75,
      severity: 'CRITICAL', hours: 5,
      subtopics: ['LLD', 'HLD', 'CAP Theorem', 'Distributed Systems'],
      question: 'Design Google Drive with storage, sharing, and real-time sync.',
    },
    {
      name: 'DSA', priority: 2, frequency: 0.87, student_level: 0.55, required: 0.8,
      severity: 'MODERATE', hours: 8,
      subtopics: ['Arrays', 'Two Pointers', 'DP', 'Graphs', 'Trees'],
      question: 'Find the length of the longest subarray with sum K.',
    },
    {
      name: 'DBMS', priority: 3, frequency: 0.62, student_level: 0.70, required: 0.65,
      severity: 'OK', hours: 2,
      subtopics: ['Normalization', 'Indexing', 'Transactions'],
      question: 'Explain ACID properties with a real-world example.',
    },
    {
      name: 'Behavioral', priority: 4, frequency: 0.87, student_level: 0.65, required: 0.7,
      severity: 'MODERATE', hours: 3,
      subtopics: ['STAR Format', 'Leadership', 'Failure Stories'],
      question: 'Tell me about a time you had to make a decision with incomplete information.',
    },
  ],
  prep_plan: [
    { day: 1, label: 'Wednesday', focus: 'System Design Crash Course', hours: 5, tasks: ['Grokking SD Ch1–3', 'Watch NeetCode SD playlist', 'Design Notification System'] },
    { day: 2, label: 'Thursday', focus: 'DSA Power Session', hours: 8, tasks: ['LeetCode Top 50 Google', 'Master Sliding Window', 'DP fundamentals: coin change, LCS'] },
    { day: 3, label: 'Friday (Interview)', focus: 'Review + Mock', hours: 2, tasks: ['System Design mock with yourself', 'Behavioral story rehearsal', 'Rest'] },
  ],
  red_flags: [
    'Don\'t jump directly to code without explaining your approach — caused rejection in 4/8 LPU-Google interviews.',
    'Don\'t say "I don\'t know" — always attempt with assumptions.',
    'Avoid overcomplicating initial solutions — start simple, optimize on demand.',
  ],
  success_tips: [
    'Think out loud — Google interviewers value communication as much as correctness.',
    'State assumptions before starting — shows structured thinking.',
    'Discuss trade-offs after every design decision.',
  ],
  mock_question: 'Design a parking lot management system. Walk me through your LLD approach.',
};

const TABS = ['Overview', 'Topics', 'Prep Plan', 'Sample Questions', 'Red Flags'];

const SEVERITY_STYLE = {
  CRITICAL: 'bg-amber-500/15 border-amber-500/40 text-amber-400',
  MODERATE: 'bg-blue-500/15 border-blue-500/40 text-blue-400',
  OK: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400',
};

export default function BriefPage() {
  const [tab, setTab] = useState('Overview');
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <div className="p-8 max-w-[1100px] mx-auto">
      {/* Header */}
      <div className="flex items-start gap-5 mb-8">
        <img src="https://logo.clearbit.com/google.com" alt="Google"
          className="w-16 h-16 rounded-2xl bg-[#2a2a3d]"
          onError={(e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.style.display='none'; }} />
        <div className="flex-1">
          <h1 className="font-display text-4xl text-[#e8e6f8]">Google</h1>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="text-[#6b7280] text-sm flex items-center gap-2">
              <span className="text-amber-400 font-semibold text-lg">68</span>
              <span>hours remaining</span>
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${SEVERITY_STYLE[BRIEF.confidence as 'MEDIUM' as keyof typeof SEVERITY_STYLE] || SEVERITY_STYLE.MODERATE}`}>
              {BRIEF.confidence} CONFIDENCE
            </span>
            <span className="text-[#6b7280] text-xs">Based on {BRIEF.debrief_count} LPU debriefs</span>
          </div>
        </div>
      </div>

      {/* TL;DR Card — always visible, above tabs */}
      <div className="mb-6 rounded-2xl p-5 border-l-4 border-amber-500" style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)', borderLeftWidth: '4px', borderLeftColor: '#f59e0b' }}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] uppercase tracking-widest font-bold text-amber-400">⚡ TL;DR — 68 hours left</span>
          <span className="text-[10px] text-[#6b7280]">Read this first. Everything else is detail.</span>
        </div>
        <div className="space-y-2.5">
          <div className="flex items-start gap-2 text-sm">
            <span className="text-amber-400 font-bold flex-shrink-0 w-28">This week:</span>
            <span className="text-[#c4c4d8]">Study System Design for 5h and DSA for 8h. Skip everything else.</span>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <span className="text-amber-400 font-bold flex-shrink-0 w-28">The one thing:</span>
            <span className="text-[#c4c4d8]">System Design — Google asks it in 75% of LPU interviews. Your level is 15%. This is your only critical gap.</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-amber-400 font-bold w-28">Your score:</span>
            <span className="text-amber-400 font-semibold">48%</span>
            <span className="text-[#6b7280] mx-1">→ Target</span>
            <span className="text-emerald-400 font-semibold">65%+</span>
            <span className="text-[#6b7280]">before the interview.</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#2a2a3d] mb-8">
        {TABS.map(t => (
          <button key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-3 text-sm font-medium transition-colors rounded-t-lg ${
              tab === t ? 'text-indigo-300 border-b-2 border-indigo-500 bg-indigo-500/5' : 'text-[#6b7280] hover:text-[#c4c4d8]'
            }`}>
            {t}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'Overview' && (
        <div className="space-y-6">
          {/* Hero statement */}
          <div className="border-l-4 border-amber-500 bg-amber-500/5 rounded-r-2xl p-6">
            <p className="font-display text-xl text-[#e8e6f8] italic leading-relaxed">&ldquo;{BRIEF.headline}&rdquo;</p>
          </div>

          {/* Topic cards grid */}
          <div className="grid grid-cols-2 gap-4">
            {BRIEF.topics.map(topic => (
              <div key={topic.name} className="card-dark rounded-2xl p-5">
                <div className="flex items-start justify-between mb-3">
                  <span className="font-semibold text-[#e8e6f8]">{topic.name}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${SEVERITY_STYLE[topic.severity as keyof typeof SEVERITY_STYLE]}`}>
                    {topic.severity}
                  </span>
                </div>
                <div className="text-[11px] text-indigo-400 mb-3">
                  Asked in {Math.round(topic.frequency * 100)}% of interviews
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex-1 rounded-full h-2 bg-[#2a2a3d] overflow-hidden">
                    <div className="h-full rounded-full"
                      style={{
                        width: `${topic.student_level * 100}%`,
                        background: topic.severity === 'CRITICAL' ? '#f59e0b' : topic.severity === 'MODERATE' ? '#6366f1' : '#10b981'
                      }} />
                  </div>
                  <span className="text-[11px] text-[#6b7280] flex-shrink-0">{Math.round(topic.student_level * 100)}% / {Math.round(topic.required * 100)}%</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {topic.subtopics.map(s => (
                    <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-[#1a1a2e] border border-[#2a2a3d] text-[#9b9bbb]">{s}</span>
                  ))}
                </div>
                <div className="bg-[#0a0a14] rounded-xl p-3">
                  <p className="text-[11px] text-[#9b9bbb] italic">&ldquo;{topic.question}&rdquo;</p>
                </div>
                <div className="mt-3 text-[11px] text-[#6b7280]">Study {topic.hours} hours</div>
              </div>
            ))}
          </div>

          {/* Mock question CTA */}
          <div className="card-dark rounded-2xl p-6 border-l-4 border-indigo-500">
            <div className="text-[11px] uppercase tracking-widest text-indigo-400 mb-2">Practice Now</div>
            <p className="text-[#e8e6f8] font-medium">{BRIEF.mock_question}</p>
          </div>
        </div>
      )}

      {/* Prep Plan */}
      {tab === 'Prep Plan' && (
        <div className="space-y-3">
          {BRIEF.prep_plan.map((day, i) => (
            <div key={i} className="card-dark rounded-2xl overflow-hidden">
              <button
                className="w-full flex items-center justify-between p-5 text-left hover:bg-white/5 transition"
                onClick={() => setExpanded(expanded === i ? null : i)}>
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-[#6b7280]">Day {day.day} — {day.label}</span>
                  <h3 className="font-semibold text-[#e8e6f8] mt-0.5">{day.focus}</h3>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-[#6b7280]">{day.hours}h</span>
                  <span className="text-[#6b7280] transition-transform">{expanded === i ? '▲' : '▼'}</span>
                </div>
              </button>
              {expanded === i && (
                <div className="px-5 pb-5 border-t border-[#2a2a3d]">
                  <ol className="mt-4 space-y-2">
                    {day.tasks.map((task, j) => (
                      <li key={j} className="flex items-start gap-3">
                        <span className="w-5 h-5 rounded-full border border-[#3a3a4d] flex items-center justify-center text-[10px] text-[#6b7280] flex-shrink-0 mt-0.5">{j + 1}</span>
                        <span className="text-sm text-[#c4c4d8]">{task}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Red Flags */}
      {tab === 'Red Flags' && (
        <div className="space-y-4">
          {BRIEF.red_flags.map((flag, i) => (
            <div key={i} className="rounded-2xl p-5 border border-amber-500/25 bg-amber-500/5">
              <div className="flex items-start gap-3">
                <span className="text-amber-500 text-lg flex-shrink-0">⚠️</span>
                <p className="text-sm text-[#e8e6f8]">{flag}</p>
              </div>
            </div>
          ))}
          <div className="mt-4 border-t border-[#2a2a3d] pt-6">
            <div className="text-[11px] uppercase tracking-widest text-emerald-400 mb-3">What helps</div>
            {BRIEF.success_tips.map((tip, i) => (
              <div key={i} className="flex items-start gap-3 mb-3">
                <span className="text-emerald-500">✓</span>
                <p className="text-sm text-[#c4c4d8]">{tip}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sample Questions tab */}
      {tab === 'Sample Questions' && (
        <div className="space-y-4">
          {BRIEF.topics.map(topic => (
            <div key={topic.name} className="card-dark rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#6b7280]">{topic.name}</span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${SEVERITY_STYLE[topic.severity as keyof typeof SEVERITY_STYLE]}`}>{topic.severity}</span>
              </div>
              <p className="text-[#e8e6f8] italic">&ldquo;{topic.question}&rdquo;</p>
            </div>
          ))}
        </div>
      )}

      {/* Topics tab */}
      {tab === 'Topics' && (
        <div className="space-y-4">
          {BRIEF.topics.map(topic => (
            <div key={topic.name} className="card-dark rounded-2xl p-5">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-[#e8e6f8] text-lg">{topic.name}</h3>
                  <div className="text-xs text-indigo-400 mt-1">Asked in {Math.round(topic.frequency * 100)}% of Google interviews at LPU</div>
                </div>
                <span className={`text-xs font-bold px-3 py-1 rounded-full border ${SEVERITY_STYLE[topic.severity as keyof typeof SEVERITY_STYLE]}`}>{topic.severity}</span>
              </div>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs text-[#6b7280]">You</span>
                <div className="flex-1 h-2 bg-[#2a2a3d] rounded-full overflow-hidden relative">
                  <div className="h-full rounded-full" style={{ width: `${topic.required * 100}%`, background: '#2a2a3d' }} />
                  <div className="absolute top-0 left-0 h-full rounded-full" style={{
                    width: `${topic.student_level * 100}%`,
                    background: topic.severity === 'CRITICAL' ? '#f59e0b' : topic.severity === 'MODERATE' ? '#6366f1' : '#10b981'
                  }} />
                </div>
                <span className="text-xs text-[#6b7280]">Required</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {topic.subtopics.map(s => (
                  <span key={s} className="text-xs px-2.5 py-1 rounded-full bg-[#1a1a2e] border border-[#2a2a3d] text-[#9b9bbb]">{s}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
