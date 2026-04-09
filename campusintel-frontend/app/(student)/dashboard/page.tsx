'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { TourProvider, TourReopen } from '@/components/tour/TourProvider';


// Static demo data
const RECENT_AGENT_ACTIONS = [
  { color: 'bg-violet-500', text: 'Generated your Google prep brief — 6 topics, 28hr plan', time: '2 min ago' },
  { color: 'bg-blue-500', text: 'Checked 8 LPU debriefs + 15 external sources for Google', time: '2 min ago' },
  { color: 'bg-amber-500', text: 'Flagged system_design as CRITICAL gap — enrolled you in TPC session', time: '3 min ago' },
  { color: 'bg-emerald-500', text: 'TPC alerted about 5 students with same gap', time: '4 min ago' },
];

const SKILLS = [
  { name: 'DSA', level: 0.55, required: 0.8, status: 'MODERATE' },
  { name: 'System Design', level: 0.15, required: 0.75, status: 'CRITICAL' },
  { name: 'DBMS', level: 0.70, required: 0.65, status: 'OK' },
  { name: 'OS', level: 0.60, required: 0.6, status: 'OK' },
  { name: 'SQL', level: 0.80, required: 0.7, status: 'OK' },
  { name: 'Behavioral', level: 0.65, required: 0.7, status: 'MODERATE' },
];

const QUICK_STATS = [
  { label: 'Briefs Generated', value: '3', icon: '📋', sub: 'Last: Google — 2 min ago' },
  { label: 'Debriefs Shared', value: '2', icon: '🤝', sub: "You've helped 847 students" },
  { label: 'Placement Score', value: '0.48', icon: '📊', sub: '↑ +0.1 this week', trend: true },
];

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
        <span className="font-display text-lg leading-none" style={{ color }}>{score}</span>
      </div>
    </div>
  );
}

const DASHBOARD_TOUR = [
  {
    title: 'Your Placement Readiness Score',
    body: 'This number (0.48) was calculated by the AI — it compared your skill levels against what Google actually tests at LPU, based on 8 verified debriefs from your campus. You didn\'t enter anything. It figured this out automatically.',
    highlight: 'tour-readiness-score'
  },
  {
    title: 'Why is System Design CRITICAL?',
    body: 'Google tests System Design in 75% of LPU interviews. Your current level is 15%. That gap is flagged CRITICAL because it\'s both high-frequency and high-risk. DSA is MODERATE — important but less urgent.',
    highlight: 'tour-skills-breakdown'
  },
  {
    title: 'What the AI is doing for you',
    body: 'This feed shows 4 actions the agent took — without you asking. It checked debriefs, calculated your score, generated a brief, and alerted TPC about 5 students with the same gap. All autonomous.',
    highlight: 'tour-agent-activity'
  },
  {
    title: 'The debrief popup',
    body: 'After your interview, CampusIntel asks one question. 90 seconds of your time. That answer gets anonymized and added to the intelligence pool — helping every student who interviews at the same company after you.',
  },
  {
    title: 'Navigate to Campus Pulse →',
    body: 'Click 🌐 Campus Pulse in the sidebar to see the living network — every student, every company, every debrief, flowing in real time. That\'s the best place to understand how CampusIntel works at a glance.',
    highlight: 'nav-pulse'
  },
];

