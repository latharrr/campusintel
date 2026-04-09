'use client';
import { useState } from 'react';

const PAST_DEBRIEFS = [
  { company: 'Infosys', round: 'Technical Round 1', outcome: 'Selected', tags: ['DSA', 'Arrays', 'OOP'], date: '2 weeks ago' },
];

const FEED = [
  { anon: 'CSE Student · 8.1 CGPA', company: 'Google', round: 'Technical 1', outcome: 'Selected', tags: ['DP', 'Graphs', 'Arrays'], time: '12 min ago' },
  { anon: 'CSE Student · 7.5 CGPA', company: 'Google', round: 'System Design', outcome: 'Rejected', tags: ['System Design', 'HLD'], time: '1 hour ago' },
  { anon: 'IT Student · 8.8 CGPA', company: 'Wipro', round: 'HR Round', outcome: 'Selected', tags: ['Behavioral', 'Leadership'], time: '3 hours ago' },
  { anon: 'CSE Student · 7.8 CGPA', company: 'Amazon', round: 'Technical 2', outcome: 'Waiting', tags: ['Trees', 'DP', 'LLD'], time: '5 hours ago' },
];

const OUTCOME_STYLE: Record<string, string> = {
  'Selected': 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
  'Rejected': 'bg-red-500/10 border-red-500/30 text-red-400',
  'Waiting': 'bg-amber-500/10 border-amber-500/30 text-amber-400',
};

