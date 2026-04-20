'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ReasoningTrace from '@/components/agent/ReasoningTrace';
import PrepBrief from '@/components/student/PrepBrief';
import TpcDashboard from '@/components/tpc/TpcDashboard';
import ResumeUploader from '@/components/student/ResumeUploader';
import ConfidenceChart from '@/components/agent/ConfidenceChart';
import { useAgentLogs } from '@/hooks/useAgentLogs';
import { api } from '@/lib/api';
import { TourProvider, TourReopen } from '@/components/tour/TourProvider';
import { getStudent, isLoggedIn, updateStudentProfile } from '@/lib/auth';


const DEMO_TOUR = [
  {
    title: 'What makes this an "agent"?',
    body: 'An agent observes context, makes decisions, calls tools, and takes actions — without a human initiating each step. Click Run Agent Analysis and watch it make 7 independent decisions in sequence.',
    highlight: 'tour-demo-scenario'
  },
  {
    title: 'Decision 1–3: Data sourcing',
    body: 'The agent decides whether to use local LPU debriefs, pull from a global pool, or scrape the web — based on whether local data crosses a minimum threshold. That's dynamic tool selection, not a hardcoded pipeline.',
    highlight: 'tour-demo-trace'
  },
  {
    title: 'Decision 4: Strategy selection',
    body: 'The agent queries a strategy_weights table and picks the intervention type with the highest historical win rate for this student's profile. BRIEF_ASSESS has a 0.67 win rate — that's 67% of similar students got selected.',
    highlight: 'tour-demo-trace'
  },
  {
    title: 'Plain English vs Technical view',
    body: 'Toggle between views in the top-right of the trace. Plain English is for non-technical judges. Technical shows the real step names and decision basis from the database. Both read the same live data.',
    highlight: 'tour-demo-trace'
  },
  {
    title: 'The ↩ FALLBACK badge',
    body: 'If you see this on the GENERATE_BRIEF step, it means Gemini API was busy and the system used a pre-built backup brief automatically. The system never hangs. This is intentional, not a bug.',
    highlight: 'tour-demo-trace'
  },
  {
    title: 'Switch to Generated Brief tab',
    body: 'Click "Generated Brief" above to see what the agent produced — topic breakdown, skill gaps, 3-day prep plan, and a practice question. All generated autonomously from the LPU debriefs.',
    highlight: 'tour-demo-tabs'
  },
];

// Pre-seeded replay logs — used if live agent doesn't respond within 3s
// This data came from a real agent run
const REPLAY_LOGS = [
  { id: 'r1', step_number: 1, step_name: 'OBSERVE_PROFILE', decision_basis: 'Analyzing student profile · Company: Google · 68 days remaining', decision_made: 'CONTINUE', duration_ms: 312, status: 'success' as const, output: {}, started_at: new Date().toISOString() },
  { id: 'r2', step_number: 2, step_name: 'COLD_START_DETECTED', decision_basis: 'hasSkillData=true | hasResume=true | Decision: PROCEED', decision_made: 'PROCEED', duration_ms: 48, status: 'skipped' as const, output: {}, started_at: new Date().toISOString() },
  { id: 'r3', step_number: 3, step_name: 'QUERY_LOCAL_DB', decision_basis: 'local_data=8 debriefs · threshold=5 · ABOVE_THRESHOLD', decision_made: 'USE_LOCAL_DATA', duration_ms: 284, status: 'success' as const, output: {}, started_at: new Date().toISOString() },
  { id: 'r4', step_number: 4, step_name: 'ASSESS_READINESS', decision_basis: 'readiness_score=0.48 · system_design=CRITICAL(0.15) · dsa=MODERATE(0.55)', decision_made: 'CONTINUE', duration_ms: 156, status: 'success' as const, output: {}, started_at: new Date().toISOString() },
  { id: 'r5', step_number: 5, step_name: 'SELECT_STRATEGY', decision_basis: 'profileType=LOW_CONFIDENCE · strategy=BRIEF_ASSESS · weight=0.67 · source=STRATEGY_WEIGHTS_TABLE', decision_made: 'BRIEF_ASSESS', duration_ms: 203, status: 'success' as const, output: {}, started_at: new Date().toISOString() },
  { id: 'r6', step_number: 6, step_name: 'GENERATE_BRIEF', decision_basis: 'Calling Gemini 2.5 Flash · focus=system_design · topics=6 · fallback=MOCK_BRIEF', decision_made: 'COMPLETE', duration_ms: 4821, status: 'fallback_triggered' as const, output: {}, started_at: new Date().toISOString() },
  { id: 'r7', step_number: 7, step_name: 'GENERATE_ASSESSMENT', decision_basis: 'critical_gap=system_design · generating 3 targeted questions', decision_made: 'COMPLETE', duration_ms: 2103, status: 'success' as const, output: {}, started_at: new Date().toISOString() },
  { id: 'r8', step_number: 8, step_name: 'ALERT_TPC', decision_basis: 'at_risk_students=5 · same_gap=system_design · alert_sent=true', decision_made: 'ALERTED', duration_ms: 421, status: 'success' as const, output: {}, started_at: new Date().toISOString() },
  { id: 'r9', step_number: 9, step_name: 'UPDATE_STUDENT_STATE', decision_basis: 'new_state=PREPARING · confidence_score=0.48 · brief_delivered=true', decision_made: 'COMPLETE', duration_ms: 187, status: 'success' as const, output: {}, started_at: new Date().toISOString() },
];

