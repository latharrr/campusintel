'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { TourProvider, TourReopen } from '@/components/tour/TourProvider';
import { api } from '@/lib/api';
import { getStudent, getCollegeId } from '@/lib/auth';

// ── Types ──────────────────────────────────────────────────────
interface AgentLog {
  id: string;
  step_name: string;
  decision_made: string;
  decision_basis: string;
  status: string;
  started_at: string;
}

interface Drive {
  id: string;
  drive_date: string;
  status: string;
  package_offered?: string;
  company: { id: string; name: string; website?: string };
  registration_status?: string;
}

// ── Readiness Ring ─────────────────────────────────────────────
function ReadinessRing({ score }: { score: number }) {
  const color = score < 0.5 ? '#f59e0b' : score < 0.7 ? '#6366f1' : '#10b981';
  const r = 28;
  const circ = 2 * Math.PI * r;
  const filled = circ * score;
  return (
    <div className="relative w-20 h-20 flex-shrink-0">
      <svg viewBox="0 0 64 64" className="w-20 h-20 -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="#2a2a3d" strokeWidth="5" />
        <circle cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={`${filled} ${circ}`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-lg leading-none" style={{ color }}>{score.toFixed(2)}</span>
      </div>
    </div>
  );
}

// ── Skeleton loader ────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-[#2a2a3d] rounded-lg ${className}`} />;
}

// ── Step name → friendly label map ────────────────────────────
const STEP_COLOR: Record<string, string> = {
  GENERATE_BRIEF: 'bg-violet-500',
  QUERY_LOCAL_DB: 'bg-blue-500',
  QUERY_GLOBAL_DB: 'bg-blue-400',
  ASSESS_READINESS: 'bg-amber-500',
  ALERT_TPC: 'bg-emerald-500',
  GENERATE_ASSESSMENT: 'bg-rose-500',
  SCHEDULE_SESSION: 'bg-teal-500',
  UPDATE_STUDENT_STATE: 'bg-indigo-500',
  SCRAPE_COMPANY_INTEL: 'bg-orange-500',
};

const DASHBOARD_TOUR = [
  {
    title: 'Your Placement Readiness Score',
    body: "This number was calculated by the AI — it compared your skill levels against what the company actually tests, based on verified debriefs from your campus. It's updated every time the agent runs.",
    highlight: 'tour-readiness-score'
  },
  {
    title: 'Your Skill Breakdown',
    body: 'Each bar shows your inferred skill level vs what the company expects. CRITICAL means high frequency + low student level. The AI uses these gaps to pick your prep strategy.',
    highlight: 'tour-skills-breakdown'
  },
  {
    title: 'What the AI is doing for you',
    body: "This feed shows the agent's real steps — pulled from the database in real time. Every action is logged, explained, and traceable.",
    highlight: 'tour-agent-activity'
  },
  {
    title: 'Navigate to Campus Pulse →',
    body: "Click 🌐 Campus Pulse in the sidebar to see the living network — every student, every company, every debrief, flowing in real time.",
    highlight: 'nav-pulse'
  },
];

