'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { icon: '🌐', label: 'Campus Pulse', href: '/pulse', badge: 'NEW' },
  { icon: '⊞', label: 'Dashboard', href: '/dashboard' },
  { icon: '📋', label: 'My Briefs', href: '/briefs' },
  { icon: '🏢', label: 'Drives', href: '/drives' },
  { icon: '🤝', label: 'Debriefs', href: '/debrief', redDot: true },
  { icon: '📊', label: 'Progress', href: '/progress' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[240px] min-h-screen bg-[#0a0a14] border-r border-[#1e1e30] flex flex-col flex-shrink-0">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-[#1e1e30] flex items-center gap-3">
        <div className="w-8 h-8 flex-shrink-0">
          <svg viewBox="0 0 32 32" fill="none">
            <circle cx="12" cy="16" r="9" stroke="#6366f1" strokeWidth="1.5" fill="rgba(99,102,241,0.15)" />
            <circle cx="20" cy="16" r="9" stroke="#8b5cf6" strokeWidth="1.5" fill="rgba(139,92,246,0.1)" />
          </svg>
        </div>
        <span className="font-display text-[15px] text-[#e8e6f8] font-semibold">CampusIntel</span>
      </div>

      {/* User profile */}
      <div className="px-4 py-4 border-b border-[#1e1e30] flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
          R
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium text-[#e8e6f8] truncate">Rahul Sharma</div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[11px] text-[#6b7280]">CSE · LPU</span>
            <span className="px-1.5 py-px text-[10px] rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">LPU</span>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(item => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'));
          return (
            <Link
              key={item.href}
              href={item.href}
              id={`nav-${item.href.replace('/', '')}`}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all relative group ${
                isActive
                  ? 'bg-indigo-500/10 text-indigo-300 border-l-2 border-indigo-500'
                  : 'text-[#6b7280] hover:text-[#c4c4d8] hover:bg-white/5'
              }`}
            >
              <span className="text-base leading-none">{item.icon}</span>
              <span className="font-medium flex-1">{item.label}</span>
              {item.badge && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {item.badge}
                </span>
              )}
              {item.redDot && (
                <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="px-3 py-4 border-t border-[#1e1e30] space-y-1">
        <Link href="/demo"
          id="nav-demo"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#6b7280] hover:text-[#c4c4d8] hover:bg-white/5 transition-all">
          <span>🧠</span>
          <span className="font-medium">Agent Trace</span>
          <span className="ml-auto px-1.5 py-px text-[10px] rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">LIVE</span>
        </Link>
        <Link href="/tpc/dashboard"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#6b7280] hover:text-[#c4c4d8] hover:bg-white/5 transition-all">
          <span>🏫</span>
          <span className="font-medium">TPC View</span>
        </Link>
        <Link href="/login" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#6b7280] hover:text-red-400 hover:bg-red-500/5 transition-all">
          <span>↩</span>
          <span className="font-medium">Sign Out</span>
        </Link>
      </div>
    </aside>
  );
}
