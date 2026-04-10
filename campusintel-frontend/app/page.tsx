'use client';
import Link from 'next/link';
import { useEffect, useRef } from 'react';

export default function LandingPage() {
  const gridRef = useRef<HTMLDivElement>(null);

  // Subtle mouse tracking for the grid background
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!gridRef.current) return;
      const rect = gridRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      gridRef.current.style.setProperty('--mouse-x', `${x}px`);
      gridRef.current.style.setProperty('--mouse-x', `${x}px`);
      gridRef.current.style.setProperty('--mouse-y', `${y}px`);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="min-h-screen bg-[#05050a] text-[#e8e6f8] font-sans selection:bg-indigo-500/30 overflow-x-hidden">
      
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 border-b border-[#1e1e30] bg-[#05050a]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded border border-indigo-500/50 bg-indigo-500/10 flex items-center justify-center">
              <div className="w-2 h-2 bg-indigo-400 rounded-sm" />
            </div>
            <span className="font-display font-semibold text-lg tracking-wide">CampusIntel</span>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <Link href="/pulse" className="text-[#9b9bbb] hover:text-indigo-400 transition">Network</Link>
            <Link href="/demo" className="text-[#9b9bbb] hover:text-indigo-400 transition">Agent Trace</Link>
            <Link href="/debrief" className="text-[#9b9bbb] hover:text-emerald-400 transition">Submit Debrief</Link>
            <Link href="/login" 
              className="px-4 py-1.5 rounded-full border border-[#2a2a3d] text-[#c4c4d8] hover:bg-white/5 transition">
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative pt-32 pb-20 px-6">
        {/* Techie Grid Background with Mouse Glow */}
        <div 
          ref={gridRef}
          className="absolute inset-0 z-0 opacity-[0.15] pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(to right, #4f46e5 1px, transparent 1px),
              linear-gradient(to bottom, #4f46e5 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
            maskImage: 'radial-gradient(ellipse 60% 60% at 50% 30%, #000 10%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 60% 60% at 50% 30%, #000 10%, transparent 100%)',
          }}
        />

        <div className="max-w-5xl mx-auto relative z-10 flex flex-col items-center text-center mt-10">
          
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-8 rounded-full border border-emerald-500/30 bg-emerald-500/5 text-emerald-400 text-xs font-medium uppercase tracking-widest">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            System Live · Active Agents
          </div>

          <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tight mb-6 leading-[1.1] text-transparent bg-clip-text bg-gradient-to-b from-white to-[#8b8b9f]">
            Intelligence isn't a dashboard.<br className="hidden md:block"/>
            It's an <span className="text-indigo-400 relative">
              Agent.
              <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 100 10" preserveAspectRatio="none">
                <path d="M0 5 Q 50 15 100 5" fill="none" stroke="#4f46e5" strokeWidth="2" strokeDasharray="4 4" />
              </svg>
            </span>
          </h1>

          <p className="max-w-2xl text-[#9b9bbb] text-lg md:text-xl leading-relaxed mb-10">
            Generic prep lists are dead. CampusIntel uses autonomous agents to scrape, verify, and distill yesterday's real interviews into hyper-personalized briefs for tomorrow's candidates.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Link href="/demo"
              className="group relative px-8 py-3.5 rounded-xl font-semibold bg-indigo-600 text-white overflow-hidden transition-all hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(79,70,229,0.3)]">
              <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%)] bg-[length:250%_250%] animate-shimmer" />
              <span className="relative flex items-center gap-2">
                Watch the Agent Think <span className="transition-transform group-hover:translate-x-1">→</span>
              </span>
            </Link>
            
            <Link href="/pulse"
              className="px-8 py-3.5 rounded-xl font-semibold text-[#c4c4d8] border border-[#2a2a3d] hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all">
              View Live Network
            </Link>
          </div>
        </div>
      </main>

      {/* Impact Stats Bar */}
      <div className="w-full border-y border-[#1e1e30] bg-[#07070f]/90 backdrop-blur-sm relative z-10">
        <div className="max-w-5xl mx-auto px-6 py-5 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { value: '847', suffix: '+', label: 'Students Coached' },
            { value: '23',  suffix: '',  label: 'Companies Tracked' },
            { value: '3.2', suffix: '×', label: 'Interview Conversion' },
            { value: '98',  suffix: 'ms',label: 'Avg Agent Response' },
          ].map((stat) => (
            <div key={stat.label} className="group">
              <div className="text-2xl md:text-3xl font-display font-bold text-white group-hover:text-indigo-300 transition-colors">
                {stat.value}<span className="text-indigo-400">{stat.suffix}</span>
              </div>
              <div className="text-xs text-[#6b7280] mt-1 tracking-wide">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Massive App Preview Window */}
      <section className="max-w-6xl mx-auto px-6 relative z-10 mt-12 mb-32">
        <div className="rounded-2xl border border-[#2a2a3d] bg-[#0a0a14]/80 backdrop-blur-xl shadow-[0_0_100px_rgba(79,70,229,0.15)] overflow-hidden">
          {/* Mac window header */}
          <div className="h-10 border-b border-[#1e1e30] flex items-center px-4 gap-2 bg-[#05050a]">
            <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
            <div className="w-3 h-3 rounded-full bg-amber-500/20 border border-amber-500/50" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500/50" />
            <div className="mx-auto text-[10px] text-[#4b4b6b] font-mono tracking-widest pl-6">AGENT_TRACE_LIVE</div>
          </div>
          {/* Mockup content split */}
          <div className="grid grid-cols-1 md:grid-cols-2 h-[380px]">
             {/* Left: Code / Trace */}
             <div className="p-6 font-mono text-[11px] md:text-xs leading-relaxed text-[#6b7280] border-r border-[#1e1e30] flex flex-col justify-center">
                <div className="text-indigo-400 mb-2">{`>`} INITIALIZING_AGENTIC_LOOP</div>
                <div className="mb-4 text-[#8b8b9f]">Target: Rahul Sharma | Drive: Google | Context: Low Confidence</div>
                <div className="text-emerald-400 mb-2">{`>`} DECISION_01: QUERY_LOCAL_DB</div>
                <div className="pl-4 mb-4 border-l border-[#2a2a3d]">
                  Found 8 debriefs.<br/>
                  Extracting parameters...<br/>
                  <span className="text-[#c4c4d8]">System_Design: 75% frequency</span>
                </div>
                <div className="text-amber-400 mb-2">{`>`} DECISION_02: ASSESS_READINESS</div>
                <div className="pl-4 mb-4 border-l border-[#2a2a3d]">
                  Score: 0.48<br/>
                  Status: <span className="text-amber-400">CRITICAL_GAP</span>
                </div>
                <div className="text-indigo-400 animate-pulse">{`>`} GENERATING_INTERVENTION_BRIEF...</div>
             </div>
             {/* Right: UI mockup of Pulse */}
             <div className="relative p-6 overflow-hidden bg-[#05050a] flex items-center justify-center">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.1)_0%,transparent_100%)]" />
                <div className="relative w-full max-w-[280px] aspect-square rounded-full border border-[#2a2a3d] flex items-center justify-center">
                  <div className="absolute inset-0 border border-indigo-500/30 rounded-full animate-[spin_10s_linear_infinite] border-dashed" />
                  <div className="absolute inset-8 border border-emerald-500/20 rounded-full animate-[spin_15s_linear_infinite_reverse] border-dashed" />
                  <div className="absolute w-16 h-16 bg-indigo-500/20 blur-xl rounded-full" />
                  <div className="relative w-6 h-6 bg-indigo-500 rounded-full shadow-[0_0_30px_rgba(99,102,241,0.8)] z-10 flex items-center justify-center text-[8px] font-bold text-white">LPU</div>
                  
                  {/* Nodes */}
                  <div className="absolute -top-2 left-1/4 w-3 h-3 bg-emerald-400 rounded-full shadow-[0_0_15px_#34d399] animate-pulse" />
                  <div className="absolute bottom-1/4 -right-2 w-4 h-4 bg-amber-400 rounded-full shadow-[0_0_15px_#fbbf24] animate-pulse delay-75" />
                  <div className="absolute top-1/2 -left-4 w-5 h-5 bg-blue-400 rounded-full shadow-[0_0_15px_#60a5fa] flex items-center justify-center text-[7px] font-bold text-black">GOOG</div>
                  
                  {/* Connecting lines */}
                  <svg className="absolute inset-[-20%] w-[140%] h-[140%] -z-10 opacity-30">
                     <path d="M 140 140 Q 60 40 100 0" fill="none" stroke="#4f46e5" strokeWidth="1" strokeDasharray="4" className="animate-[dash_20s_linear_infinite]" />
                     <path d="M 140 140 Q 240 180 280 200" fill="none" stroke="#34d399" strokeWidth="1" strokeDasharray="4" className="animate-[dash_15s_linear_infinite]" />
                  </svg>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* The Competitor Takedown */}
      <section className="max-w-5xl mx-auto px-6 py-10 relative z-10 mb-20 border-b border-[#1e1e30] pb-32">
        <div className="text-center mb-16">
          <div className="text-indigo-400 text-sm font-mono tracking-widest uppercase mb-3">The Paradigm Shift</div>
          <h2 className="text-3xl md:text-5xl font-display font-bold text-white mb-6">Why Chatbots Fail.</h2>
          <p className="text-[#8b8b9f] text-lg max-w-2xl mx-auto">The old model relies on students knowing exactly what to ask. But if a student doesn't know they have a critical gap in DBMS, they will never ask for help. We don't wait for prompts.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Old Way */}
          <div className="p-8 rounded-2xl border border-red-500/20 bg-red-500/[0.02]">
            <div className="text-red-400 text-lg font-display font-bold mb-6 flex items-center gap-3">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-red-500/10 border border-red-500/20">✕</span> 
              Generic AI Platforms
            </div>
            <ul className="space-y-5 text-[#8b8b9f] text-sm">
              <li className="flex items-start gap-4"><span className="mt-1 text-[#4b4b6b] font-mono">01</span> Waits for the student to manually query for help.</li>
              <li className="flex items-start gap-4"><span className="mt-1 text-[#4b4b6b] font-mono">02</span> Provides generic, stale advice compiled from old internet lists.</li>
              <li className="flex items-start gap-4"><span className="mt-1 text-[#4b4b6b] font-mono">03</span> Placement Cells only discover failure rates after the drive ends.</li>
              <li className="flex items-start gap-4"><span className="mt-1 text-[#4b4b6b] font-mono">04</span> Zero memory. Students make the same mistakes repeatedly.</li>
            </ul>
          </div>
          {/* CampusIntel Way */}
          <div className="p-8 rounded-2xl border border-emerald-500/30 bg-[#0a0a14] relative overflow-hidden ring-1 ring-emerald-500/10 shadow-[0_0_30px_rgba(52,211,153,0.05)]">
            <div className="absolute top-[-50%] right-[-50%] w-full h-full bg-emerald-500/10 blur-[100px] rounded-full" />
            <div className="text-emerald-400 text-lg font-display font-bold mb-6 flex items-center gap-3 relative z-10">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-white shadow-[0_0_15px_rgba(52,211,153,0.4)]">✓</span> 
              Agentic Intelligence
            </div>
            <ul className="space-y-5 text-[#c4c4d8] text-sm relative z-10">
              <li className="flex items-start gap-4"><span className="mt-1 text-emerald-500">→</span> Proactively runs gap analysis in the background automatically.</li>
              <li className="flex items-start gap-4"><span className="mt-1 text-emerald-500">→</span> Replaces stale logic with live peer debriefs from your specific campus.</li>
              <li className="flex items-start gap-4"><span className="mt-1 text-emerald-500">→</span> Alerts TPC mathematically 68 hours before failure occurs.</li>
              <li className="flex items-start gap-4"><span className="mt-1 text-emerald-500">→</span> Epsilon-Greedy RL mathematically penalizes strategies that lead to rejection.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Value Bento Box */}
      <section className="max-w-6xl mx-auto px-6 py-20 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1 */}
          <div className="md:col-span-2 group bg-[#0a0a14] border border-[#1e1e30] hover:border-indigo-500/30 rounded-3xl p-8 transition-colors relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:opacity-100 transition-opacity">
               <span className="text-4xl">🧠</span>
            </div>
            <div className="text-[11px] text-indigo-400 font-mono tracking-widest uppercase mb-4">01 // Agentic Workflows</div>
            <h3 className="text-2xl font-display text-white mb-3">7 Decisions. 0 Humans.</h3>
            <p className="text-[#8b8b9f] leading-relaxed max-w-md">
              The system doesn't wait for clicks. It validates local debrief thresholds, scrapes global intelligence dynamically, assesses student gaps, and generates targeted preparation briefs entirely on its own.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-[#0a0a14] border border-[#1e1e30] hover:border-emerald-500/30 rounded-3xl p-8 transition-colors">
            <div className="text-[11px] text-emerald-400 font-mono tracking-widest uppercase mb-4">02 // Network Effect</div>
            <h3 className="text-2xl font-display text-white mb-3">Campus Pulse</h3>
            <p className="text-[#8b8b9f] leading-relaxed">
              Every student debrief feeds the network instantly. Watch the intelligence flow from student to company node to the next candidate in real-time.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-[#0a0a14] border border-[#1e1e30] hover:border-violet-500/30 rounded-3xl p-8 transition-colors">
            <div className="text-[11px] text-violet-400 font-mono tracking-widest uppercase mb-4">03 // Epsilon-Greedy</div>
            <h3 className="text-2xl font-display text-white mb-3">Self-Correcting</h3>
            <p className="text-[#8b8b9f] leading-relaxed">
              Strategies are selected based on historic win-rates. The agent mathematically stops prescribing paths that lead to rejections.
            </p>
          </div>

          {/* Card 5 — Resume Parsing */}
          <div className="bg-[#0a0a14] border border-[#1e1e30] hover:border-indigo-500/30 rounded-3xl p-8 transition-colors">
            <div className="text-[11px] text-indigo-400 font-mono tracking-widest uppercase mb-4">04 // Resume AI</div>
            <h3 className="text-2xl font-display text-white mb-3">Upload. Don't Type.</h3>
            <p className="text-[#8b8b9f] leading-relaxed">
              Student uploads a PDF resume. Gemini AI extracts a skills profile automatically — no forms, no onboarding friction.
            </p>
          </div>

          {/* Card 6 — Debrief Loop */}
          <div className="md:col-span-2 bg-[#0a0a14] border border-emerald-500/20 hover:border-emerald-500/40 rounded-3xl p-8 transition-colors relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-3xl rounded-full" />
            <div className="relative z-10">
              <div className="text-[11px] text-emerald-400 font-mono tracking-widest uppercase mb-4">05 // Closed Loop</div>
              <h3 className="text-2xl font-display text-white mb-3">The Network Feeds Itself</h3>
              <p className="text-[#8b8b9f] leading-relaxed max-w-xl mb-5">
                Every student who submits a debrief immediately improves the intelligence available to future candidates. The system synthesizes patterns from raw interview notes in real-time.
              </p>
              <Link href="/debrief"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 transition">
                Submit Your Own Debrief →
              </Link>
            </div>
          </div>

          {/* Card 4 — Admin */}
          <div className="md:col-span-2 bg-[#0a0a14] border border-[#1e1e30] rounded-3xl p-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#1e1e30]/20 to-transparent animate-[shimmer_3s_infinite]" />
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <div className="text-[11px] text-[#6b7280] font-mono tracking-widest uppercase mb-2">For Administrators</div>
                <h3 className="text-2xl font-display text-white mb-2">Proactive Pipeline Management</h3>
                <p className="text-[#8b8b9f] max-w-sm">
                  Catch skill gaps before the drive happens. AI flags critical risks and automatically queues intervention sessions.
                </p>
              </div>
              <Link href="/tpc/dashboard" className="px-6 py-3 rounded-lg border border-[#3a3a4d] text-sm hover:bg-white/5 transition whitespace-nowrap">
                Open TPC Console →
              </Link>
            </div>
          </div>

        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1e1e30] mt-10 p-8 text-center bg-[#0a0a14]">
        <div className="inline-flex items-center justify-center p-3 rounded-full bg-indigo-500/10 text-indigo-400 mb-4">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
        </div>
        <div className="font-display text-lg text-white mb-1">CampusIntel</div>
        <p className="text-xs text-[#6b7280]">Built for the future of placements. Deployed in 24 hours.</p>
      </footer>
    </div>
  );
}
