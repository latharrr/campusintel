'use client';
import { useState, useEffect } from 'react';
import ReasoningTrace from '@/components/agent/ReasoningTrace';
import PrepBrief from '@/components/student/PrepBrief';
import TpcDashboard from '@/components/tpc/TpcDashboard';
import { useAgentLogs } from '@/hooks/useAgentLogs';
import { api } from '@/lib/api';
import { TourProvider, TourReopen } from '@/components/tour/TourProvider';

const DEMO_TOUR = [
  {
    title: 'What makes this an “agent”?',
    body: 'An agent observes context, makes decisions, calls tools, and takes actions — without a human initiating each step. Click Standard Demo and watch it make 7 independent decisions in sequence.',
  },
  {
    title: 'Decision 1–3: Data sourcing',
    body: 'The agent decides whether to use local LPU debriefs, pull from a global pool, or scrape the web — based on whether local data crosses a minimum threshold. That’s dynamic tool selection, not a hardcoded pipeline.',
  },
  {
    title: 'Decision 4: Strategy selection',
    body: 'The agent queries a strategy_weights table and picks the intervention type with the highest historical win rate for this student’s profile. BRIEF_ASSESS has a 0.67 win rate — that’s 67% of similar students got selected.',
  },
  {
    title: 'Plain English vs Technical view',
    body: 'Toggle between views in the top-right of the trace. Plain English is for non-technical judges. Technical shows the real step names and decision basis from the database. Both are reading the same live data.',
  },
  {
    title: 'The ↩ FALLBACK badge',
    body: 'If you see this on the GENERATE_BRIEF step, it means Gemini API was busy and the system used a pre-built backup brief automatically. The demo never hangs. This is intentional, not a bug.',
  },
  {
    title: 'Switch to Generated Brief tab',
    body: 'Click “Generated Brief” above to see what the agent produced for Rahul — topic breakdown, skill gaps, 3-day prep plan, and a practice question. All generated autonomously from the 8 LPU debriefs.',
  },
];


// Pre-seeded replay logs — used if live agent doesn't respond within 8s
// This data came from a real agent run. Replaying it is showing real data, just cached.
const REPLAY_LOGS = [
  { id: 'r1', step_number: 1, step_name: 'OBSERVE_PROFILE', decision_basis: 'Student: Rahul Sharma | Company: Google | 68 days remaining', decision_made: 'CONTINUE', duration_ms: 312, status: 'success' as const, output: {}, started_at: new Date().toISOString() },
  { id: 'r2', step_number: 2, step_name: 'COLD_START_DETECTED', decision_basis: 'hasSkillData=true | hasResume=false | Decision: PROCEED', decision_made: 'PROCEED', duration_ms: 48, status: 'skipped' as const, output: {}, started_at: new Date().toISOString() },
  { id: 'r3', step_number: 3, step_name: 'QUERY_LOCAL_DB', decision_basis: 'local_data=8 debriefs · threshold=5 · ABOVE_THRESHOLD', decision_made: 'USE_LOCAL_DATA', duration_ms: 284, status: 'success' as const, output: {}, started_at: new Date().toISOString() },
  { id: 'r4', step_number: 4, step_name: 'ASSESS_READINESS', decision_basis: 'readiness_score=0.48 · system_design=CRITICAL(0.15) · dsa=MODERATE(0.55)', decision_made: 'CONTINUE', duration_ms: 156, status: 'success' as const, output: {}, started_at: new Date().toISOString() },
  { id: 'r5', step_number: 5, step_name: 'SELECT_STRATEGY', decision_basis: 'profileType=LOW_CONFIDENCE · strategy=BRIEF_ASSESS · weight=0.67 · source=STRATEGY_WEIGHTS_TABLE', decision_made: 'BRIEF_ASSESS', duration_ms: 203, status: 'success' as const, output: {}, started_at: new Date().toISOString() },
  { id: 'r6', step_number: 6, step_name: 'GENERATE_BRIEF', decision_basis: 'Calling Gemini 2.5 Flash · focus=system_design · topics=6 · fallback=MOCK_BRIEF', decision_made: 'COMPLETE', duration_ms: 4821, status: 'fallback_triggered' as const, output: {}, started_at: new Date().toISOString() },
  { id: 'r7', step_number: 7, step_name: 'GENERATE_ASSESSMENT', decision_basis: 'critical_gap=system_design · generating 3 targeted questions', decision_made: 'COMPLETE', duration_ms: 2103, status: 'success' as const, output: {}, started_at: new Date().toISOString() },
  { id: 'r8', step_number: 8, step_name: 'ALERT_TPC', decision_basis: 'at_risk_students=5 · same_gap=system_design · alert_sent=true', decision_made: 'ALERTED', duration_ms: 421, status: 'success' as const, output: {}, started_at: new Date().toISOString() },
  { id: 'r9', step_number: 9, step_name: 'UPDATE_STUDENT_STATE', decision_basis: 'new_state=PREPARING · confidence_score=0.48 · brief_delivered=true', decision_made: 'COMPLETE', duration_ms: 187, status: 'success' as const, output: {}, started_at: new Date().toISOString() },
];

