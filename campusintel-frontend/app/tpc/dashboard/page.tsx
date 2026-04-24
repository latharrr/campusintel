'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { getStudent } from '@/lib/auth';
import TpcDashboard from '@/components/tpc/TpcDashboard';

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
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('📊 Overview');
  const [students, setStudents] = useState<any[]>([]);

  useEffect(() => {
    const loadStudents = async () => {
      try {
        const admin = getStudent();
        // Redirect unauthorized users
        if (!admin || admin.email !== 'tpc@lpu.in') {
          router.push('/dashboard');
          return;
        }

        const collegeId = admin?.college_id || 'college-lpu-001';
        const data = await api.getStudents(collegeId);
        
        if (Array.isArray(data)) {
          const mapped = data.map(s => ({
            name: s.name || 'Unknown',
            branch: s.branch || 'N/A',
            cgpa: s.cgpa || '-',
            company: 'Active Drives', // Since users table doesn't hold direct company association
            score: s.confidence_score || 0,
            state: s.current_state || 'UNAWARE',
          }));
          setStudents(mapped);
        }
      } catch (err) {
        console.error('Failed to fetch students:', err);
      }
    };
    loadStudents();
  }, []);

  return (
    <div className="flex min-h-screen bg-[#07070f]">
      {/* TPC Sidebar */}
      <aside className="w-[220px] min-h-screen bg-[#0a0a14] border-r border-[#1e1e30] flex flex-col flex-shrink-0">
        <div className="px-5 py-5 border-b border-[#1e1e30]">
          <div className="font-display text-[15px] text-[#e8e6f8]">CampusIntel</div>
          <div className="text-[10px] text-indigo-400 mt-0.5 uppercase tracking-wider">TPC Admin — LPU</div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {['📊 Overview', '👥 Students', '🏢 Drives', '🔔 Alerts', '📋 Reports', '🧠 Agent Engine'].map((item) => (
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
                        {students.slice(0, 10).map((s, i) => {
                          const stStyle = STATE_STYLE[s.state] || STATE_STYLE.UNAWARE;
                          return (
                            <tr key={i} className="hover:bg-white/[0.02] transition">
                              <td className="py-3 pr-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                                    {s.name[0]?.toUpperCase() || '?'}
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
                            Send to Respective Department
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
          ) : activeTab === '👥 Students' ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100 fill-mode-both">
              <div>
                <h1 className="font-display text-3xl text-[#e8e6f8]">Student Cohorts</h1>
                <p className="text-[#6b7280] text-sm mt-1">Manage and track student preparation progress in real-time.</p>
              </div>
              <div className="card-dark rounded-2xl p-6">
                <div className="flex justify-between items-center mb-5">
                  <div className="flex gap-3">
                    <input type="text" placeholder="Search by name..." className="bg-[#0a0a14] border border-[#2a2a3d] rounded-lg px-4 py-2 text-sm text-[#e8e6f8] placeholder-[#4b4b6b] outline-none focus:border-indigo-500/60 transition w-64" />
                    <select className="bg-[#0a0a14] border border-[#2a2a3d] rounded-lg px-4 py-2 text-sm text-[#e8e6f8] outline-none">
                      <option>All Branches</option>
                      <option>CSE</option>
                      <option>ECE</option>
                    </select>
                  </div>
                  <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg transition">Export CSV</button>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#2a2a3d]">
                      {['Student', 'Branch', 'CGPA', 'Company', 'Readiness', 'State', ''].map(h => (
                        <th key={h} className="pb-3 text-left text-[11px] uppercase tracking-wider text-[#6b7280] font-medium pr-4">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e1e30]">
                    {students.map((s, i) => {
                      const stStyle = STATE_STYLE[s.state] || STATE_STYLE.UNAWARE;
                      return (
                        <tr key={i} className="hover:bg-white/[0.02] transition">
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                                {s.name[0]?.toUpperCase() || '?'}
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
                          <td className="py-3 text-right">
                             <button className="text-xs text-indigo-400 hover:text-indigo-300">View Profile</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : activeTab === '🏢 Drives' ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100 fill-mode-both">
              <div className="flex justify-between items-end">
                <div>
                  <h1 className="font-display text-3xl text-[#e8e6f8]">Campus Drives</h1>
                  <p className="text-[#6b7280] text-sm mt-1">Manage upcoming drives, update structure and send alerts.</p>
                </div>
                <button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition">+ Create New Drive</button>
              </div>
              <div className="grid grid-cols-2 gap-6">
                {COMPANIES.map(c => (
                  <div key={c.name} className="card-dark rounded-2xl p-6 border border-[#2a2a3d] hover:border-indigo-500/40 transition">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <img src={`https://logo.clearbit.com/${c.name.toLowerCase()}.com`} alt={c.name} className="w-10 h-10 rounded-lg bg-[#2a2a3d]" onError={(e: any) => { e.currentTarget.style.display='none'; }} />
                        <div>
                          <h3 className="text-lg font-display text-white">{c.name}</h3>
                          <span className="text-xs text-[#6b7280]">Drive Date: {c.date}</span>
                        </div>
                      </div>
                      <span className="px-2 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] uppercase tracking-wider rounded-md">Live</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mb-5 border-y border-[#1e1e30] py-4">
                      <div>
                        <div className="text-[10px] text-[#6b7280] uppercase tracking-wider">Registered</div>
                        <div className="text-xl text-white font-display mt-0.5">{c.students}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-[#6b7280] uppercase tracking-wider">Avg Readiness</div>
                        <div style={{ color: c.avg < 0.5 ? '#f59e0b' : c.avg < 0.7 ? '#6366f1' : '#10b981' }} className="text-xl font-display mt-0.5">{c.avg}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-[#6b7280] uppercase tracking-wider">Intel Confidence</div>
                        <div className={`text-xl font-display mt-0.5 ${c.confidence === 'HIGH' ? 'text-emerald-400' : c.confidence === 'MEDIUM' ? 'text-amber-400' : 'text-red-400'}`}>{c.confidence}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                       <button className="flex-1 py-1.5 bg-indigo-600/20 text-indigo-300 font-semibold text-xs rounded-lg hover:bg-indigo-600/30 transition border border-indigo-500/30">Edit Details</button>
                       <button className="flex-[2] py-1.5 bg-[#1e1e30] text-[#c4c4d8] font-semibold text-xs rounded-lg hover:bg-[#2a2a3d] transition border border-[#2a2a3d]" onClick={(e) => {
                         const btn = e.currentTarget;
                         const orig = btn.innerText;
                         btn.innerText = 'Scanning...';
                         setTimeout(() => btn.innerText = 'Scan Complete', 1000);
                         setTimeout(() => btn.innerText = orig, 3000);
                       }}>Trigger Agent Scan</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : activeTab === '🔔 Alerts' ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100 fill-mode-both">
              <div>
                <h1 className="font-display text-3xl text-[#e8e6f8]">AI Interventions & Alerts</h1>
                <p className="text-[#6b7280] text-sm mt-1">Review agent-generated alerts or broadcast manual notifications.</p>
              </div>
              
              <div className="grid grid-cols-[1fr_400px] gap-6">
                <div className="space-y-4">
                  <h3 className="text-[#e8e6f8] text-sm uppercase tracking-widest font-mono">Recent System Alerts</h3>
                  {ALERTS.map((a, i) => (
                    <div key={i} className={`rounded-xl p-5 border ${a.severity === 'high' ? 'border-amber-500/30 bg-amber-500/5' : 'border-blue-500/20 bg-blue-500/5'}`}>
                      <p className={`text-sm font-semibold mb-2 ${a.severity === 'high' ? 'text-amber-400' : 'text-blue-400'}`}>
                        {a.severity === 'high' ? '⚠️' : 'ℹ️'} {a.title}
                      </p>
                      <p className="text-xs text-[#6b7280]">{a.sub}</p>
                      <div className="flex gap-2 mt-4">
                        <button className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition">Send to Respective Department</button>
                        <button className="px-3 py-1.5 text-xs rounded-lg border border-[#2a2a3d] text-[#6b7280] hover:bg-white/5 transition">Dismiss</button>
                      </div>
                    </div>
                  ))}
                  <div className="rounded-xl p-5 border border-[#1e1e30] bg-[#0a0a14] opacity-50">
                    <p className="text-sm font-semibold mb-2 text-[#e8e6f8]">✅ Intervention Successful: Wipro Mock Tech Round</p>
                    <p className="text-xs text-[#6b7280]">Agent completed mock sessions for 14 at-risk students.</p>
                  </div>
                </div>

                {/* Send new alert form */}
                <div className="card-dark rounded-2xl p-6 h-fit sticky top-6">
                  <h3 className="text-[#e8e6f8] text-sm uppercase tracking-widest font-mono mb-5">Broadcast Alert</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-[#6b7280] block mb-1">Target Cohort</label>
                      <select className="w-full bg-[#0a0a14] border border-[#2a2a3d] rounded-lg px-3 py-2 text-sm text-[#e8e6f8] outline-none">
                        <option>Google Registered Students (48)</option>
                        <option>Infosys Registered Students (120)</option>
                        <option>All 4th Year Students</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-[#6b7280] block mb-1">Alert Channel</label>
                      <select className="w-full bg-[#0a0a14] border border-[#2a2a3d] rounded-lg px-3 py-2 text-sm text-[#e8e6f8] outline-none">
                        <option>In-App Notification & Email</option>
                        <option>WhatsApp Direct</option>
                        <option>SMS Urgent</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-[#6b7280] block mb-1">Message</label>
                      <textarea rows={4} className="w-full bg-[#0a0a14] border border-[#2a2a3d] rounded-lg px-3 py-2 text-sm text-[#e8e6f8] outline-none focus:border-indigo-500/50 resize-none" placeholder="Enter your message here..."></textarea>
                    </div>
                    <button className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-xl transition" onClick={(e) => {
                      const btn = e.currentTarget;
                      const orig = btn.innerText;
                      btn.innerText = 'Sent Successfully!';
                      btn.classList.remove('bg-indigo-600', 'hover:bg-indigo-500');
                      btn.classList.add('bg-emerald-600', 'hover:bg-emerald-500');
                      setTimeout(() => { 
                        btn.innerText = orig; 
                        btn.classList.add('bg-indigo-600', 'hover:bg-indigo-500');
                        btn.classList.remove('bg-emerald-600', 'hover:bg-emerald-500'); 
                      }, 2000);
                    }}>Broadcast Now</button>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === '📋 Reports' ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100 fill-mode-both">
              <div className="flex justify-between items-end">
                <div>
                  <h1 className="font-display text-3xl text-[#e8e6f8]">Executive Reporting</h1>
                  <p className="text-[#6b7280] text-sm mt-1">Download actionable intelligence and placement conversion stats.</p>
                </div>
                <div className="flex gap-3">
                  <button className="px-4 py-2 border border-[#2a2a3d] text-[#c4c4d8] hover:bg-white/5 text-sm font-semibold rounded-lg transition flex items-center gap-2">
                    📊 Export CSV
                  </button>
                  <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg transition flex items-center gap-2" onClick={(e) => {
                    const btn = e.currentTarget;
                    const orig = btn.innerHTML;
                    btn.innerHTML = '⏳ Generating...';
                    setTimeout(() => { btn.innerHTML = '✅ Downloaded'; setTimeout(() => btn.innerHTML = orig, 2000) }, 1000);
                  }}>
                    📄 Download PDF Report
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6">
                 <div className="card-dark rounded-2xl p-6 border-t-2 border-emerald-500">
                    <div className="text-xs text-[#6b7280] uppercase tracking-wider mb-2">Overall Conversion Rate</div>
                    <div className="text-4xl text-white font-display">68%</div>
                    <div className="text-xs text-emerald-400 mt-2">↑ 14% improvement vs last year</div>
                 </div>
                 <div className="card-dark rounded-2xl p-6 border-t-2 border-indigo-500">
                    <div className="text-xs text-[#6b7280] uppercase tracking-wider mb-2">AI Interventions Delivered</div>
                    <div className="text-4xl text-white font-display">1,482</div>
                    <div className="text-xs text-indigo-400 mt-2">Estimated 450 hours saved</div>
                 </div>
                 <div className="card-dark rounded-2xl p-6 border-t-2 border-amber-500">
                    <div className="text-xs text-[#6b7280] uppercase tracking-wider mb-2">Top Critical Gap (Global)</div>
                    <div className="text-white font-display text-2xl mt-1">System Design</div>
                    <div className="text-xs text-amber-400 mt-2">Affecting 42% of targeted cohorts</div>
                 </div>
              </div>

              <div className="card-dark rounded-2xl p-6">
                <h3 className="text-[#e8e6f8] text-sm uppercase tracking-widest font-mono mb-5">Recent Downloadable Reports</h3>
                <div className="space-y-2">
                  {[
                    { label: 'Google Pre-Drive Readiness Report', date: 'Generated 2 hours ago', size: '2.4 MB PDF' },
                    { label: 'Infosys Skill Gap Analysis', date: 'Generated yesterday', size: '1.8 MB PDF' },
                    { label: 'Semester 7 Placement Baseline', date: 'Generated 2 weeks ago', size: '5.1 MB PDF' }
                  ].map(r => (
                    <div key={r.label} className="flex justify-between items-center p-4 bg-[#05050a] border border-[#1e1e30] rounded-xl hover:bg-[#0a0a14] transition cursor-pointer group">
                      <div className="flex items-center gap-4">
                        <div className="text-2xl opacity-80 group-hover:opacity-100 transition">📄</div>
                        <div>
                          <div className="text-sm font-medium text-white">{r.label}</div>
                          <div className="text-xs text-[#6b7280]">{r.date}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-[#6b7280] font-mono">{r.size}</span>
                        <button className="text-indigo-400 hover:text-indigo-300 text-sm font-semibold">Download</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : activeTab === '🧠 Agent Engine' ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100 fill-mode-both">
              <div>
                <h1 className="font-display text-3xl text-[#e8e6f8]">Agent Engine Controls</h1>
                <p className="text-[#6b7280] text-sm mt-1">Monitor the live placement funnel, agent strategy weights, and system alerts.</p>
              </div>
              <TpcDashboard isDemoActive={false} contextName="Live Cohort" />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
