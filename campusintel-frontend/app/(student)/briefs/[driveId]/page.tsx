'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { getStudent } from '@/lib/auth';

// Severity styles
const SEVERITY_STYLE: Record<string, string> = {
  CRITICAL: 'bg-amber-500/15 border-amber-500/40 text-amber-400',
  MODERATE: 'bg-blue-500/15 border-blue-500/40 text-blue-400',
  OK: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400',
};

const TABS = ['Overview', 'Topics', 'Prep Plan', 'Sample Questions', 'Red Flags'];

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-[#2a2a3d] rounded-lg ${className}`} />;
}

/** Triggers the agent for the real logged-in student + their first registered drive */
function GenerateBriefButton({ driveId }: { driveId: string }) {
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const router = useRouter();

  const handleGenerate = async () => {
    const student = getStudent();
    if (!student?.id) { setStatus('error'); return; }

    setStatus('running');
    try {
      // Use the driveId from URL if real, else find first registration
      let targetDriveId = driveId;
      if (!driveId || driveId === 'demo-drive-google') {
        const regs = await api.getStudentRegistrations(student.id).catch(() => []);
        const firstReg = Array.isArray(regs) ? regs[0] : null;
        targetDriveId = firstReg?.drive_id || driveId;
      }

      await api.triggerAgentForStudent(student.id, targetDriveId);
      setStatus('done');
      // Reload page after 4s to show the new brief
      setTimeout(() => router.refresh(), 4000);
    } catch (e: any) {
      console.error('[GenerateBrief]', e);
      setStatus('error');
    }
  };

  if (status === 'running') return (
    <div className="mt-4 flex items-center gap-3 justify-center">
      <svg className="animate-spin h-5 w-5 text-indigo-400" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
      </svg>
      <span className="text-indigo-300 text-sm">AI Agent running… this takes ~20 seconds</span>
    </div>
  );

  if (status === 'done') return (
    <div className="mt-4 text-emerald-400 text-sm">✓ Brief generated! Reloading…</div>
  );

  if (status === 'error') return (
    <div className="mt-4 text-red-400 text-sm">Failed to run agent. Check Railway logs.</div>
  );

  return (
    <button
      onClick={handleGenerate}
      className="inline-flex items-center gap-2 mt-4 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition"
    >
      ✨ Generate My Brief
    </button>
  );
}

