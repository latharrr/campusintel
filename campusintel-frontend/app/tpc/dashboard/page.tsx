'use client';
import { useState } from 'react';

const STUDENTS = [
  { name: 'Rahul Sharma', branch: 'CSE', cgpa: 7.8, company: 'Google', score: 0.48, state: 'ASSESSED' },
  { name: 'Priya Mehta', branch: 'CSE', cgpa: 9.1, company: 'Google', score: 0.82, state: 'INTERVIEW_READY' },
  { name: 'Arjun Singh', branch: 'IT', cgpa: 7.5, company: 'Infosys', score: 0.6, state: 'PREPARING' },
  { name: 'Sneha Gupta', branch: 'CSE', cgpa: 8.4, company: 'Amazon', score: 0.35, state: 'TARGETED' },
  { name: 'Dev Patel', branch: 'ECE', cgpa: 7.2, company: 'Wipro', score: 0.72, state: 'PREPARING' },
];

const STATES = ['UNAWARE', 'PROFILED', 'TARGETED', 'ASSESSED', 'PREPARING', 'INTERVIEW_READY'];

const STATE_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  UNAWARE: { bg: 'bg-gray-500/10', text: 'text-[#6b7280]', border: 'border-gray-500/30' },
  PROFILED: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
  TARGETED: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/30' },
  ASSESSED: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
  PREPARING: { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/30' },
  INTERVIEW_READY: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
};

const KPIS = [
  { label: 'Total Registered', value: '247', icon: '👥', sub: 'Across 6 upcoming drives' },
  { label: 'Briefs Delivered', value: '189', icon: '📋', sub: '76% coverage' },
  { label: 'At Risk', value: '42', icon: '⚠️', sub: 'Confidence < 0.5', warn: true },
  { label: 'Drives This Week', value: '3', icon: '🏢', sub: 'Google · Infosys · Wipro' },
];

const ALERTS = [
  { severity: 'high', title: '5 students interviewing Google have CRITICAL system_design gap', sub: 'Rahul Sharma, Dev Kumar + 3 others — avg score 0.42' },
  { severity: 'medium', title: 'Infosys drive in 6 days — 58 students haven\'t viewed their brief', sub: 'Briefs were delivered 2 days ago' },
  { severity: 'high', title: 'Amazon drive has only 3 verified debriefs — LOW confidence intel', sub: 'Agents are scraping external sources to supplement' },
];

const COMPANIES = [
  { name: 'Google', date: 'Apr 11', students: 48, avg: 0.54, debriefs: 8, confidence: 'MEDIUM' },
  { name: 'Infosys', date: 'Apr 15', students: 120, avg: 0.67, debriefs: 24, confidence: 'HIGH' },
  { name: 'Amazon', date: 'Apr 22', students: 35, avg: 0.48, debriefs: 3, confidence: 'LOW' },
  { name: 'Microsoft', date: 'Apr 25', students: 28, avg: 0.72, debriefs: 15, confidence: 'HIGH' },
];

function ScoreDot({ score }: { score: number }) {
  const color = score < 0.5 ? '#f59e0b' : score < 0.7 ? '#6366f1' : '#10b981';
  return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold"
      style={{ background: `${color}20`, border: `2px solid ${color}`, color }}>
      {score.toFixed(1)}
    </div>
  );
}

