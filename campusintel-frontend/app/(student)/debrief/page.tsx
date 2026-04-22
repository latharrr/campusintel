'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { getStudent } from '@/lib/auth';

const ROUND_TYPES = [
  { value: 'online_test', label: '💻 Online Test / OA' },
  { value: 'technical_1', label: '🔧 Technical Round 1' },
  { value: 'technical_2', label: '🔧 Technical Round 2' },
  { value: 'system_design', label: '🏗️ System Design' },
  { value: 'hr', label: '🤝 HR Round' },
  { value: 'managerial', label: '📊 Managerial Round' },
  { value: 'group_discussion', label: '🗣️ Group Discussion' },
];

const TOPIC_OPTIONS = [
  'arrays', 'linked_lists', 'trees', 'graphs', 'dp', 'system_design',
  'dbms', 'os', 'networking', 'oops', 'sql', 'behavioral',
  'aptitude', 'verbal', 'python', 'java', 'javascript', 'cpp',
];

const OUTCOME_STYLE: Record<string, string> = {
  selected: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
  rejected: 'bg-red-500/10 border-red-500/30 text-red-400',
  waiting: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
  withdrew: 'bg-[#2a2a3d] border-[#3a3a4d] text-[#6b7280]',
};

// Demo autofill
const DEMO_FILL = {
  roundType: 'technical_1',
  questionsAsked: 'Design a URL shortening service (like bit.ly). Also asked about LRU cache implementation and time complexity of my solutions.',
  topicsCovered: ['system_design', 'arrays', 'graphs'],
  outcome: 'selected',
  difficultyRating: 4,
};