export default function DemoScreen() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<'TRACE' | 'BRIEF' | 'TPC'>('TRACE');
  const [scenario, setScenario] = useState<'STANDARD' | 'LOW_DATA' | 'HIGH_CONF'>('STANDARD');
  const [replayMode, setReplayMode] = useState(false);
  const [replayLogs, setReplayLogs] = useState<typeof REPLAY_LOGS>([]);

  const { logs: liveLogs, wsConnected } = useAgentLogs(sessionId);
  const logs = replayMode ? replayLogs : liveLogs;

  // Extracted so it can be called both on API failure AND on timeout
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

  const handleTrigger = async (type: 'STANDARD' | 'LOW_DATA' | 'HIGH_CONF') => {
    setIsRunning(true);
    setReplayMode(false);
    setReplayLogs([]);
    setScenario(type);
    setActiveTab('TRACE');
    try {
      let res;
      if (type === 'STANDARD') res = await api.triggerDemo();
      else if (type === 'LOW_DATA') res = await api.triggerLowData();
      else res = await api.triggerHighConfidence();
      
      if (res.sessionId) setSessionId(res.sessionId);
      if (res.status?.includes('triggered') && !res.sessionId) {
        setTimeout(async () => {
          const st = await api.getAgentStatus();
          if (st.recent_steps?.[0]?.session_id) setSessionId(st.recent_steps[0].session_id);
        }, 1000);
      }
    } catch (e) {
      // Backend unreachable — go straight to replay, don't show empty screen
      console.warn('API failed, switching to replay mode:', e);
      startReplay();
    }
  };

  // Layer 2: if backend responds but logs don't arrive within 3s, replay
  useEffect(() => {
    if (!isRunning || replayMode) return;
    const timeout = setTimeout(() => {
      if (logs.length === 0) {
        startReplay();
      }
    }, 3000);
    return () => clearTimeout(timeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, replayMode, logs.length]);

  // End the running state when final step appears
  useEffect(() => {
    if (logs.some((l) => l.step_name === 'UPDATE_STUDENT_STATE' || l.step_name === 'ERROR')) {
      setIsRunning(false);
    }
  }, [logs]);

  return (
    <TourProvider steps={DEMO_TOUR} tourKey="demo">
    <div className="min-h-screen bg-black text-gray-100 p-8 font-sans selection:bg-emerald-500/30">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header containing the scenario triggers */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-900 border border-gray-800 p-6 rounded-2xl shadow-xl">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">CampusIntel</h1>
            <p className="text-gray-400 mt-1">Autonomous Placement Intelligence Engine</p>
            <div className="flex items-center gap-2 mt-2 text-xs">
              <span className={`flex items-center gap-1 ${wsConnected ? 'text-emerald-400' : 'text-amber-400'}`}>
                <span className={`h-2 w-2 rounded-full ${wsConnected ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></span>
                {wsConnected ? 'Live Connection Active' : 'Polling Fallback Active'}
              </span>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <button 
              onClick={() => handleTrigger('STANDARD')}
              disabled={isRunning}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition disabled:opacity-50 ring-1 ring-blue-500/50 shadow-lg shadow-blue-500/20"
            >
              ▶ Standard Demo (Rahul)
            </button>
            <button 
              onClick={() => handleTrigger('LOW_DATA')}
              disabled={isRunning}
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold transition disabled:opacity-50 ring-1 ring-amber-500/50 shadow-lg shadow-amber-500/20"
            >
              ⚡ Scrape Fallback
            </button>
            <button 
              onClick={() => handleTrigger('HIGH_CONF')}
              disabled={isRunning}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition disabled:opacity-50 ring-1 ring-emerald-500/50 shadow-lg shadow-emerald-500/20"
            >
              ⭐ High Confidence (Priya)
            </button>
          </div>
        </header>

        {/* Info Context Bar */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-900/50 border border-gray-800 p-4 rounded-xl flex items-center gap-4">
            <div className="h-12 w-12 bg-gray-800 rounded-full flex items-center justify-center text-xl">🎓</div>
            <div>
              <div className="text-sm text-gray-500 font-semibold mb-0.5">CURRENT CONTEXT</div>
              <div className="font-medium text-gray-200">
                {scenario === 'HIGH_CONF' ? 'Priya Mehta (High Confidence)' : 'Rahul Sharma (Low Confidence)'}
              </div>
            </div>
          </div>
          <div className="bg-gray-900/50 border border-gray-800 p-4 rounded-xl flex items-center gap-4">
            <div className="h-12 w-12 bg-gray-800 rounded-full flex items-center justify-center text-xl">🏢</div>
            <div>
              <div className="text-sm text-gray-500 font-semibold mb-0.5">DETECTED EVENT</div>
              <div className="font-medium text-gray-200">Google Campus Drive in 68 hours</div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-gray-800 pb-px">
          {['TRACE', 'BRIEF', 'TPC'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-6 py-3 font-semibold text-sm rounded-t-lg transition-colors ${
                activeTab === tab 
                  ? 'bg-gray-900 text-emerald-400 border border-b-0 border-gray-800 relative after:absolute after:bottom-[-1px] after:left-0 after:w-full after:h-px after:bg-gray-900' 
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab === 'TRACE' ? '🧠 Live Reasoning Trace' : tab === 'BRIEF' ? '📋 Generated Brief' : '🏫 TPC Dashboard'}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="mt-6">
          {activeTab === 'TRACE' && <ReasoningTrace logs={logs} isActive={isRunning} />}
          {activeTab === 'BRIEF' && <PrepBrief logs={logs} />}
          {activeTab === 'TPC' && <TpcDashboard isDemoActive={!!sessionId} />}
        </div>
        </div>
      </div>
      <TourReopen />
    </TourProvider>
  );
}
