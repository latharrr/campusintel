'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getStudent, logout, type StudentProfile } from '@/lib/auth';

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
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Load on mount
    setStudent(getStudent());

    // Re-read whenever a new user logs in
    const onProfileUpdated = (e: Event) => {
      setStudent((e as CustomEvent<StudentProfile>).detail);
    };
    window.addEventListener('ci:profile-updated', onProfileUpdated);
    return () => window.removeEventListener('ci:profile-updated', onProfileUpdated);
  }, []);

  const displayName = student?.name ?? 'Guest';
  const initial = displayName.charAt(0).toUpperCase();
  const branch = student?.branch ?? '';
  const college = student?.college_id ? student.college_id.split('-')[1]?.toUpperCase() ?? 'LPU' : 'LPU';
  const meta = [branch, college].filter(Boolean).join(' · ');
  const isTpc = student?.role === 'tpc_admin' || student?.role === 'super_admin';

  return (
    <>
      {/* Mobile Hamburger Button */}
      <button 
        className="md:hidden fixed top-4 right-4 z-[60] p-2 bg-[#0f0f1a] rounded-lg border border-[#2a2a3d] text-[#e8e6f8] shadow-lg focus:outline-none hover:bg-white/5 transition"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle Menu"
      >
        <span aria-hidden="true" className="text-xl leading-none flex items-center justify-center w-6 h-6">
          {isOpen ? '✕' : '☰'}
        </span>
      </button>

      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:sticky top-0 left-0 h-screen w-[240px] bg-[#0a0a14] border-r border-[#1e1e30] flex flex-col flex-shrink-0 z-50 transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="px-6 py-5 border-b border-[#1e1e30] flex items-center gap-3">
          <div className="w-8 h-8 flex-shrink-0">
            <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <circle cx="12" cy="16" r="9" stroke="#6366f1" strokeWidth="1.5" fill="rgba(99,102,241,0.15)" />
              <circle cx="20" cy="16" r="9" stroke="#8b5cf6" strokeWidth="1.5" fill="rgba(139,92,246,0.1)" />
            </svg>
          </div>
          <span className="font-display text-[15px] text-[#e8e6f8] font-semibold">CampusIntel</span>
        </div>

        {/* User profile */}
        <div className="px-4 py-4 border-b border-[#1e1e30] flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
            {initial}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium text-[#e8e6f8] truncate">{displayName}</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              {meta && <span className="text-[11px] text-[#6b7280]">{meta}</span>}
              <span className="px-1.5 py-px text-[10px] rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">{college}</span>
            </div>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(item => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                id={`nav-${item.href.replace('/', '')}`}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all relative group ${
                  isActive
                    ? 'bg-indigo-500/10 text-indigo-300 border-l-2 border-indigo-500'
                    : 'text-[#6b7280] hover:text-[#c4c4d8] hover:bg-white/5'
                }`}
              >
                <span className="text-base leading-none" aria-hidden="true">{item.icon}</span>
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
        <div className="px-3 py-4 pb-12 border-t border-[#1e1e30] space-y-1">
          <Link href="/demo"
            id="nav-demo"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#6b7280] hover:text-[#c4c4d8] hover:bg-white/5 transition-all">
            <span aria-hidden="true">🧠</span>
            <span className="font-medium">Agent Trace</span>
            <span className="ml-auto px-1.5 py-px text-[10px] rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">LIVE</span>
          </Link>
          {isTpc && (
            <Link href="/tpc/dashboard"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#6b7280] hover:text-[#c4c4d8] hover:bg-white/5 transition-all">
              <span aria-hidden="true">🏫</span>
              <span className="font-medium">TPC View</span>
            </Link>
          )}
          <button
            onClick={() => {
              logout();
              setIsOpen(false);
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#6b7280] hover:text-red-400 hover:bg-red-500/5 transition-all"
          >
            <span aria-hidden="true">↩</span>
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
