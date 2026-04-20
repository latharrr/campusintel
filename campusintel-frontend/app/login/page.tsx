'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { setStudent } from '@/lib/auth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();

  const routeAfterLogin = (student: any) => {
    const role = student.role;
    // TPC admin / super admin → TPC dashboard
    if (role === 'tpc_admin' || role === 'super_admin') {
      router.push('/tpc/dashboard');
      return;
    }
    // Students without a profile → onboarding
    if (student.current_state === 'UNAWARE') {
      router.push('/onboarding');
      return;
    }
    // Default: student dashboard
    router.push('/dashboard');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;

    setStatus('loading');
    setErrorMsg('');

    try {
      const res = await api.login(trimmed);

      if (res.success && res.student) {
        setStudent(res.student);
        routeAfterLogin(res.student);
      } else {
        setErrorMsg(res.error || 'No account found. Please register first.');
        setStatus('error');
      }
    } catch {
      setErrorMsg('Could not reach server. Try again in a moment.');
      setStatus('error');
    }
  };


  return (
    <div className="min-h-screen bg-[#070711] flex flex-col items-center justify-center relative overflow-hidden">
      {/* Mesh gradient background */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full"
        style={{ background: 'radial-gradient(ellipse at top right, rgba(99,102,241,0.18) 0%, rgba(139,92,246,0.1) 40%, transparent 70%)' }} />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full"
        style={{ background: 'radial-gradient(ellipse at bottom left, rgba(99,102,241,0.08) 0%, transparent 70%)' }} />

      {/* Logo + tagline */}
      <div className="relative z-10 flex flex-col items-center mb-10">
        <div className="mb-4 flex items-center justify-center w-14 h-14">
          <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-14 h-14">
            <circle cx="20" cy="28" r="16" stroke="#6366f1" strokeWidth="2.5" fill="rgba(99,102,241,0.1)" />
            <circle cx="36" cy="28" r="16" stroke="#8b5cf6" strokeWidth="2.5" fill="rgba(139,92,246,0.1)" />
          </svg>
        </div>
        <h1 className="font-display text-[28px] text-[#e8e6f8] tracking-tight">CampusIntel</h1>
        <p className="text-[#6b7280] text-[13px] mt-1 text-center max-w-[280px]">
          Every interview that happened before yours, working for you.
        </p>
      </div>

      {/* Auth card */}
      <div className="relative z-10 glass glow-indigo rounded-2xl p-10 w-full max-w-[420px]">
        <h2 className="font-display text-2xl text-[#e8e6f8] mb-1">Welcome back</h2>
        <p className="text-[#6b7280] text-[13px] mb-8">Enter your college email to sign in</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="rahul@lpu.in"
              disabled={status === 'loading'}
              className="w-full h-12 rounded-[10px] bg-[#0f0f1a] border border-[#2a2a3d] px-4 text-[#e8e6f8] placeholder:text-[#4b4b6b] text-sm outline-none transition focus:border-indigo-500 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)] disabled:opacity-50"
            />
          </div>

          {errorMsg && (
            <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              ⚠️ {errorMsg}
            </div>
          )}

          <button
            id="signin-btn"
            type="submit"
            disabled={status === 'loading' || !email.trim()}
            className="w-full h-12 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[10px] text-sm font-semibold transition-all hover:-translate-y-px active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {status === 'loading' ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Signing in...
              </>
            ) : 'Sign In →'}
          </button>
        </form>

        <p className="text-center mt-6 text-[13px] text-[#4b4b6b]">
          New to CampusIntel?{' '}
          <a href="/onboarding" className="text-indigo-400 hover:text-indigo-300 transition">Create account</a>
        </p>
      </div>

      {/* Bottom stat pills */}
      <div className="relative z-10 flex gap-3 mt-10 flex-wrap justify-center">
        {['10M+ interviews tracked', '200+ colleges', 'AI-powered'].map(label => (
          <span key={label} className="px-4 py-1.5 rounded-full text-[11px] text-[#a5b4fc]"
            style={{ background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.2)' }}>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
