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

          {/* Card 4 */}
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
