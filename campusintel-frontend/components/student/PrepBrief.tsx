'use client';
import { AgentLog } from '@/hooks/useAgentLogs';

interface Props {
  logs: AgentLog[];
}

const MOCK_BRIEF = {
  headline: 'Google at LPU tests System Design in 75% of interviews. Your biggest risk is system_design — you have 68 hours. Prioritize it above everything.',
  confidence_in_data: 'MEDIUM',
  data_source: 'LOCAL_DB',
  topics: [
    { name: 'System Design', priority: 1, frequency_in_interviews: 0.75, student_current_level: 0.15, gap_severity: 'CRITICAL', time_to_allocate_hours: 5, specific_subtopics: ['LLD', 'HLD', 'CAP Theorem', 'Distributed Systems'], sample_questions: ['Design Google Drive', 'Design a rate limiter'] },
    { name: 'DSA', priority: 2, frequency_in_interviews: 0.87, student_current_level: 0.55, gap_severity: 'MODERATE', time_to_allocate_hours: 8, specific_subtopics: ['Arrays', 'DP', 'Graphs', 'Trees', 'Two Pointers'], sample_questions: ['Find longest subarray with sum K', 'LRU Cache'] },
    { name: 'Behavioral', priority: 3, frequency_in_interviews: 0.87, student_current_level: 0.65, gap_severity: 'MODERATE', time_to_allocate_hours: 3, specific_subtopics: ['STAR Format', 'Leadership', 'Failure Stories'], sample_questions: ['Describe a time you made a decision with incomplete info'] },
  ],
  prep_plan: {
    total_hours: 16,
    schedule: [
      { day: 1, focus: 'System Design Crash Course', hours: 5, tasks: ['Grokking SD Ch1–3', 'Design Notification System', 'Watch NeetCode SD playlist'] },
      { day: 2, focus: 'DSA Power Session', hours: 8, tasks: ['LeetCode Top 50 Google', 'Master Sliding Window', 'DP: Coin Change, LCS'] },
      { day: 3, focus: 'Review + Mock', hours: 3, tasks: ['System Design mock', 'Behavioral story rehearsal', 'Rest'] },
    ],
  },
  success_tips: ['Think out loud — Google values communication as much as correctness', 'State assumptions before starting', 'Discuss trade-offs after every design decision'],
  red_flags_to_avoid: ['Jumping to code without approach', 'Saying "I don\'t know" — always attempt with assumptions'],
  mock_question_for_now: 'Design a parking lot management system. Walk me through your LLD.',
};

const SEVERITY_COLOR: Record<string, string> = {
  CRITICAL: 'bg-amber-500/15 border-amber-500/40 text-amber-400',
  MODERATE: 'bg-blue-500/15 border-blue-500/40 text-blue-400',
  OK: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400',
};