export default function DebriefPage() {
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [outcome, setOutcome] = useState('');
  const [text, setText] = useState('');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [localDebriefs, setLocalDebriefs] = useState(PAST_DEBRIEFS);

  const tags = ['#Arrays', '#DP', '#System Design', '#SQL', '#Behavioral', '#OS', '#Graphs', '#Trees', '#DBMS'];

  const toggleTag = (t: string) => setSelected(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);

  return (
    <div className="p-8 max-w-[1000px] mx-auto">
      {/* Hero CTA */}
      <div className="rounded-2xl p-8 mb-8 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #312e81, #4c1d95, #1e1b4b)', border: '1px solid rgba(139,92,246,0.3)' }}>
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full"
          style={{ background: 'radial-gradient(ellipse, rgba(167,139,250,0.2) 0%, transparent 70%)' }} />
        <h1 className="font-display text-3xl text-white mb-2 relative">Your experience helps the next student</h1>
        <p className="text-[#c4b5fd] text-sm relative max-w-lg">
          Every debrief you share gets anonymized and synthesized into the intelligence that powers CampusIntel for 847 students at LPU.
        </p>
        <button onClick={() => setStep(1)}
          className="mt-6 px-6 py-3 bg-white text-indigo-900 rounded-xl text-sm font-bold hover:bg-indigo-50 transition relative">
          Share Debrief →
        </button>
      </div>

      {/* Debrief modal */}
      {step > 0 && !submitted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-[520px] bg-[#0f0f1a] border border-[#2a2a3d] rounded-2xl p-8 shadow-2xl">
            {/* Progress */}
            <div className="flex gap-1.5 mb-6">
              {[1, 2, 3, 4].map(s => (
                <div key={s} className={`flex-1 h-1 rounded-full transition-all ${step >= s ? 'bg-indigo-500' : 'bg-[#2a2a3d]'}`} />
              ))}
            </div>

            {step === 1 && (
              <>
                <h2 className="font-display text-xl text-[#e8e6f8] mb-5">Where did you interview?</h2>
                <div className="space-y-4">
                  <div>
                    <div className="text-xs text-[#6b7280] mb-2">Company Name</div>
                    <input type="text" value={company} onChange={e => setCompany(e.target.value)} placeholder="e.g. Google, Atlassian, Microsoft" className="w-full bg-[#0a0a14] border border-[#2a2a3d] rounded-xl p-3 text-sm text-[#e8e6f8] outline-none focus:border-indigo-500/60" />
                  </div>
                  <div>
                    <div className="text-xs text-[#6b7280] mb-2">Position / Role</div>
                    <input type="text" value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. SDE-1, Data Analyst Intern" className="w-full bg-[#0a0a14] border border-[#2a2a3d] rounded-xl p-3 text-sm text-[#e8e6f8] outline-none focus:border-indigo-500/60" />
                  </div>
                  <button onClick={() => setStep(2)} disabled={!company || !role} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition mt-2">
                    Next →
                  </button>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <h2 className="font-display text-xl text-[#e8e6f8] mb-5">Which round was this?</h2>
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {['Online Test', 'Technical 1', 'Technical 2', 'System Design', 'HR', 'Managerial'].map(r => (
                      <button key={r} onClick={() => {}}
                        className="px-3 py-1.5 text-xs rounded-full border border-[#2a2a3d] text-[#9b9bbb] hover:border-indigo-500/60 hover:text-indigo-300 transition">
                        {r}
                      </button>
                    ))}
                  </div>
                  <div>
                    <div className="text-xs text-[#6b7280] mb-2">Outcome</div>
                    <div className="flex gap-2">
                      {['Got through', 'Rejected', 'Waiting...'].map(o => (
                        <button key={o}
                          onClick={() => setOutcome(o)}
                          className={`flex-1 py-2 text-xs rounded-lg border transition ${
                            outcome === o ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300' : 'border-[#2a2a3d] text-[#6b7280] hover:border-indigo-500/40'
                          }`}>{o}</button>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => setStep(3)} disabled={!outcome}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition">
                    Next →
                  </button>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <h2 className="font-display text-xl text-[#e8e6f8] mb-5">What happened inside?</h2>
                <div className="space-y-4">
                  <div className="relative">
                    <textarea
                      value={text}
                      onChange={e => setText(e.target.value)}
                      maxLength={1000}
                      rows={5}
                      placeholder="Describe the questions they asked, topics covered, difficulty level... anything you remember. The AI will extract the useful patterns."
                      className="w-full bg-[#0a0a14] border border-[#2a2a3d] rounded-xl p-3 text-sm text-[#e8e6f8] placeholder:text-[#4b4b6b] outline-none focus:border-indigo-500/60 resize-none transition" />
                    <span className="absolute bottom-2 right-3 text-[10px] text-[#4b4b6b]">{text.length} / 1000</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {tags.map(t => (
                      <button key={t}
                        onClick={() => toggleTag(t)}
                        className={`px-3 py-1 text-xs rounded-full border transition ${
                          selected.includes(t) ? 'border-indigo-500 bg-indigo-500/15 text-indigo-300' : 'border-[#2a2a3d] text-[#6b7280] hover:border-indigo-500/40'
                        }`}>{t}</button>
                    ))}
                  </div>
                  <button onClick={() => setStep(4)} disabled={!text} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition">Next →</button>
                </div>
              </>
            )}

            {step === 4 && (
              <>
                <h2 className="font-display text-xl text-[#e8e6f8] mb-5">What made the difference?</h2>
                <div className="space-y-4">
                  <textarea rows={3} placeholder="What helped you (if selected)..." 
                    className="w-full bg-[#0a0a14] border border-[#2a2a3d] focus:border-emerald-500/60 rounded-xl p-3 text-sm text-[#e8e6f8] placeholder:text-[#4b4b6b] outline-none resize-none transition" />
                  <textarea rows={3} placeholder="What hurt you (if rejected)..."
                    className="w-full bg-[#0a0a14] border border-[#2a2a3d] focus:border-amber-500/60 rounded-xl p-3 text-sm text-[#e8e6f8] placeholder:text-[#4b4b6b] outline-none resize-none transition" />
                  <button onClick={() => {
                    setLocalDebriefs([{ company: company || 'Unknown', round: role || 'Round', outcome: outcome || 'Waiting', tags: selected.slice(0,3), date: 'Just now' }, ...localDebriefs]);
                    setSubmitted(true);
                  }} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition">
                    Submit Debrief →
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Submit success */}
      {submitted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-[420px] bg-[#0f0f1a] border border-[#2a2a3d] rounded-2xl p-10 text-center shadow-2xl">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="font-display text-2xl text-[#e8e6f8] mb-2">Debrief saved.</h2>
            <p className="text-emerald-400 font-semibold mb-1">You just helped 847 students.</p>
            <p className="text-[#6b7280] text-sm mb-6">The AI extracted your insights and added them to LPU&apos;s Google intelligence pool.</p>
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              {selected.slice(0, 4).map(t => (
                <span key={t} className="px-3 py-1 text-xs rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300">{t}</span>
              ))}
            </div>
            <button onClick={() => { setSubmitted(false); setStep(0); }}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition">
              Done
            </button>
          </div>
        </div>
      )}

      {/* Past debriefs */}
      <div className="mb-8">
        <h2 className="font-display text-xl text-[#e8e6f8] mb-4">Your Debriefs</h2>
        {localDebriefs.map((d, i) => (
          <div key={i} className="card-dark rounded-xl p-4 flex items-center gap-4">
            <div className="flex-1">
              <div className="font-medium text-[#e8e6f8]">{d.company} · {d.round}</div>
              <div className="text-xs text-[#6b7280] mt-0.5">{d.date}</div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {d.tags.map(t => <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-[#1a1a2e] border border-[#2a2a3d] text-[#9b9bbb]">{t}</span>)}
            </div>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${OUTCOME_STYLE[d.outcome]}`}>{d.outcome}</span>
          </div>
        ))}
      </div>

      {/* College feed */}
      <h2 className="font-display text-xl text-[#e8e6f8] mb-4">Recent Debriefs from LPU</h2>
      <div className="space-y-3">
        {FEED.map((f, i) => (
          <div key={i} className="card-dark rounded-xl p-4 flex items-start gap-4 hover:border-indigo-500/20 transition">
            <div className="w-8 h-8 rounded-full bg-[#1a1a2e] border border-[#2a2a3d] flex items-center justify-center text-[10px] text-[#6b7280] flex-shrink-0 mt-0.5">
              🎓
            </div>
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
