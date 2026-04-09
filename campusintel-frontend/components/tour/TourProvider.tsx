'use client';
import { useState, useEffect, createContext, useContext } from 'react';

interface TourStep {
  title: string;
  body: string;
  highlight?: string; // element id to flash
}

interface TourContextType {
  step: number;
  total: number;
  current: TourStep | null;
  next: () => void;
  prev: () => void;
  close: () => void;
  isOpen: boolean;
  open: () => void;
}

const TourContext = createContext<TourContextType | null>(null);

export function useTour() {
  return useContext(TourContext);
}

interface Props {
  steps: TourStep[];
  tourKey: string; // unique per page — stored in localStorage
  children: React.ReactNode;
}

export function TourProvider({ steps, tourKey, children }: Props) {
  const [step, setStep] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(`tour_seen_${tourKey}`);
    if (!seen) {
      // Small delay so the page renders first
      const t = setTimeout(() => setIsOpen(true), 1200);
      return () => clearTimeout(t);
    }
  }, [tourKey]);

  const close = () => {
    localStorage.setItem(`tour_seen_${tourKey}`, 'true');
    setIsOpen(false);
  };

  const next = () => {
    if (step < steps.length - 1) setStep(s => s + 1);
    else close();
  };

  const prev = () => {
    if (step > 0) setStep(s => s - 1);
  };

  const open = () => {
    setStep(0);
    setIsOpen(true);
  };

  return (
    <TourContext.Provider value={{ step, total: steps.length, current: steps[step] || null, next, prev, close, isOpen, open }}>
      {children}
      {isOpen && steps[step] && (
        <TourTooltip
          step={step}
          total={steps.length}
          current={steps[step]}
          onNext={next}
          onPrev={prev}
          onClose={close}
        />
      )}
    </TourContext.Provider>
  );
}

function TourTooltip({ step, total, current, onNext, onPrev, onClose }: {
  step: number;
  total: number;
  current: TourStep;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed bottom-6 right-6 z-[100] w-[340px] shadow-2xl animate-slide-up"
      style={{
        background: 'linear-gradient(135deg, #0f0f1a, #12121e)',
        border: '1px solid rgba(99,102,241,0.4)',
        borderRadius: '16px',
        boxShadow: '0 0 40px rgba(99,102,241,0.15), 0 20px 40px rgba(0,0,0,0.6)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#2a2a3d]">
        <div className="flex items-center gap-2">
          <span className="text-lg">🧭</span>
          <span className="text-xs font-semibold uppercase tracking-widest text-indigo-300">Guided Tour</span>
        </div>
        <button onClick={onClose} className="text-[#4b4b6b] hover:text-[#9b9bbb] text-lg transition">×</button>
      </div>

      {/* Step indicator */}
      <div className="flex gap-1 px-5 pt-4">
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} className={`flex-1 h-1 rounded-full transition-all ${i <= step ? 'bg-indigo-500' : 'bg-[#2a2a3d]'}`} />
        ))}
      </div>

      {/* Content */}
      <div className="px-5 py-4">
        <div className="text-[10px] uppercase tracking-widest text-indigo-400 mb-1">Step {step + 1} of {total}</div>
        <h3 className="font-display text-base text-[#e8e6f8] mb-2 leading-snug">{current.title}</h3>
        <p className="text-[13px] text-[#9b9bbb] leading-relaxed">{current.body}</p>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-2 px-5 pb-5">
        {step > 0 && (
          <button onClick={onPrev}
            className="px-4 py-2 text-xs text-[#6b7280] hover:text-[#c4c4d8] border border-[#2a2a3d] hover:border-[#3a3a4d] rounded-lg transition">
            ← Back
          </button>
        )}
        <button onClick={onNext}
          className="flex-1 py-2 text-xs font-semibold rounded-lg text-white transition"
          style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
          {step === total - 1 ? '✓ Got it' : 'Next →'}
        </button>
      </div>
    </div>
  );
}

// Floating "?" button to re-open tour
export function TourReopen() {
  const tour = useTour();
  if (!tour || tour.isOpen) return null;
  return (
    <button
      onClick={tour.open}
      className="fixed bottom-6 right-6 z-50 w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-indigo-300 transition hover:scale-110"
      style={{
        background: 'rgba(99,102,241,0.15)',
        border: '1px solid rgba(99,102,241,0.4)',
        boxShadow: '0 0 20px rgba(99,102,241,0.2)',
      }}
      title="Open guided tour"
    >
      ?
    </button>
  );
}