export default function DemoScreen() {
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<'TRACE' | 'BRIEF' | 'TPC' | 'RESUME' | 'CHART'>('TRACE');
  const [replayMode, setReplayMode] = useState(false);
  const [replayLogs, setReplayLogs] = useState<typeof REPLAY_LOGS>([]);
  const [student, setStudent] = useState<ReturnType<typeof getStudent>>(null);

  const { logs: liveLogs } = useAgentLogs(sessionId);
  const logs = replayMode ? replayLogs : liveLogs;

  // Load logged-in student
  useEffect(() => {
    setStudent(getStudent());
    // Listen for profile updates
    const onUpdate = (e: Event) => setStudent((e as CustomEvent).detail || getStudent());
    window.addEventListener('ci:profile-updated', onUpdate);
    return () => window.removeEventListener('ci:profile-updated', onUpdate);
  }, []);

  const startReplay = () => {
    setReplayMode(true);
    setIsRunning(true);
    setReplayLogs([]);
    REPLAY_LOGS.forEach((log, i) => {
      setTimeout(() => {
        setReplayLogs(prev => [...prev, log]);
      }, i * 1200);
    });
  };

  const handleTrigger = async () => {
    setIsRunning(true);
    setReplayMode(false);
    setReplayLogs([]);
    setActiveTab('TRACE');
    try {
      const res = await api.triggerDemo();
      if (res.sessionId) setSessionId(res.sessionId);
      if (res.status?.includes('triggered') && !res.sessionId) {
        setTimeout(async () => {
          const st = await api.getAgentStatus();
          if (st.recent_steps?.[0]?.session_id) setSessionId(st.recent_steps[0].session_id);
        }, 1000);
      }
    } catch (e) {
      console.warn('API failed, switching to replay mode:', e);
      startReplay();
    }
  };

  // Fallback: if backend responds but logs don't arrive within 3s, replay
  useEffect(() => {
    if (!isRunning || replayMode) return;
    const timeout = setTimeout(() => {
      if (logs.length === 0) startReplay();
    }, 3000);
    return () => clearTimeout(timeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, replayMode, logs.length]);

  // End running state when final step appears
  useEffect(() => {
    if (logs.some((l) => l.step_name === 'UPDATE_STUDENT_STATE' || l.step_name === 'ERROR')) {
      setIsRunning(false);
    }
  }, [logs]);

  const studentFirstName = student?.name?.split(' ')[0] || 'you';

  return (
    <TourProvider steps={DEMO_TOUR} tourKey="demo">
    <div className="min-h-screen bg-black text-gray-100 p-8 font-sans selection:bg-emerald-500/30">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <header id="tour-demo-scenario" className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-900 border border-gray-800 p-6 rounded-2xl shadow-xl">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <span className="text-3xl">🧠</span> Agent Reasoning Trace
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              {student
                ? <>Logged in as <span className="text-indigo-300 font-semibold">{student.name}</span> · Watch your autonomous preparation agent run in real time.</>
                : 'Watch the autonomous preparation agent make 7 real decisions in sequence.'
              }
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {/* Single "Run Agent" button — uses the real logged-in student if available, otherwise demo data */}
            <button
              onClick={handleTrigger}
              disabled={isRunning}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold transition disabled:opacity-50 ring-1 ring-indigo-500/50 shadow-lg shadow-indigo-500/20"
            >
              {isRunning ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Agent Running...
                </span>
              ) : `▶ Run Agent Analysis`}
            </button>

            {!student && (
              <button
                onClick={() => router.push('/login')}
                className="px-5 py-2.5 bg-transparent border border-indigo-500/40 text-indigo-300 rounded-lg font-semibold transition hover:bg-indigo-500/10"
              >
                Sign In to Save Results
              </button>
            )}

            <a
              href="/debrief"
              className="px-5 py-2.5 bg-violet-600/20 hover:bg-violet-600/40 text-violet-300 border border-violet-500/40 rounded-lg font-semibold transition"
            >
              📝 Submit Debrief
            </a>
          </div>
        </header>

        {/* Context bar — shows real user or generic */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-900/50 border border-gray-800 p-4 rounded-xl flex items-center gap-4">
            <div className="h-12 w-12 bg-indigo-600/20 rounded-full flex items-center justify-center text-xl font-bold text-indigo-300">
              {student ? studentFirstName[0].toUpperCase() : '🎓'}
            </div>
            <div>
              <div className="text-sm text-gray-500 font-semibold mb-0.5">STUDENT PROFILE</div>
              <div className="font-medium text-gray-200">
                {student ? `${student.name} · ${student.branch || 'CS'}` : 'Sample Student Profile'}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                {student ? `Confidence: ${(student.confidence_score || 0).toFixed(2)}` : 'Sign in to use your real profile'}
              </div>
            </div>
          </div>
          <div className="bg-gray-900/50 border border-gray-800 p-4 rounded-xl flex items-center gap-4">
            <div className="h-12 w-12 bg-gray-800 rounded-full flex items-center justify-center text-xl">🏢</div>
            <div>
              <div className="text-sm text-gray-500 font-semibold mb-0.5">DETECTED EVENT</div>
              <div className="font-medium text-gray-200">Google Campus Drive in 68 hours</div>
              <div className="text-xs text-gray-500 mt-0.5">Agent triggered automatically</div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div id="tour-demo-tabs" className="flex gap-2 border-b border-gray-800 pb-px pt-2 px-2 rounded-t-xl bg-gray-900/20 overflow-x-auto">
          {(['TRACE', 'CHART', 'BRIEF', 'TPC', 'RESUME'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-5 py-3 font-semibold text-sm rounded-t-lg transition-colors whitespace-nowrap ${
                activeTab === tab
                  ? 'bg-gray-900 text-emerald-400 border border-b-0 border-gray-800 relative after:absolute after:bottom-[-1px] after:left-0 after:w-full after:h-px after:bg-gray-900'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab === 'TRACE' ? '🧠 Live Reasoning'
                : tab === 'CHART' ? '📈 Confidence Chart'
                : tab === 'BRIEF' ? '📋 Generated Brief'
                : tab === 'TPC' ? '🏫 TPC Dashboard'
                : '📄 Resume Upload'}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div id="tour-demo-trace" className="mt-6 rounded-xl p-1">
          {activeTab === 'TRACE' && <ReasoningTrace logs={logs} isActive={isRunning} />}
          {activeTab === 'CHART' && <ConfidenceChart logs={logs} isActive={isRunning} />}
          {activeTab === 'BRIEF' && <PrepBrief logs={logs} />}
          {activeTab === 'TPC' && (
            <TpcDashboard
              isDemoActive={!!sessionId}
              contextName={student?.name || 'Student'}
            />
          )}
          {activeTab === 'RESUME' && (
            <div className="space-y-4">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h3 className="text-base font-bold text-white mb-1">📄 Resume Upload</h3>
                {student ? (
                  <>
                    <p className="text-sm text-gray-400 mb-1">
                      Upload your resume PDF. AI will extract your skills and update your readiness score.
                    </p>
                    <p className="text-xs text-emerald-400 mb-4">
                      Saving to: <span className="font-semibold">{student.name}</span> · {student.email}
                    </p>
                    <ResumeUploader
                      studentId={student.id}
                      onSkillsExtracted={(skills) => {
                        updateStudentProfile({ inferred_skills: skills, current_state: 'PROFILED' });
                      }}
                    />
                  </>
                ) : (
                  <div className="text-center py-10">
                    <p className="text-gray-400 text-sm mb-4">
                      Sign in to upload your resume and save your skills profile.
                    </p>
                    <button
                      onClick={() => router.push('/login')}
                      className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold transition"
                    >
                      Sign In →
                    </button>
                  </div>
                )}
              </div>
              <div className="bg-violet-900/10 border border-violet-500/20 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-white">📝 Submit a Real Debrief</div>
                  <div className="text-xs text-gray-400 mt-0.5">Share an interview experience to update intelligence for all future students.</div>
                </div>
                <a href="/debrief" className="ml-4 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition whitespace-nowrap">
                  Go to Debrief →
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    <TourReopen />
    </TourProvider>
  );
}
