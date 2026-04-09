'use client';
import { useState } from 'react';
import { api } from '@/lib/api';

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
};

const FEED = [
  { anon: 'CSE Student · 8.1 CGPA', company: 'Google', round: 'Technical 1', outcome: 'selected', tags: ['dp', 'graphs', 'arrays'], time: '12 min ago' },
  { anon: 'CSE Student · 7.5 CGPA', company: 'Google', round: 'System Design', outcome: 'rejected', tags: ['system_design'], time: '1 hour ago' },
  { anon: 'IT Student · 8.8 CGPA', company: 'Wipro', round: 'HR Round', outcome: 'selected', tags: ['behavioral'], time: '3 hours ago' },
  { anon: 'CSE Student · 7.8 CGPA', company: 'Amazon', round: 'Technical 2', outcome: 'waiting', tags: ['trees', 'dp'], time: '5 hours ago' },
];

// Demo autofill data
const DEMO_FILL = {
  roundType: 'technical_1',
  questionsAsked: 'Design a URL shortening service (like bit.ly). Also asked about LRU cache implementation and time complexity of my solutions.',
  topicsCovered: ['system_design', 'arrays', 'graphs'],
  outcome: 'selected',
  difficultyRating: 4,
  company: 'Google',
};

export default function DebriefPage() {
  const [form, setForm] = useState({
    roundType: 'technical_1',
    questionsAsked: '',
    topicsCovered: [] as string[],
    outcome: 'selected',
    difficultyRating: 3,
    company: 'Google',
  });

  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [showForm, setShowForm] = useState(false);

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

    setStatus('submitting');
    setErrorMsg('');

    try {
      const res = await api.submitDebrief({
        driveId: 'demo-drive-google',
        collegeId: 'college-lpu-001',
        companyId: 'company-google-001',
        roundType: form.roundType,
        questionsAsked: form.questionsAsked,
        topicsCovered: form.topicsCovered,
        outcome: form.outcome,
        difficultyRating: form.difficultyRating,
      });

      if (res.success) {
        setResult(res);
        setStatus('success');
        setShowForm(false);
      } else {
        setErrorMsg(res.error || 'Submission failed.');
        setStatus('error');
      }
    } catch {
      setErrorMsg('Could not reach server. Check that the backend is running.');
      setStatus('error');
    }
  };

  return (
    <div className="p-8 max-w-[1000px] mx-auto">
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
        <div className="mb-8 animate-fade-in-up">
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 mb-4">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">⚡</span>
              <div>
                <div className="text-lg font-bold text-white">Intel Updated!</div>
                <div className="text-sm text-emerald-400">{result.message}</div>
              </div>
            </div>
            <div className="text-xs font-mono text-indigo-400 uppercase tracking-widest mb-3">
              Re-synthesized from {result.total_debriefs} total debriefs
            </div>
            <div className="space-y-2">
              {result.synthesized_topics?.map((t: any, i: number) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs font-mono text-[#6b7280] w-4">{i + 1}</span>
                  <div className="flex-1 bg-[#1e1e30] rounded-full h-1.5">
                    <div
                      className="bg-gradient-to-r from-indigo-500 to-violet-500 h-1.5 rounded-full transition-all duration-700"
                      style={{ width: `${(t.frequency * 100).toFixed(0)}%` }}
                    />
                  </div>
                  <span className="text-sm font-mono text-[#c4c4d8] w-32">{t.topic}</span>
                  <span className="text-sm font-bold text-indigo-400">{(t.frequency * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>
          <button onClick={() => { setStatus('idle'); setResult(null); setForm({ roundType: 'technical_1', questionsAsked: '', topicsCovered: [], outcome: 'selected', difficultyRating: 3, company: 'Google' }); }}
            className="text-sm text-[#9b9bbb] hover:text-white transition">
            + Submit another debrief
          </button>
        </div>
      )}

      {/* Debrief Form Modal */}
      {showForm && status !== 'success' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}>
          <div className="w-full max-w-xl bg-[#0f0f1a] border border-[#2a2a3d] rounded-2xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar mx-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-display text-xl text-[#e8e6f8]">Submit Interview Debrief</h2>
              <button onClick={() => setShowForm(false)} className="text-[#6b7280] hover:text-white transition text-xl">×</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
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
                  <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Re-synthesizing Intel...</>
                ) : '⚡ Submit & Update Intel'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Feed */}
      <h2 className="font-display text-xl text-[#e8e6f8] mb-4">Recent Debriefs from LPU</h2>
      <div className="space-y-3">
        {FEED.map((f, i) => (
          <div key={i} className="card-dark rounded-xl p-4 flex items-start gap-4 hover:border-indigo-500/20 transition">
            <div className="w-8 h-8 rounded-full bg-[#1a1a2e] border border-[#2a2a3d] flex items-center justify-center text-[10px] text-[#6b7280] flex-shrink-0 mt-0.5">🎓</div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-[#6b7280] mb-1">{f.anon}</div>
              <div className="text-sm text-[#c4c4d8]">{f.company} · {f.round}</div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {f.tags.map(t => <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-[#1a1a2e] border border-[#2a2a3d] text-[#9b9bbb]">#{t}</span>)}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${OUTCOME_STYLE[f.outcome]}`}>{f.outcome}</span>
              <span className="text-[11px] text-[#4b4b6b]">{f.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