export default function TpcDashboardPage() {
  const [activeTab, setActiveTab] = useState('📊 Overview');

  return (
    <div className="flex min-h-screen bg-[#07070f]">
      {/* TPC Sidebar */}
      <aside className="w-[220px] min-h-screen bg-[#0a0a14] border-r border-[#1e1e30] flex flex-col flex-shrink-0">
        <div className="px-5 py-5 border-b border-[#1e1e30]">
          <div className="font-display text-[15px] text-[#e8e6f8]">CampusIntel</div>
          <div className="text-[10px] text-indigo-400 mt-0.5 uppercase tracking-wider">TPC Admin — LPU</div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {['📊 Overview', '👥 Students', '🏢 Drives', '🔔 Alerts', '📋 Reports'].map((item) => (
            <div key={item} 
              onClick={() => setActiveTab(item)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm cursor-pointer transition ${
              activeTab === item ? 'bg-indigo-500/10 text-indigo-300 border-l-2 border-indigo-500' : 'text-[#6b7280] hover:text-[#c4c4d8] hover:bg-white/5'
            }`}>
              {item}
            </div>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-[1100px] mx-auto space-y-6">
          
          {activeTab === '📊 Overview' ? (
            <>
              <div>
                <h1 className="font-display text-3xl text-[#e8e6f8]">TPC Dashboard</h1>
                <p className="text-[#6b7280] text-sm mt-1">Lovely Professional University · Placement Intelligence Overview</p>
              </div>

              {/* KPI row */}
              <div className="grid grid-cols-4 gap-4">
                {KPIS.map(k => (
                  <div key={k.label} className={`card-dark rounded-xl p-5 ${k.warn ? 'border-amber-500/30' : ''}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-[11px] uppercase tracking-wider text-[#6b7280]">{k.label}</div>
                        <div className={`font-display text-3xl mt-1 ${k.warn ? 'text-amber-400' : 'text-[#e8e6f8]'}`}>{k.value}</div>
                        <div className="text-[11px] text-[#6b7280] mt-1">{k.sub}</div>
                      </div>
                      <span className="text-2xl">{k.icon}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Main grid */}
              <div className="grid grid-cols-[65%_1fr] gap-6">
                {/* Student Pipeline */}
                <div className="card-dark rounded-2xl p-6">
                  <div className="text-[11px] uppercase tracking-widest text-[#6b7280] font-semibold mb-5">Student Pipeline</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#2a2a3d]">
                          {['Student', 'Branch', 'CGPA', 'Company', 'Readiness', 'State'].map(h => (
                            <th key={h} className="pb-3 text-left text-[11px] uppercase tracking-wider text-[#6b7280] font-medium pr-4">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1e1e30]">
                        {STUDENTS.map(s => {
                          const stStyle = STATE_STYLE[s.state] || STATE_STYLE.UNAWARE;
                          return (
                            <tr key={s.name} className="hover:bg-white/[0.02] transition">
                              <td className="py-3 pr-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                                    {s.name[0]}
                                  </div>
                                  <span className="text-[#e8e6f8] font-medium truncate">{s.name}</span>
                                </div>
                              </td>
                              <td className="py-3 pr-4 text-[#6b7280]">{s.branch}</td>
                              <td className="py-3 pr-4 text-[#9b9bbb]">{s.cgpa}</td>
                              <td className="py-3 pr-4 text-[#9b9bbb] text-xs">{s.company}</td>
                              <td className="py-3 pr-4"><ScoreDot score={s.score} /></td>
                              <td className="py-3">
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${stStyle.bg} ${stStyle.text} ${stStyle.border}`}>
                                  {s.state.replace('_', ' ')}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Alert Panel */}
                <div className="card-dark rounded-2xl p-5">
                  <div className="text-[11px] uppercase tracking-widest text-[#6b7280] font-semibold mb-4">AI Alerts</div>
                  <div className="space-y-3">
                    {ALERTS.map((a, i) => (
                      <div key={i} className={`rounded-xl p-4 border ${
                        a.severity === 'high' ? 'border-amber-500/30 bg-amber-500/5' : 'border-blue-500/20 bg-blue-500/5'
                      }`}>
                        <p className={`text-xs font-semibold mb-1 ${a.severity === 'high' ? 'text-amber-400' : 'text-blue-400'}`}>
                          {a.severity === 'high' ? '⚠️' : 'ℹ️'} {a.title}
                        </p>
                        <p className="text-[11px] text-[#6b7280]">{a.sub}</p>
                        <div className="flex gap-2 mt-3">
                          <button className="px-3 py-1 text-[10px] font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition">
                            Schedule Session
                          </button>
                          <button className="px-3 py-1 text-[10px] rounded-lg border border-[#2a2a3d] text-[#6b7280] hover:bg-white/5 transition">
                            Dismiss
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Company Intelligence table */}
              <div className="card-dark rounded-2xl p-6">
                <div className="text-[11px] uppercase tracking-widest text-[#6b7280] font-semibold mb-5">Company Intelligence Overview</div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#2a2a3d]">
                      {['Company', 'Drive Date', 'Students', 'Avg Readiness', 'Debriefs', 'Confidence', ''].map(h => (
                        <th key={h} className="pb-3 text-left text-[11px] uppercase tracking-wider text-[#6b7280] font-medium pr-6">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e1e30]">
                    {COMPANIES.map(c => (
                      <tr key={c.name} className="hover:bg-white/[0.02] transition">
                        <td className="py-3 pr-6">
                          <div className="flex items-center gap-2">
                            <img src={`https://logo.clearbit.com/${c.name.toLowerCase()}.com`} alt={c.name}
                              className="w-6 h-6 rounded" onError={(e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.style.display='none'; }} />
                            <span className="text-[#e8e6f8] font-medium">{c.name}</span>
                          </div>
                        </td>
                        <td className="py-3 pr-6 text-[#9b9bbb]">{c.date}</td>
                        <td className="py-3 pr-6 text-[#9b9bbb]">{c.students}</td>
                        <td className="py-3 pr-6">
                          <span style={{ color: c.avg < 0.5 ? '#f59e0b' : c.avg < 0.7 ? '#6366f1' : '#10b981' }}
                            className="font-semibold">{c.avg}</span>
                        </td>
                        <td className="py-3 pr-6 text-[#9b9bbb]">{c.debriefs}</td>
                        <td className="py-3 pr-6">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                            c.confidence === 'HIGH' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                            c.confidence === 'MEDIUM' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
                            'bg-red-500/10 border-red-500/30 text-red-400'
                          }`}>{c.confidence}</span>
                        </td>
                        <td className="py-3">
                          <a href="#" className="text-xs text-indigo-400 hover:text-indigo-300 transition">View Intel →</a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-[600px] text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl mb-4"
                style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
                🧱
              </div>
              <h2 className="font-display text-2xl text-[#e8e6f8] mb-2">{activeTab.replace(/[^a-zA-Z ]/g, '')} Dashboard</h2>
              <p className="text-[#6b7280] max-w-md">
                This module is restricted to full Enterprise TPC accounts. For the purpose of this hackathon demo, all live intelligence has been centralized into the Overview tab.
              </p>
              <button 
                onClick={() => setActiveTab('📊 Overview')}
                className="mt-6 px-6 py-2 rounded-xl text-sm font-semibold border border-indigo-500/40 text-indigo-400 hover:bg-indigo-500/10 transition"
              >
                ← Return to Overview
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
