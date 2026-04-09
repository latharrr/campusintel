'use client';

const MILESTONES = [
  { label: 'Profile Created', done: true, date: 'Apr 8' },
  { label: 'Skills Assessed', done: true, date: 'Apr 8' },
  { label: 'First Brief Delivered', done: true, date: 'Apr 9' },
  { label: 'First Debrief Shared', done: true, date: 'Apr 9' },
  { label: 'Interview Ready', done: false, date: '—' },
  { label: 'Post-Interview', done: false, date: '—' },
];

const SKILL_HISTORY = [
  { week: 'Week 1', score: 0.32 },
  { week: 'Week 2', score: 0.38 },
  { week: 'Week 3', score: 0.44 },
  { week: 'Now', score: 0.48 },
];

export default function ProgressPage() {
  const maxScore = 1;
  const barHeight = 80;

  return (
    <div className="p-8 max-w-[900px] mx-auto space-y-8">
      <div>
        <h1 className="font-display text-3xl text-[#e8e6f8]">My Progress</h1>
        <p className="text-[#6b7280] text-sm mt-1">Your placement readiness journey</p>
      </div>

      {/* State machine progress */}
      <div className="card-dark rounded-2xl p-6">
        <div className="text-[11px] uppercase tracking-widest text-[#6b7280] font-semibold mb-6">Placement Journey</div>
        <div className="flex items-start gap-0">
          {MILESTONES.map((m, i) => (
            <div key={i} className="flex-1 flex flex-col items-center relative">
              {/* Connector line */}
              {i < MILESTONES.length - 1 && (
                <div className={`absolute top-3.5 left-1/2 w-full h-0.5 ${m.done ? 'bg-indigo-500' : 'bg-[#2a2a3d]'}`} />
              )}
              {/* Node */}
              <div className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                m.done ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-[#0f0f1a] border-[#3a3a4d] text-[#4b4b6b]'
              }`}>
                {m.done ? '✓' : i + 1}
              </div>
              <div className="mt-3 text-center px-1">
                <div className={`text-[10px] font-semibold ${m.done ? 'text-indigo-300' : 'text-[#4b4b6b]'}`}>{m.label}</div>
                <div className="text-[10px] text-[#4b4b6b] mt-0.5">{m.date}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Score history bar chart */}
      <div className="card-dark rounded-2xl p-6">
        <div className="text-[11px] uppercase tracking-widest text-[#6b7280] font-semibold mb-6">Readiness Score History</div>
        <div className="flex items-end gap-6 justify-center h-28">
          {SKILL_HISTORY.map((w, i) => {
            const height = (w.score / maxScore) * barHeight;
            const color = w.score < 0.5 ? '#f59e0b' : w.score < 0.7 ? '#6366f1' : '#10b981';
            const isNow = w.week === 'Now';
            return (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className="text-xs font-bold" style={{ color }}>{w.score}</div>
                <div className={`w-12 rounded-t-lg transition-all ${isNow ? 'ring-2 ring-indigo-400' : ''}`}
                  style={{ height: `${height}px`, background: isNow ? color : `${color}60` }} />
                <div className="text-[11px] text-[#6b7280]">{w.week}</div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 text-center text-xs text-[#6b7280]">
          ↑ <span className="text-emerald-400 font-semibold">+0.16 improvement</span> in 3 weeks
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Briefs Received', value: '3', icon: '📋' },
          { label: 'Tasks Completed', value: '6 / 14', icon: '✅' },
          { label: 'Debriefs Shared', value: '2', icon: '🤝' },
        ].map(s => (
          <div key={s.label} className="card-dark rounded-xl p-4 flex items-center gap-3">
            <span className="text-2xl">{s.icon}</span>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-[#6b7280]">{s.label}</div>
              <div className="font-display text-2xl text-[#e8e6f8]">{s.value}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