export default function BriefPage() {
  const params = useParams();
  const driveId = params?.driveId as string;
  const [brief, setBrief] = useState<any>(null);
  const [drive, setDrive] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('Overview');
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const student = getStudent();
        if (!student?.id) {
          setError('Please log in to view your brief');
          setLoading(false);
          return;
        }

        // Get briefs for this student
        const briefs = await api.getBrief(student.id);
        if (!Array.isArray(briefs) || briefs.length === 0) {
          setError('No brief generated yet. Please run the agent from the Agent Trace page.');
          setLoading(false);
          return;
        }

        // Find the brief for this drive, or use the latest
        const targetBrief = briefs.find(b => b.drive_id === driveId) || briefs[0];
        const briefData = targetBrief.questions; // brief content is stored in questions field

        if (!briefData || typeof briefData !== 'object') {
          setError('Brief data is malformed. Please re-run the agent.');
          setLoading(false);
          return;
        }

        setBrief(briefData);

        // Get drive info
        try {
          const driveData = await api.getDriveDetail(driveId);
          setDrive(driveData);
        } catch {
          // Drive might be different from brief's drive, ignore
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load brief');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [driveId]);

  if (loading) {
    return (
      <div className="p-8 max-w-[1100px] mx-auto space-y-6">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-[1100px] mx-auto">
        <div className="rounded-2xl p-8 border border-amber-500/30 bg-amber-500/5 text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <div className="text-lg font-semibold text-[#e8e6f8] mb-2">{error}</div>
          <GenerateBriefButton driveId={driveId} />
        </div>
      </div>
    );
  }

  if (!brief) return null;

  const companyName = drive?.companies?.name || 'Company';
  const companyWebsite = drive?.companies?.website || `${companyName.toLowerCase()}.com`;
  const logoHost = companyWebsite.replace(/^https?:\/\//, '').split('/')[0];
  const driveDate = drive?.drive_date;
  const hoursLeft = driveDate
    ? Math.max(0, Math.round((new Date(driveDate).getTime() - Date.now()) / 3600000))
    : null;

  const topics = brief.topics || [];
  const prepPlan = brief.prep_plan?.schedule || [];
  const redFlags = brief.red_flags_to_avoid || [];
  const successTips = brief.success_tips || [];

  return (
    <div className="p-8 max-w-[1100px] mx-auto">
      {/* Header */}
      <div className="flex items-start gap-5 mb-8">
        <img
          src={`https://logo.clearbit.com/${logoHost}`}
          alt={companyName}
          className="w-16 h-16 rounded-2xl bg-[#2a2a3d]"
          onError={(e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.style.display = 'none'; }}
        />
        <div className="flex-1">
          <h1 className="font-display text-4xl text-[#e8e6f8]">{companyName}</h1>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {hoursLeft !== null && (
              <span className="text-[#6b7280] text-sm flex items-center gap-2">
                <span className="text-amber-400 font-semibold text-lg">{hoursLeft}</span>
                <span>hours remaining</span>
              </span>
            )}
            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${SEVERITY_STYLE.MODERATE}`}>
              {brief.confidence_in_data || 'MEDIUM'} CONFIDENCE
            </span>
            {brief.data_source && (
              <span className="text-[#6b7280] text-xs">Source: {brief.data_source}</span>
            )}
          </div>
        </div>
      </div>

      {/* TL;DR */}
      {brief.headline && (
        <div className="mb-6 rounded-2xl p-5 border-l-4 border-amber-500 bg-amber-500/5" style={{ border: '1px solid rgba(245,158,11,0.2)', borderLeftWidth: '4px', borderLeftColor: '#f59e0b' }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] uppercase tracking-widest font-bold text-amber-400">⚡ TL;DR</span>
          </div>
          <p className="text-sm text-[#c4c4d8] leading-relaxed">{brief.headline}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#2a2a3d] mb-8">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-3 text-sm font-medium transition-colors rounded-t-lg ${
              tab === t
                ? 'text-indigo-300 border-b-2 border-indigo-500 bg-indigo-500/5'
                : 'text-[#6b7280] hover:text-[#c4c4d8]'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'Overview' && (
        <div className="space-y-6">
          <div className="border-l-4 border-amber-500 bg-amber-500/5 rounded-r-2xl p-6">
            <p className="font-display text-xl text-[#e8e6f8] italic leading-relaxed">&ldquo;{brief.headline}&rdquo;</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {topics.map((topic: any) => (
              <div key={topic.name} className="card-dark rounded-2xl p-5">
                <div className="flex items-start justify-between mb-3">
                  <span className="font-semibold text-[#e8e6f8]">{topic.name}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${SEVERITY_STYLE[topic.gap_severity] || SEVERITY_STYLE.MODERATE}`}>
                    {topic.gap_severity}
                  </span>
                </div>
                <div className="text-[11px] text-indigo-400 mb-3">
                  Asked in {Math.round((topic.frequency_in_interviews || 0) * 100)}% of interviews
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex-1 rounded-full h-2 bg-[#2a2a3d] overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.round((topic.student_current_level || 0) * 100)}%`,
                        background:
                          topic.gap_severity === 'CRITICAL' ? '#f59e0b' :
                          topic.gap_severity === 'MODERATE' ? '#6366f1' : '#10b981',
                      }}
                    />
                  </div>
                  <span className="text-[11px] text-[#6b7280] flex-shrink-0">
                    {Math.round((topic.student_current_level || 0) * 100)}% / {Math.round((topic.required_level || topic.frequency_in_interviews || 0.7) * 100)}%
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {(topic.specific_subtopics || []).map((s: string) => (
                    <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-[#1a1a2e] border border-[#2a2a3d] text-[#9b9bbb]">{s}</span>
                  ))}
                </div>
                {topic.sample_questions?.[0] && (
                  <div className="bg-[#0a0a14] rounded-xl p-3">
                    <p className="text-[11px] text-[#9b9bbb] italic">&ldquo;{topic.sample_questions[0]}&rdquo;</p>
                  </div>
                )}
                <div className="mt-3 text-[11px] text-[#6b7280]">Study {topic.time_to_allocate_hours || 2} hours</div>
              </div>
            ))}
          </div>
          {brief.mock_question_for_now && (
            <div className="card-dark rounded-2xl p-6 border-l-4 border-indigo-500">
              <div className="text-[11px] uppercase tracking-widest text-indigo-400 mb-2">Practice Now</div>
              <p className="text-[#e8e6f8] font-medium">{brief.mock_question_for_now}</p>
            </div>
          )}
        </div>
      )}

      {/* Prep Plan */}
      {tab === 'Prep Plan' && (
        <div className="space-y-3">
          {prepPlan.map((day: any, i: number) => (
            <div key={i} className="card-dark rounded-2xl overflow-hidden">
              <button
                className="w-full flex items-center justify-between p-5 text-left hover:bg-white/5 transition"
                onClick={() => setExpanded(expanded === i ? null : i)}
              >
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-[#6b7280]">Day {day.day}</span>
                  <h3 className="font-semibold text-[#e8e6f8] mt-0.5">{day.focus}</h3>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-[#6b7280]">{day.hours}h</span>
                  <span className="text-[#6b7280]">{expanded === i ? '▲' : '▼'}</span>
                </div>
              </button>
              {expanded === i && (
                <div className="px-5 pb-5 border-t border-[#2a2a3d]">
                  <ol className="mt-4 space-y-2">
                    {(day.tasks || []).map((task: string, j: number) => (
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
          {redFlags.map((flag: string, i: number) => (
            <div key={i} className="rounded-2xl p-5 border border-amber-500/25 bg-amber-500/5">
              <div className="flex items-start gap-3">
                <span className="text-amber-500 text-lg flex-shrink-0">⚠️</span>
                <p className="text-sm text-[#e8e6f8]">{flag}</p>
              </div>
            </div>
          ))}
          {successTips.length > 0 && (
            <div className="mt-4 border-t border-[#2a2a3d] pt-6">
              <div className="text-[11px] uppercase tracking-widest text-emerald-400 mb-3">What helps</div>
              {successTips.map((tip: string, i: number) => (
                <div key={i} className="flex items-start gap-3 mb-3">
                  <span className="text-emerald-500">✓</span>
                  <p className="text-sm text-[#c4c4d8]">{tip}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sample Questions */}
      {tab === 'Sample Questions' && (
        <div className="space-y-4">
          {topics.map((topic: any) => (
            <div key={topic.name} className="card-dark rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#6b7280]">{topic.name}</span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${SEVERITY_STYLE[topic.gap_severity] || SEVERITY_STYLE.MODERATE}`}>
                  {topic.gap_severity}
                </span>
              </div>
              {(topic.sample_questions || []).map((q: string, i: number) => (
                <p key={i} className="text-[#e8e6f8] italic mb-2 pl-3 border-l-2 border-[#2a2a3d]">&ldquo;{q}&rdquo;</p>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Topics */}
      {tab === 'Topics' && (
        <div className="space-y-4">
          {topics.map((topic: any) => (
            <div key={topic.name} className="card-dark rounded-2xl p-5">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-[#e8e6f8] text-lg">{topic.name}</h3>
                  <div className="text-xs text-indigo-400 mt-1">
                    Asked in {Math.round((topic.frequency_in_interviews || 0) * 100)}% of interviews
                  </div>
                </div>
                <span className={`text-xs font-bold px-3 py-1 rounded-full border ${SEVERITY_STYLE[topic.gap_severity] || SEVERITY_STYLE.MODERATE}`}>
                  {topic.gap_severity}
                </span>
              </div>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs text-[#6b7280]">Your Level</span>
                <div className="flex-1 h-2 bg-[#2a2a3d] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.round((topic.student_current_level || 0) * 100)}%`,
                      background:
                        topic.gap_severity === 'CRITICAL' ? '#f59e0b' :
                        topic.gap_severity === 'MODERATE' ? '#6366f1' : '#10b981',
                    }}
                  />
                </div>
                <span className="text-xs text-[#6b7280]">
                  {Math.round((topic.student_current_level || 0) * 100)}%
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {(topic.specific_subtopics || []).map((s: string) => (
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