export default function DebriefPage() {
  const [form, setForm] = useState({
    roundType: 'technical_1',
    questionsAsked: '',
    topicsCovered: [] as string[],
    outcome: 'selected',
    difficultyRating: 3,
    selectedDriveId: '',
    selectedCompanyId: '',
  });

  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [recentDebriefs, setRecentDebriefs] = useState<any[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [studentInfo, setStudentInfo] = useState<{ id: string; name: string; college_id: string } | null>(null);
  const [registeredDrives, setRegisteredDrives] = useState<any[]>([]);

  // Load student info + their registered drives + recent debriefs
  useEffect(() => {
    const stored = getStudent();
    if (stored) {
      setStudentInfo({ id: stored.id, name: stored.name, college_id: stored.college_id });
    }

    const load = async () => {
      try {
        const collegeId = stored?.college_id || 'college-lpu-001';

        // Load registered drives for this student
        if (stored?.id) {
          const regs = await api.getStudentRegistrations(stored.id);
          if (Array.isArray(regs) && regs.length > 0) {
            const drives = regs
              .filter(r => r.campus_drives)
              .map(r => ({
                id: r.drive_id,
                companyId: r.campus_drives?.company_id || '',
                companyName: r.campus_drives?.companies?.name || r.campus_drives?.company_id || 'Unknown',
              }));
            setRegisteredDrives(drives);
            // Pre-select first registered drive
            if (drives.length > 0) {
              setForm(f => ({ ...f, selectedDriveId: drives[0].id, selectedCompanyId: drives[0].companyId }));
            }
          }
        }

        // Load recent debriefs for the college
        const payload = await api.getDebriefs(collegeId, 'company-google-001');
        const list = Array.isArray(payload) ? payload : (payload?.data || []);
        if (Array.isArray(list)) setRecentDebriefs(list.slice(0, 10));
      } catch (e) {
        console.warn('[Debrief feed] failed to load:', e);
      } finally {
        setFeedLoading(false);
      }
    };
    load();
  }, []);

  const toggleTopic = (topic: string) => {
    setForm(f => ({
      ...f,
      topicsCovered: f.topicsCovered.includes(topic)
        ? f.topicsCovered.filter(t => t !== topic)
        : [...f.topicsCovered, topic],
    }));
  };

  const autofillDemo = () => {
    setForm(f => ({ ...f, ...DEMO_FILL }));
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.questionsAsked.trim()) {
      setErrorMsg('Please describe at least one question asked.');
      return;
    }
    if (form.topicsCovered.length === 0) {
      setErrorMsg('Please select at least one topic covered.');
      return;
    }

    // Guard: must be logged in
    const stored = getStudent();
    if (!stored?.id) {
      setErrorMsg('You must be logged in to submit a debrief.');
      return;
    }

    setStatus('submitting');
    setErrorMsg('');

    try {
      const driveId = form.selectedDriveId || registeredDrives[0]?.id || 'demo-drive-google';
      const companyId = form.selectedCompanyId || registeredDrives[0]?.companyId || 'company-google-001';

      const res = await api.submitDebrief({
        driveId,
        collegeId: stored.college_id || 'college-lpu-001',
        companyId,
        roundType: form.roundType,
        questionsAsked: form.questionsAsked,
        topicsCovered: form.topicsCovered,
        outcome: form.outcome,
        difficultyRating: form.difficultyRating,
        studentId: stored.id,
      });

      if (res.success) {
        setResult(res);
        setStatus('success');
        setShowForm(false);

        // Notify dashboard to refresh
        window.dispatchEvent(new CustomEvent('ci:debrief-submitted', {
          detail: { studentId: stored.id, totalDebriefs: res.total_debriefs }
        }));

        // Reload the feed
        const updated = await api.getDebriefs(stored.college_id || 'college-lpu-001', 'company-google-001');
        const updatedList = Array.isArray(updated) ? updated : (updated?.data || []);
        if (Array.isArray(updatedList)) setRecentDebriefs(updatedList.slice(0, 10));
      } else {
        setErrorMsg(res.error || 'Submission failed.');
        setStatus('error');
      }
    } catch {
      setErrorMsg('Could not reach server. Please try again in a moment.');
      setStatus('error');
    }
  };

  return (
    <div className="p-8 max-w-[1000px] mx-auto">

      {/* Logged-in user badge */}
      {studentInfo && (
        <div className="mb-6 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-indigo-500/5 border border-indigo-500/20 w-fit">
          <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {studentInfo.name[0].toUpperCase()}
          </div>
          <span className="text-xs text-[#9b9bbb]">
            Submitting as <span className="text-indigo-300 font-semibold">{studentInfo.name}</span>
            <span className="text-[#4b4b6b] ml-2">· Saved to your profile</span>
          </span>
        </div>
      )}

      {/* Hero CTA */}
      <div className="rounded-2xl p-8 mb-8 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #312e81, #4c1d95, #1e1b4b)', border: '1px solid rgba(139,92,246,0.3)' }}>
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full"
          style={{ background: 'radial-gradient(ellipse, rgba(167,139,250,0.2) 0%, transparent 70%)' }} />
        <h1 className="font-display text-3xl text-white mb-2 relative">Your experience helps the next student</h1>
        <p className="text-[#c4b5fd] text-sm relative max-w-lg">
          Every debrief you share is synthesized into the intelligence that powers CampusIntel for every student at LPU.
          The agent re-processes topics within seconds of your submission.
        </p>
        <div className="flex gap-3 mt-6">
          <button onClick={() => setShowForm(true)}
            className="px-6 py-3 bg-white text-indigo-900 rounded-xl text-sm font-bold hover:bg-indigo-50 transition relative">
            Share Debrief →
          </button>
          <button onClick={autofillDemo}
            className="px-6 py-3 bg-indigo-600/40 border border-indigo-400/40 text-indigo-200 rounded-xl text-sm font-semibold hover:bg-indigo-600/60 transition">
            🎬 Autofill Demo
          </button>
        </div>
      </div>

      {/* Success Banner */}
      {status === 'success' && result && (
        <div className="mb-8 animate-fade-in-up space-y-4">
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">⚡</span>
              <div>
                <div className="text-lg font-bold text-white">Intel Updated!</div>
                <div className="text-sm text-emerald-400">{result.message}</div>
              </div>
              <div className="ml-auto text-right">
                <div className="text-2xl font-display font-bold text-white">{result.total_debriefs}</div>
                <div className="text-xs text-[#6b7280]">total debriefs</div>
              </div>
            </div>

            {/* Saved-to-DB confirmation */}
            <div className="mb-4 flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-3 py-2">
              <span>✓</span>
              <span>Saved to Supabase · Attributed to <strong>{studentInfo?.name || 'you'}</strong> · Dashboard refreshed automatically</span>
            </div>

            <div className="text-xs font-mono text-indigo-400 uppercase tracking-widest mb-3">
              Live Intelligence — Re-synthesized from {result.total_debriefs} debriefs
            </div>
            <div className="space-y-2">
              {result.synthesized_topics?.map((t: any, i: number) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs font-mono text-[#6b7280] w-4">{i + 1}</span>
                  <div className="flex-1 bg-[#1e1e30] rounded-full h-1.5">
                    <div className="bg-gradient-to-r from-indigo-500 to-violet-500 h-1.5 rounded-full transition-all duration-700"
                      style={{ width: `${(t.frequency * 100).toFixed(0)}%` }} />
                  </div>
                  <span className="text-sm font-mono text-[#c4c4d8] w-32">{t.topic}</span>
                  <span className="text-sm font-bold text-indigo-400">{(t.frequency * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Before / After */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
              <div className="flex items-center gap-2 text-xs text-red-400 font-mono uppercase tracking-widest mb-3">
                <span>✕</span> Before This Debrief
              </div>
              <ul className="space-y-2 text-xs text-[#6b7280]">
                <li>• &ldquo;Focus on DSA basics&rdquo; (generic)</li>
                <li>• No company-specific context</li>
                <li>• Based on stale internet lists</li>
                <li>• Confidence: <span className="text-red-400 font-semibold">LOW</span></li>
              </ul>
            </div>
            <div className="bg-emerald-500/5 border border-emerald-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 text-xs text-emerald-400 font-mono uppercase tracking-widest mb-3">
                <span>→</span> After Your Debrief
              </div>
              <ul className="space-y-2 text-xs text-[#c4c4d8]">
                {result.synthesized_topics?.slice(0, 3).map((t: any) => (
                  <li key={t.topic}>• <span className="font-mono">{t.topic}</span> — {(t.frequency * 100).toFixed(0)}% of rounds</li>
                ))}
                <li>• Confidence: <span className={`font-semibold ${result.total_debriefs >= 5 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {result.total_debriefs >= 10 ? 'HIGH' : result.total_debriefs >= 5 ? 'MEDIUM' : 'LOW → BUILDING'}
                </span></li>
              </ul>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button onClick={() => { setStatus('idle'); setResult(null); setForm({ roundType: 'technical_1', questionsAsked: '', topicsCovered: [], outcome: 'selected', difficultyRating: 3 }); }}
              className="text-sm text-[#9b9bbb] hover:text-white transition">
              + Submit another debrief
            </button>
            <a href="/demo" className="text-sm px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition">
              🧠 Run Agent with Updated Intel →
            </a>
          </div>
        </div>
      )}

      {/* Debrief Form Modal */}
      {showForm && status !== 'success' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}>
          <div className="w-full max-w-xl bg-[#0f0f1a] border border-[#2a2a3d] rounded-2xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar mx-4">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="font-display text-xl text-[#e8e6f8]">Submit Interview Debrief</h2>
                {studentInfo && (
                  <p className="text-xs text-[#6b7280] mt-1">
                    Saving as <span className="text-indigo-300">{studentInfo.name}</span>
                  </p>
                )}
              </div>
              <button onClick={() => setShowForm(false)} className="text-[#6b7280] hover:text-white transition text-xl">×</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Drive Selector — only if student has registrations */}
              {registeredDrives.length > 0 && (
                <div>
                  <div className="text-xs text-[#6b7280] mb-2 font-semibold uppercase tracking-wider">Which Drive?</div>
                  <div className="flex flex-wrap gap-2">
                    {registeredDrives.map(d => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, selectedDriveId: d.id, selectedCompanyId: d.companyId }))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition border ${
                          form.selectedDriveId === d.id
                            ? 'bg-indigo-600/20 border-indigo-500/60 text-indigo-300'
                            : 'border-[#2a2a3d] text-[#8b8b9f] hover:border-indigo-500/40'
                        }`}
                      >
                        {d.companyName}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Round Type */}
              <div>
                <div className="text-xs text-[#6b7280] mb-2 font-semibold uppercase tracking-wider">Round Type</div>
                <div className="grid grid-cols-2 gap-2">
                  {ROUND_TYPES.map(r => (
                    <button key={r.value} type="button" onClick={() => setForm(f => ({ ...f, roundType: r.value }))}
                      className={`text-left px-3 py-2 rounded-lg text-xs font-medium transition border ${form.roundType === r.value ? 'bg-indigo-600/20 border-indigo-500/60 text-indigo-300' : 'border-[#2a2a3d] text-[#8b8b9f] hover:border-indigo-500/40'}`}>
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Questions */}
              <div>
                <div className="text-xs text-[#6b7280] mb-2 font-semibold uppercase tracking-wider">Questions Asked</div>
                <textarea value={form.questionsAsked} onChange={e => setForm(f => ({ ...f, questionsAsked: e.target.value }))}
                  placeholder="e.g., Design a URL shortening service. Also asked about LRU cache..."
                  rows={3} className="w-full bg-[#0a0a14] border border-[#2a2a3d] rounded-xl px-4 py-3 text-sm text-[#e8e6f8] placeholder-[#4b4b6b] focus:outline-none focus:border-indigo-500/60 resize-none" />
              </div>

              {/* Topics */}
              <div>
                <div className="text-xs text-[#6b7280] mb-2 font-semibold uppercase tracking-wider">Topics Covered</div>
                <div className="flex flex-wrap gap-2">
                  {TOPIC_OPTIONS.map(t => (
                    <button key={t} type="button" onClick={() => toggleTopic(t)}
                      className={`px-3 py-1 rounded-full text-xs font-mono transition border ${form.topicsCovered.includes(t) ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300' : 'border-[#2a2a3d] text-[#6b7280] hover:border-indigo-500/40'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Outcome + Difficulty */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-[#6b7280] mb-2 font-semibold uppercase tracking-wider">Outcome</div>
                  <div className="space-y-1.5">
                    {[{ v: 'selected', l: '✅ Selected' }, { v: 'rejected', l: '❌ Rejected' }, { v: 'waiting', l: '⏳ Waiting' }].map(o => (
                      <button key={o.v} type="button" onClick={() => setForm(f => ({ ...f, outcome: o.v }))}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs transition border ${form.outcome === o.v ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-300' : 'border-[#2a2a3d] text-[#8b8b9f]'}`}>
                        {o.l}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-[#6b7280] mb-2 font-semibold uppercase tracking-wider">Difficulty (1–5)</div>
                  <div className="flex flex-col gap-1.5">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button key={n} type="button" onClick={() => setForm(f => ({ ...f, difficultyRating: n }))}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition border ${form.difficultyRating === n ? 'bg-violet-500/10 border-violet-500/40 text-violet-300' : 'border-[#2a2a3d] text-[#6b7280]'}`}>
                        <span className="font-bold">{n}</span> {'★'.repeat(n)}{'☆'.repeat(5 - n)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {errorMsg && <div className="text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/30">⚠️ {errorMsg}</div>}

              <button type="submit" disabled={status === 'submitting'}
                className="w-full py-3 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition disabled:opacity-50 flex items-center justify-center gap-2">
                {status === 'submitting' ? (
                  <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Saving to Database...</>
                ) : '⚡ Submit & Update Intel'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Live Feed */}
      <h2 className="font-display text-xl text-[#e8e6f8] mb-4">Recent Debriefs from LPU</h2>
      {feedLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-[#2a2a3d] animate-pulse rounded-xl" />
          ))}
        </div>
      ) : recentDebriefs.length > 0 ? (
        <div className="space-y-3">
          {recentDebriefs.map((f, i) => (
            <div key={f.id || i} className="card-dark rounded-xl p-4 flex items-start gap-4 hover:border-indigo-500/20 transition">
              <div className="w-8 h-8 rounded-full bg-[#1a1a2e] border border-[#2a2a3d] flex items-center justify-center text-[10px] text-[#6b7280] flex-shrink-0 mt-0.5">🎓</div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-[#6b7280] mb-1">Anonymous · {f.round_type?.replace(/_/g, ' ') || 'Unknown Round'}</div>
                <div className="text-sm text-[#c4c4d8]">Google · Difficulty {f.difficulty_rating || 3}/5</div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {(f.topics_covered || []).map((t: string) => (
                    <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-[#1a1a2e] border border-[#2a2a3d] text-[#9b9bbb]">#{t}</span>
                  ))}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${OUTCOME_STYLE[f.outcome] || OUTCOME_STYLE.waiting}`}>
                  {f.outcome}
                </span>
                <span className="text-[11px] text-[#4b4b6b]">
                  {f.created_at ? new Date(f.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : '–'}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-[#4b4b6b]">
          <p>No debriefs yet. Be the first to share your experience!</p>
        </div>
      )}
    </div>
  );
}