export default function DashboardPage() {
  const [showPopup, setShowPopup] = useState(false);
  const [popupStep, setPopupStep] = useState<'prompt' | 'debrief'>('prompt');

  useEffect(() => {
    // Only show popup if it hasn't been dismissed today
    const dismissed = localStorage.getItem('interview_popup_dismissed');
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
    if (!dismissed || parseInt(dismissed) < twoHoursAgo) {
      setShowPopup(true);
    }
  }, []);

  const dismissPopup = () => {
    localStorage.setItem('interview_popup_dismissed', Date.now().toString());
    setShowPopup(false);
  };

  return (
    <TourProvider steps={DASHBOARD_TOUR} tourKey="dashboard">
      <div className="relative min-h-screen p-8">
      {/* Background radial pulse */}
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
                  You had a Google drive today. Share what happened — it helps 847 students who interview next.
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
                <p className="text-[#6b7280] text-xs mb-5">This gets anonymized and helps future students</p>

                <div className="space-y-4">
                  <div className="flex gap-2 flex-wrap">
                    {['Online Test', 'Technical 1', 'Technical 2', 'System Design', 'HR'].map(r => (
                      <button key={r}
                        className="px-3 py-1.5 text-xs rounded-full border border-[#2a2a3d] text-[#9b9bbb] hover:border-indigo-500/60 hover:text-indigo-300 transition">
                        {r}
                      </button>
                    ))}
                  </div>
                  <textarea
                    rows={4}
                    placeholder="What questions did they ask? Topics covered, difficulty, anything you remember..."
                    className="w-full bg-[#0a0a14] border border-[#2a2a3d] rounded-xl p-3 text-sm text-[#e8e6f8] placeholder:text-[#4b4b6b] outline-none focus:border-indigo-500/60 resize-none transition" />
                  <div className="flex gap-3">
                    {['Got through ✓', 'Rejected ✗', 'Waiting...'].map(o => (
                      <button key={o}
                        className="flex-1 py-2 text-xs rounded-lg border border-[#2a2a3d] text-[#6b7280] hover:border-indigo-500/40 hover:text-indigo-300 transition">
                        {o}
                      </button>
                    ))}
                  </div>
                  <button onClick={dismissPopup}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition">
                    Submit Debrief →
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="max-w-[1200px] mx-auto space-y-6 relative z-10">
        {/* Hero row */}
        <div className="grid grid-cols-[55%_1fr] gap-6">
          {/* Readiness Card */}
          <div className="card-dark rounded-2xl p-7">
            <div className="flex justify-between items-start mb-5">
              <div>
                <div className="text-[11px] uppercase tracking-widest text-[#6b7280] font-semibold mb-1">Your Placement Readiness</div>
              </div>
              <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                <span className="relative w-2 h-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-500" />
                </span>
                LIVE
              </span>
            </div>

            <div id="tour-readiness-score" className="flex items-end gap-6 mb-6 rounded-2xl p-2">
              <ReadinessRing score={0.48} />
              <div>
                <div className="font-display text-5xl text-amber-400 leading-none">0.48</div>
                <div className="text-[12px] text-[#6b7280] mt-2">Calculated 2 min ago · Google Drive in 68h</div>
              </div>
            </div>

            <div id="tour-skills-breakdown" className="space-y-2.5 rounded-xl p-2">
              {SKILLS.map(skill => (
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

            <div className="mt-5 flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs text-indigo-300"
                style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)' }}>
                <img src="https://logo.clearbit.com/google.com" alt="Google" className="w-4 h-4 rounded-sm" onError={(e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.style.display = 'none'; }} />
                Google Drive — 68 hours
              </div>
              <Link href="/briefs/demo-drive-google"
                className="px-3 py-1.5 rounded-full text-xs text-white bg-indigo-600 hover:bg-indigo-500 transition">
                View Brief →
              </Link>
            </div>
          </div>

          {/* Upcoming Drives */}
          <div className="card-dark rounded-2xl p-6">
            <div className="text-[11px] uppercase tracking-widest text-[#6b7280] font-semibold mb-5">Upcoming Drives</div>
            <div className="space-y-3">
              {[
                { co: 'Google', logo: 'google.com', date: 'Apr 11 · 68 hours', status: 'Registered', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
                { co: 'Infosys', logo: 'infosys.com', date: 'Apr 15 · 5 days', status: 'Registered', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
                { co: 'Wipro', logo: 'wipro.com', date: 'Apr 18 · 8 days', status: 'Not Registered', color: 'text-[#6b7280] bg-transparent border-[#3a3a4d]' },
              ].map(d => (
                <div key={d.co} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-[#2a2a3d] hover:bg-white/[0.06] transition">
                  <img src={`https://logo.clearbit.com/${d.logo}`} alt={d.co}
                    className="w-8 h-8 rounded-lg bg-[#2a2a3d]"
                    onError={(e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.style.display = 'none'; }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[#e8e6f8]">{d.co}</div>
                    <div className="text-[11px] text-[#6b7280]">{d.date}</div>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${d.color}`}>{d.status}</span>
                </div>
              ))}
            </div>
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
            <div className="space-y-4">
              {RECENT_AGENT_ACTIONS.map((a, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full ${a.color} mt-1.5 flex-shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#c4c4d8] leading-snug">{a.text}</p>
                    <p className="text-[11px] text-[#4b4b6b] mt-0.5">{a.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <Link href="/demo"
              className="block text-xs text-indigo-400 hover:text-indigo-300 transition mt-5 pt-4 border-t border-[#2a2a3d]">
              See full reasoning trace →
            </Link>
          </div>

          {/* Quick Stats */}
          <div className="space-y-3">
            {QUICK_STATS.map(s => (
              <div key={s.label} className="card-dark rounded-xl p-4 flex items-center gap-4">
                <span className="text-2xl">{s.icon}</span>
                <div className="flex-1">
                  <div className="text-[11px] uppercase tracking-wider text-[#6b7280]">{s.label}</div>
                  <div className="font-display text-2xl text-[#e8e6f8] mt-0.5">{s.value}</div>
                  <div className={`text-[11px] mt-0.5 ${s.trend ? 'text-emerald-400' : 'text-[#6b7280]'}`}>{s.sub}</div>
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