export default function DashboardPage() {
  const [student, setStudentData] = useState<any>(null);
  const [agentLogs, setAgentLogs] = useState<AgentLog[]>([]);
  const [drives, setDrives] = useState<Drive[]>([]);
  const [briefCount, setBriefCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showPopup, setShowPopup] = useState(false);
  const [popupStep, setPopupStep] = useState<'prompt' | 'debrief'>('prompt');
  const [debriefForm, setDebriefForm] = useState({ questions: '', outcome: 'selected', round: 'technical_1' });
  const [debriefStatus, setDebriefStatus] = useState<'idle' | 'submitting' | 'done'>('idle');

  const loadDashboard = useCallback(async () => {
    const stored = getStudent();
    const studentId = stored?.id || 'demo-student-rahul';
    const collegeId = stored?.college_id || getCollegeId();

    try {
      // Parallel load
      const [studentRes, drivesRes, briefRes, agentStatusRes] = await Promise.allSettled([
        api.getStudent(studentId),
        api.getDrives(collegeId),
        api.getBrief(studentId),
        api.getAgentStatus(),
      ]);

      if (studentRes.status === 'fulfilled' && !studentRes.value.error) {
        setStudentData(studentRes.value);
      } else {
        // Fallback to stored profile
        setStudentData(stored);
      }

      if (drivesRes.status === 'fulfilled' && Array.isArray(drivesRes.value)) {
        setDrives(drivesRes.value.slice(0, 4));
      }

      if (briefRes.status === 'fulfilled' && Array.isArray(briefRes.value)) {
        setBriefCount(briefRes.value.length);
      }

      // Load recent agent logs from agentStatus
      if (agentStatusRes.status === 'fulfilled' && agentStatusRes.value.recent_steps) {
        setAgentLogs(agentStatusRes.value.recent_steps.slice(0, 5));
      }

    } catch (err) {
      console.error('[Dashboard] Load failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
    // Show popup if not dismissed
    const dismissed = localStorage.getItem('interview_popup_dismissed');
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
    if (!dismissed || parseInt(dismissed) < twoHoursAgo) {
      setTimeout(() => setShowPopup(true), 1500);
    }

    // Re-sync student data whenever auth profile is updated (e.g. after CV upload)
    const onProfileUpdated = (e: Event) => {
      const updated = (e as CustomEvent).detail;
      if (updated) {
        setStudentData((prev: any) => ({ ...(prev || {}), ...updated }));
      }
    };
    window.addEventListener('ci:profile-updated', onProfileUpdated);
    return () => window.removeEventListener('ci:profile-updated', onProfileUpdated);
  }, [loadDashboard]);

  const dismissPopup = () => {
    localStorage.setItem('interview_popup_dismissed', Date.now().toString());
    setShowPopup(false);
  };

  const submitDebrief = async () => {
    if (!debriefForm.questions.trim()) return;
    setDebriefStatus('submitting');
    try {
      const stored = getStudent();
      await api.submitDebrief({
        driveId: 'demo-drive-google',
        collegeId: stored?.college_id || 'college-lpu-001',
        companyId: 'company-google-001',
        roundType: debriefForm.round,
        questionsAsked: debriefForm.questions,
        topicsCovered: [],
        outcome: debriefForm.outcome,
        difficultyRating: 3,
        studentId: stored?.id || 'demo-student-rahul',
      });
      setDebriefStatus('done');
      setTimeout(() => dismissPopup(), 1500);
    } catch {
      setDebriefStatus('idle');
    }
  };

  // ── Derived data ───────────────────────────────────────────
  const skills = student?.inferred_skills
    ? Object.entries(student.inferred_skills as Record<string, number>)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 6)
        .map(([name, level]) => ({
          name: name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          level: level as number,
          status: (level as number) < 0.3 ? 'CRITICAL' : (level as number) < 0.6 ? 'MODERATE' : 'OK',
        }))
    : [];

  const readinessScore = student?.confidence_score || 0;

  const quickStats = [
    {
      label: 'Briefs Generated', value: String(briefCount || 0),
      icon: '📋', sub: briefCount > 0 ? `Last: ${drives[0]?.company?.name || '–'}` : 'Run agent to generate',
    },
    {
      label: 'Drives Registered', value: String(drives.length),
      icon: '🎯', sub: `${drives.filter(d => d.status === 'upcoming').length} upcoming`,
    },
    {
      label: 'Placement Score', value: readinessScore.toFixed(2),
      icon: '📊', sub: readinessScore > 0.6 ? '↑ Good standing' : '↑ Room to improve', trend: readinessScore > 0.5,
    },
  ];

  return (
    <TourProvider steps={DASHBOARD_TOUR} tourKey="dashboard">
      <div className="relative min-h-screen p-8">
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full animate-pulse-slow"
            style={{ background: 'radial-gradient(ellipse, rgba(99,102,241,0.06) 0%, transparent 70%)' }} />
        </div>

        {/* Interview Day Popup */}
        {showPopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="w-[460px] bg-[#0f0f1a] border border-[#2a2a3d] rounded-2xl p-10 shadow-2xl">
              {popupStep === 'prompt' ? (
                <>
                  <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
                      style={{ background: 'rgba(245,158,11,0.15)', border: '2px solid rgba(245,158,11,0.4)' }}>
                      <span className="animate-pulse">📅</span>
                    </div>
                  </div>
                  <h2 className="font-display text-2xl text-center text-[#e8e6f8] mb-2">How did your interview go?</h2>
                  <p className="text-[#6b7280] text-sm text-center mb-8">
                    Share what happened — it helps every student who interviews after you.
                  </p>
                  <div className="flex gap-3 mb-4">
                    <button onClick={() => setPopupStep('debrief')}
                      className="flex-1 py-3 rounded-xl text-sm font-semibold border border-emerald-500/40 text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/12 transition">
                      ✓ Yes, I interviewed
                    </button>
                    <button onClick={dismissPopup}
                      className="flex-1 py-3 rounded-xl text-sm font-semibold border border-[#3a3a4d] text-[#6b7280] hover:bg-white/5 transition">
                      ✗ Didn&apos;t go
                    </button>
                  </div>
                  <button onClick={dismissPopup}
                    className="w-full text-center text-[12px] text-[#4b4b6b] hover:text-[#6b7280] transition">
                    Remind me later
                  </button>
                </>
              ) : (
                <>
                  <h2 className="font-display text-xl text-[#e8e6f8] mb-1">Share your experience</h2>
                  <p className="text-[#6b7280] text-xs mb-5">Anonymized and added to the intelligence pool</p>

                  <div className="space-y-4">
                    <div className="flex gap-2 flex-wrap">
                      {[
                        { v: 'technical_1', l: 'Technical 1' },
                        { v: 'technical_2', l: 'Technical 2' },
                        { v: 'system_design', l: 'System Design' },
                        { v: 'hr', l: 'HR' },
                        { v: 'online_test', l: 'Online Test' },
                      ].map(r => (
                        <button key={r.v} onClick={() => setDebriefForm(f => ({ ...f, round: r.v }))}
                          className={`px-3 py-1.5 text-xs rounded-full border transition ${debriefForm.round === r.v ? 'border-indigo-500/60 text-indigo-300 bg-indigo-500/10' : 'border-[#2a2a3d] text-[#9b9bbb] hover:border-indigo-500/40'}`}>
                          {r.l}
                        </button>
                      ))}
                    </div>
                    <textarea
                      rows={3}
                      value={debriefForm.questions}
                      onChange={e => setDebriefForm(f => ({ ...f, questions: e.target.value }))}
                      placeholder="What questions did they ask? Topics covered, difficulty..."
                      className="w-full bg-[#0a0a14] border border-[#2a2a3d] rounded-xl p-3 text-sm text-[#e8e6f8] placeholder:text-[#4b4b6b] outline-none focus:border-indigo-500/60 resize-none transition" />
                    <div className="flex gap-3">
                      {[{ v: 'selected', l: 'Got through ✓' }, { v: 'rejected', l: 'Rejected ✗' }, { v: 'waiting', l: 'Waiting...' }].map(o => (
                        <button key={o.v} onClick={() => setDebriefForm(f => ({ ...f, outcome: o.v }))}
                          className={`flex-1 py-2 text-xs rounded-lg border transition ${debriefForm.outcome === o.v ? 'border-indigo-500/40 text-indigo-300 bg-indigo-500/10' : 'border-[#2a2a3d] text-[#6b7280] hover:border-indigo-500/40'}`}>
                          {o.l}
                        </button>
                      ))}
                    </div>
                    <button onClick={submitDebrief} disabled={debriefStatus === 'submitting' || debriefStatus === 'done'}
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition disabled:opacity-60 flex items-center justify-center gap-2">
                      {debriefStatus === 'done' ? '✓ Submitted!' : debriefStatus === 'submitting' ? (
                        <><svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Saving...</>
                      ) : 'Submit Debrief →'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <div className="max-w-[1200px] mx-auto space-y-6 relative z-10">
          {/* Welcome header */}
          {student?.name && (
            <div className="flex items-center justify-between mb-2">
              <div>
                <h1 className="font-display text-2xl text-[#e8e6f8]">
                  Welcome back, {student.name.split(' ')[0]} 👋
                </h1>
                <p className="text-[#6b7280] text-sm mt-0.5">{student.email} · {student.branch || 'LPU'}</p>
              </div>
              <Link href="/demo"
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-600/40 transition">
                🧠 Run AI Agent →
              </Link>
            </div>
          )}

          {/* Hero row */}
          <div className="grid grid-cols-[55%_1fr] gap-6">
            {/* Readiness Card */}
            <div className="card-dark rounded-2xl p-7">
              <div className="flex justify-between items-start mb-5">
                <div className="text-[11px] uppercase tracking-widest text-[#6b7280] font-semibold">Your Placement Readiness</div>
                <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                  <span className="relative w-2 h-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-500" />
                  </span>
                  LIVE
                </span>
              </div>

              {loading ? (
                <div className="space-y-3 mb-6">
                  <Skeleton className="h-16 w-40" />
                  <Skeleton className="h-3 w-60" />
                </div>
              ) : (
                <div id="tour-readiness-score" className="flex items-end gap-6 mb-6 rounded-2xl p-2">
                  <ReadinessRing score={readinessScore} />
                  <div>
                    <div className="font-display text-5xl leading-none"
                      style={{ color: readinessScore < 0.5 ? '#f59e0b' : readinessScore < 0.7 ? '#6366f1' : '#10b981' }}>
                      {readinessScore.toFixed(2)}
                    </div>
                    <div className="text-[12px] text-[#6b7280] mt-2">
                      {skills.length > 0 ? `Based on ${skills.length} detected skills` : 'Upload resume to calculate'}
                      {drives[0] && ` · ${drives[0].company.name} drive upcoming`}
                    </div>
                  </div>
                </div>
              )}

              {loading ? (
                <div className="space-y-2">
                  {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}
                </div>
              ) : skills.length > 0 ? (
                <div id="tour-skills-breakdown" className="space-y-2.5 rounded-xl p-2">
                  {skills.map(skill => (
                    <div key={skill.name} className="flex items-center gap-3">
                      <span className="text-xs text-[#9b9bbb] w-24 flex-shrink-0">{skill.name}</span>
                      <div className="flex-1 h-1.5 bg-[#2a2a3d] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all"
                          style={{
                            width: `${skill.level * 100}%`,
                            background: skill.status === 'CRITICAL' ? '#f59e0b' : skill.status === 'MODERATE' ? '#6366f1' : '#10b981'
                          }} />
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
                        skill.status === 'CRITICAL' ? 'bg-amber-500/15 text-amber-400' :
                        skill.status === 'MODERATE' ? 'bg-indigo-500/15 text-indigo-400' :
                        'bg-emerald-500/15 text-emerald-400'
                      }`}>{skill.status}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-[#4b4b6b] text-sm">
                  <p>No skills detected yet.</p>
                  <Link href="/onboarding" className="text-indigo-400 hover:text-indigo-300 text-xs mt-1 block">
                    Upload your resume to get started →
                  </Link>
                </div>
              )}

              {drives[0] && (
                <div className="mt-5 flex items-center gap-2">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs text-indigo-300"
                    style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)' }}>
                    <img src={`https://logo.clearbit.com/${drives[0].company.website || drives[0].company.name.toLowerCase() + '.com'}`}
                      alt={drives[0].company.name} className="w-4 h-4 rounded-sm"
                      onError={(e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.style.display = 'none'; }} />
                    {drives[0].company.name} Drive
                  </div>
                  <Link href="/briefs/demo-drive-google"
                    className="px-3 py-1.5 rounded-full text-xs text-white bg-indigo-600 hover:bg-indigo-500 transition">
                    View Brief →
                  </Link>
                </div>
              )}
            </div>

            {/* Upcoming Drives */}
            <div className="card-dark rounded-2xl p-6">
              <div className="text-[11px] uppercase tracking-widest text-[#6b7280] font-semibold mb-5">Upcoming Drives</div>
              {loading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
                </div>
              ) : drives.length > 0 ? (
                <div className="space-y-3">
                  {drives.slice(0, 4).map(d => {
                    const daysLeft = Math.ceil((new Date(d.drive_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                    return (
                      <div key={d.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-[#2a2a3d] hover:bg-white/[0.06] transition">
                        <img src={`https://logo.clearbit.com/${d.company.website || d.company.name.toLowerCase() + '.com'}`}
                          alt={d.company.name} className="w-8 h-8 rounded-lg bg-[#2a2a3d]"
                          onError={(e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.style.display = 'none'; }} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-[#e8e6f8]">{d.company.name}</div>
                          <div className="text-[11px] text-[#6b7280]">
                            {new Date(d.drive_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                            {daysLeft > 0 ? ` · ${daysLeft}d left` : ' · Today!'}
                          </div>
                        </div>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                          d.status === 'upcoming' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' :
                          'text-[#6b7280] bg-transparent border-[#3a3a4d]'
                        }`}>{d.status}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-[#4b4b6b] text-sm">No upcoming drives found.</div>
              )}
              <Link href="/drives" className="block text-center text-xs text-indigo-400 hover:text-indigo-300 mt-5 transition">
                View all drives →
              </Link>
            </div>
          </div>

          {/* Second row */}
          <div className="grid grid-cols-[60%_1fr] gap-6">
            {/* Agent Activity Feed */}
            <div id="tour-agent-activity" className="card-dark rounded-2xl p-6">
              <div className="text-[11px] uppercase tracking-widest text-[#6b7280] font-semibold mb-5">What the AI is doing for you</div>
              {loading ? (
                <div className="space-y-4">
                  {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : agentLogs.length > 0 ? (
                <div className="space-y-4">
                  {agentLogs.map((log, i) => (
                    <div key={log.id || i} className="flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${STEP_COLOR[log.step_name] || 'bg-[#4b4b6b]'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[#c4c4d8] leading-snug">{log.decision_basis}</p>
                        <p className="text-[11px] text-[#4b4b6b] mt-0.5">
                          {log.step_name.replace(/_/g, ' ')} · {log.decision_made} ·{' '}
                          {new Date(log.started_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-[#4b4b6b] text-sm">
                  <p>Agent hasn&apos;t run yet.</p>
                  <Link href="/demo" className="text-indigo-400 hover:text-indigo-300 text-xs mt-1 block">
                    Run the AI agent →
                  </Link>
                </div>
              )}
              <Link href="/demo"
                className="block text-xs text-indigo-400 hover:text-indigo-300 transition mt-5 pt-4 border-t border-[#2a2a3d]">
                See full reasoning trace →
              </Link>
            </div>

            {/* Quick Stats */}
            <div className="space-y-3">
              {quickStats.map(s => (
                <div key={s.label} className="card-dark rounded-xl p-4 flex items-center gap-4">
                  <span className="text-2xl">{s.icon}</span>
                  <div className="flex-1">
                    <div className="text-[11px] uppercase tracking-wider text-[#6b7280]">{s.label}</div>
                    {loading ? <Skeleton className="h-7 w-16 mt-1" /> : (
                      <div className="font-display text-2xl text-[#e8e6f8] mt-0.5">{s.value}</div>
                    )}
                    <div className={`text-[11px] mt-0.5 ${'trend' in s && s.trend ? 'text-emerald-400' : 'text-[#6b7280]'}`}>{s.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <TourReopen />
    </TourProvider>
  );
}