export default function PrepBrief({ logs }: Props) {
  const briefLog = logs.find(l => l.step_name === 'GENERATE_BRIEF' || l.step_name === 'FALLBACK_TRIGGERED');
  
  if (!briefLog && logs.length === 0) {
    return (
      <div className="bg-[#0f0f1a] border border-[#2a2a3d] rounded-2xl p-6 h-[500px] flex flex-col items-center justify-center text-center">
        <div className="text-4xl mb-4 opacity-50">🤖</div>
        <h3 className="text-lg font-semibold text-[#c4c4d8]">No Intelligence Generated Yet</h3>
        <p className="text-sm text-[#6b7280] max-w-sm mt-2">
          Run the Agent Trace on the first tab. Once the agent hits the GENERATE_BRIEF step, the personalized strategy will appear here automatically.
        </p>
      </div>
    );
  }

  // Use live data if available, otherwise always show the rich mock brief as fallback
  const rawBrief = briefLog?.output as any;
  const brief = (rawBrief?.topics?.length ? rawBrief : null) || MOCK_BRIEF;
  const isLive = !!(rawBrief?.topics?.length);

  return (
    <div className="bg-[#0f0f1a] border border-[#2a2a3d] rounded-2xl p-6 h-[500px] overflow-y-auto custom-scrollbar space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-semibold text-[#e8e6f8]" style={{ fontFamily: 'var(--font-fraunces, serif)' }}>
            Interview Prep Brief
          </h2>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
            isLive ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400' : 'bg-indigo-500/15 border-indigo-500/40 text-indigo-400'
          }`}>
            {isLive ? 'LIVE DATA' : 'DEMO DATA'}
          </span>
        </div>
        <p className="text-emerald-400 text-sm font-medium leading-relaxed">{brief.headline}</p>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[10px] px-2 py-1 bg-[#1a1a2e] border border-[#2a2a3d] rounded text-[#9b9bbb]">
            Confidence: {brief.confidence_in_data}
          </span>
          <span className="text-[10px] px-2 py-1 bg-[#1a1a2e] border border-[#2a2a3d] rounded text-[#9b9bbb]">
            Source: {brief.data_source}
          </span>
        </div>
      </div>

      {/* Topics */}
      <div>
        <h3 className="text-sm font-semibold text-[#e8e6f8] mb-3 flex items-center gap-2">
          📊 Top Frequency Topics
        </h3>
        <div className="space-y-3">
          {brief.topics?.map((topic: any, i: number) => (
            <div key={i} className="bg-[#0a0a14] border border-[#2a2a3d] rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <span className="font-semibold text-[#c4c4d8]">{topic.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-indigo-400">{Math.round(topic.frequency_in_interviews * 100)}% of interviews</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${SEVERITY_COLOR[topic.gap_severity] || SEVERITY_COLOR.OK}`}>
                    {topic.gap_severity}
                  </span>
                </div>
              </div>
              <div className="flex gap-1 mb-1 h-1.5">
                <div className="flex-1 bg-[#2a2a3d] rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all"
                    style={{
                      width: `${topic.student_current_level * 100}%`,
                      background: topic.gap_severity === 'CRITICAL' ? '#f59e0b' : topic.gap_severity === 'MODERATE' ? '#6366f1' : '#10b981'
                    }} />
                </div>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {topic.specific_subtopics?.map((s: string) => (
                  <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-[#1a1a2e] border border-[#2a2a3d] text-[#9b9bbb]">{s}</span>
                ))}
              </div>
              <div className="text-[11px] text-[#6b7280] mt-2">~{topic.time_to_allocate_hours}h prep needed</div>
            </div>
          ))}
        </div>
      </div>

      {/* Prep Plan */}
      <div>
        <h3 className="text-sm font-semibold text-[#e8e6f8] mb-3 flex items-center gap-2">
          ⏱️ Generated Prep Plan
        </h3>
        <div className="space-y-2">
          {brief.prep_plan?.schedule?.map((day: any, i: number) => (
            <div key={i} className="flex gap-3 bg-[#0a0a14] border border-[#2a2a3d] rounded-xl p-4">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-indigo-300 bg-indigo-500/15 border border-indigo-500/30 flex-shrink-0">
                D{day.day}
              </div>
              <div className="flex-1">
                <div className="font-semibold text-[#c4c4d8] text-sm">{day.focus}</div>
                <div className="text-[11px] text-[#6b7280] mt-0.5">{day.hours}h</div>
                <ul className="mt-2 space-y-0.5">
                  {day.tasks?.map((t: string, j: number) => (
                    <li key={j} className="text-xs text-[#9b9bbb] flex items-start gap-1.5">
                      <span className="text-indigo-400 mt-0.5">›</span>{t}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mock question */}
      <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-4">
        <div className="text-[10px] uppercase tracking-wider text-indigo-400 mb-1">Practice Now</div>
        <p className="text-sm text-[#c4c4d8]">{brief.mock_question_for_now}</p>
      </div>
    </div>
  );
}
