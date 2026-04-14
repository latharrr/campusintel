'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/api';
import { setStudent } from '@/lib/auth';
import ResumeUploader from '@/components/student/ResumeUploader';

type Step = 'details' | 'resume' | 'complete';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('details');
  const [studentId, setStudentId] = useState<string>('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const [form, setForm] = useState({
    name: '',
    email: '',
    branch: '',
    batchYear: '',
    cgpa: '',
    collegeId: 'college-lpu-001',
  });

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      setErrorMsg('Name and email are required.');
      return;
    }

    setStatus('loading');
    setErrorMsg('');

    try {
      const res = await api.register({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        collegeId: form.collegeId,
        branch: form.branch || undefined,
        batchYear: form.batchYear ? parseInt(form.batchYear) : undefined,
        cgpa: form.cgpa ? parseFloat(form.cgpa) : undefined,
      });

      if (res.success && res.student) {
        setStudent(res.student);
        setStudentId(res.student.id);
        setStatus('idle');
        setStep('resume');
      } else {
        setErrorMsg(res.error || 'Registration failed. Please try again.');
        setStatus('error');
      }
    } catch {
      setErrorMsg('Could not reach server. Please try again.');
      setStatus('error');
    }
  };

  const handleSkillsExtracted = (skills: Record<string, number>) => {
    setStep('complete');
    // Wait a moment for the cool extraction animation, then go to dashboard
    setTimeout(() => {
      router.push('/dashboard');
    }, 3500);
  };

  const handleSkipResume = () => {
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-[#070711] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full"
        style={{ background: 'radial-gradient(ellipse, rgba(99,102,241,0.08) 0%, transparent 60%)' }} />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full"
        style={{ background: 'radial-gradient(ellipse, rgba(16,185,129,0.05) 0%, transparent 60%)' }} />

      <div className="relative z-10 w-full max-w-[560px] mt-10 mb-20">

        {/* Progress bar */}
        <div className="flex items-center gap-3 justify-center mb-10">
          {(['details', 'resume', 'complete'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-3">
              <div className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-widest transition ${
                step === s ? 'text-indigo-400' : i < ['details','resume','complete'].indexOf(step) ? 'text-emerald-400' : 'text-[#4b4b6b]'
              }`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] border ${
                  step === s ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300' :
                  i < ['details','resume','complete'].indexOf(step) ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400' :
                  'border-[#2a2a3d] text-[#4b4b6b]'
                }`}>
                  {i < ['details','resume','complete'].indexOf(step) ? '✓' : i + 1}
                </span>
                {s === 'details' ? 'Your Details' : s === 'resume' ? 'Upload Resume' : 'Done'}
              </div>
              {i < 2 && <div className="w-8 h-px bg-[#2a2a3d]" />}
            </div>
          ))}
        </div>

        {/* ── STEP 1: Details ── */}
        {step === 'details' && (
          <div className="animate-fade-in-up">
            <h1 className="font-display text-4xl text-[#e8e6f8] tracking-tight mb-2 text-center">
              Create your account
            </h1>
            <p className="text-[#8b8b9f] text-base text-center mb-8">
              Takes 30 seconds. No passwords — just your college email.
            </p>

            <form onSubmit={handleRegister} className="space-y-4 bg-[#0f0f1a] border border-[#2a2a3d] rounded-2xl p-8">
              {/* Name + Email */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] uppercase tracking-widest text-[#6b7280] font-semibold mb-1.5 block">Full Name *</label>
                  <input
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Rahul Sharma"
                    className="w-full h-11 rounded-lg bg-[#0a0a14] border border-[#2a2a3d] px-3 text-[#e8e6f8] placeholder:text-[#4b4b6b] text-sm outline-none focus:border-indigo-500/60 transition"
                  />
                </div>
                <div>
                  <label className="text-[11px] uppercase tracking-widest text-[#6b7280] font-semibold mb-1.5 block">College Email *</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="rahul@lpu.in"
                    className="w-full h-11 rounded-lg bg-[#0a0a14] border border-[#2a2a3d] px-3 text-[#e8e6f8] placeholder:text-[#4b4b6b] text-sm outline-none focus:border-indigo-500/60 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-[11px] uppercase tracking-widest text-[#6b7280] font-semibold mb-1.5 block">Branch</label>
                  <select
                    value={form.branch}
                    onChange={e => setForm(f => ({ ...f, branch: e.target.value }))}
                    className="w-full h-11 rounded-lg bg-[#0a0a14] border border-[#2a2a3d] px-3 text-[#e8e6f8] text-sm outline-none focus:border-indigo-500/60 transition appearance-none"
                  >
                    <option value="">Select</option>
                    {['CSE', 'IT', 'ECE', 'EE', 'ME', 'CE', 'Other'].map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] uppercase tracking-widest text-[#6b7280] font-semibold mb-1.5 block">Batch Year</label>
                  <select
                    value={form.batchYear}
                    onChange={e => setForm(f => ({ ...f, batchYear: e.target.value }))}
                    className="w-full h-11 rounded-lg bg-[#0a0a14] border border-[#2a2a3d] px-3 text-[#e8e6f8] text-sm outline-none focus:border-indigo-500/60 transition appearance-none"
                  >
                    <option value="">Select</option>
                    {[2025, 2026, 2027, 2028].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] uppercase tracking-widest text-[#6b7280] font-semibold mb-1.5 block">CGPA</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    step="0.1"
                    value={form.cgpa}
                    onChange={e => setForm(f => ({ ...f, cgpa: e.target.value }))}
                    placeholder="8.5"
                    className="w-full h-11 rounded-lg bg-[#0a0a14] border border-[#2a2a3d] px-3 text-[#e8e6f8] placeholder:text-[#4b4b6b] text-sm outline-none focus:border-indigo-500/60 transition"
                  />
                </div>
              </div>

              {errorMsg && (
                <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  ⚠️ {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full h-12 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
              >
                {status === 'loading' ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Creating account...
                  </>
                ) : 'Create Account & Continue →'}
              </button>
            </form>

            <p className="text-center mt-5 text-[13px] text-[#4b4b6b]">
              Already have an account?{' '}
              <a href="/login" className="text-indigo-400 hover:text-indigo-300 transition">Sign in</a>
            </p>
          </div>
        )}

        {/* ── STEP 2: Resume ── */}
        {step === 'resume' && (
          <div className="animate-fade-in-up">
            <h1 className="font-display text-4xl text-[#e8e6f8] tracking-tight mb-2 text-center">
              No forms. No data entry.
            </h1>
            <p className="text-[#8b8b9f] text-base text-center mb-8">
              Upload your resume. Our AI will extract your skills and build your placement profile instantly.
            </p>

            <div className="text-left">
              <ResumeUploader studentId={studentId} onSkillsExtracted={handleSkillsExtracted} />
            </div>

            <button
              onClick={handleSkipResume}
              className="w-full text-center text-[12px] text-[#4b4b6b] hover:text-[#6b7280] mt-5 transition"
            >
              Skip for now — I&apos;ll upload later
            </button>
          </div>
        )}

        {/* ── STEP 3: Complete ── */}
        {step === 'complete' && (
          <div className="animate-fade-in-up text-center">
            <div className="w-20 h-20 rounded-full flex items-center justify-center text-4xl mx-auto mb-6"
              style={{ background: 'rgba(16,185,129,0.15)', border: '2px solid rgba(16,185,129,0.4)' }}>
              ✓
            </div>
            <h1 className="font-display text-4xl text-emerald-400 mb-3">Profile Built!</h1>
            <p className="text-[#8b8b9f] text-base mb-8">
              Your skills have been extracted. Initialising your autonomous agent...
            </p>
            <div className="inline-flex items-center gap-3 px-6 py-2.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-sm font-semibold">
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Redirecting to Dashboard...
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
