'use client';
import { useState, useRef } from 'react';
import { api } from '@/lib/api';
import { updateStudentProfile } from '@/lib/auth';

type ResumeUploaderProps = {
  studentId?: string;
  onSkillsExtracted?: (skills: Record<string, number>) => void;
};

export default function ResumeUploader({
  studentId,
  onSkillsExtracted,
}: ResumeUploaderProps) {
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    if (!studentId) {
      setErrorMsg('You must be logged in to upload a resume.');
      setStatus('error');
      return;
    }
    if (file.type !== 'application/pdf') {
      setErrorMsg('Please upload a PDF file.');
      setStatus('error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('File size must be under 5MB.');
      setStatus('error');
      return;
    }

    setFileName(file.name);
    setStatus('uploading');
    setErrorMsg('');

    try {
      // FileReader handles large files reliably without stack overflow
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]); // strip "data:application/pdf;base64," prefix
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });

      const res = await api.uploadResume(studentId, base64);

      if (res.success) {
        setResult(res);
        setStatus('success');
        // Sync the inferred skills into localStorage so dashboard updates immediately
        if (res.inferred_skills && Object.keys(res.inferred_skills).length > 0) {
          updateStudentProfile({
            inferred_skills: res.inferred_skills,
            current_state: 'PROFILED',
          });
        }
        onSkillsExtracted?.(res.inferred_skills);
      } else {
        setErrorMsg(res.error || 'Upload failed. Try again.');
        setStatus('error');
      }
    } catch (err: any) {
      setErrorMsg(`Error: ${err?.message || String(err)}`);
      setStatus('error');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  // Sort skills by proficiency for display
  const sortedSkills = result?.inferred_skills
    ? Object.entries(result.inferred_skills as Record<string, number>)
        .sort(([, a], [, b]) => b - a)
    : [];

  if (status === 'success' && result) {
    return (
      <div className="bg-[#0a0a14] border border-emerald-500/30 rounded-2xl p-6 space-y-4 animate-fade-in-up">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-lg">✓</div>
          <div>
            <div className="text-sm font-bold text-white">Resume Parsed!</div>
            <div className="text-xs text-emerald-400">{result.skills_extracted} skills extracted from {fileName}</div>
          </div>
          <button
            onClick={() => { setStatus('idle'); setResult(null); setFileName(''); }}
            className="ml-auto text-xs text-[#6b7280] hover:text-white transition"
          >
            Upload another
          </button>
        </div>

        <div>
          <div className="text-xs font-mono text-[#6b7280] uppercase tracking-widest mb-3">Inferred Skills Profile</div>
          <div className="space-y-2">
            {sortedSkills.slice(0, 10).map(([skill, level]) => (
              <div key={skill} className="flex items-center gap-3">
                <span className="text-xs font-mono text-[#9b9bbb] w-28 truncate">{skill}</span>
                <div className="flex-1 bg-[#1e1e30] rounded-full h-1.5">
                  <div
                    className="h-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-700"
                    style={{ width: `${(level * 100).toFixed(0)}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-indigo-400 w-8 text-right">
                  {(level * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="text-xs text-[#4b4b6b] bg-[#05050a] rounded-xl p-3 border border-[#1e1e30] font-mono">
          {result.resume_preview}
        </div>
      </div>
    );
  }

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-200 ${
        dragOver
          ? 'border-indigo-500 bg-indigo-500/10'
          : status === 'uploading'
            ? 'border-amber-500/40 bg-amber-500/5'
            : status === 'error'
              ? 'border-red-500/40 bg-red-500/5'
              : 'border-[#2a2a3d] bg-[#0a0a14] hover:border-indigo-500/40 hover:bg-indigo-500/5'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={handleFileInput}
      />

      {status === 'uploading' ? (
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin w-8 h-8 text-amber-400" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          <div className="text-sm font-medium text-amber-300">Extracting skills from {fileName}...</div>
          <div className="text-xs text-[#6b7280]">Grok AI is reading your resume</div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className={`text-4xl transition-transform ${dragOver ? 'scale-125' : ''}`}>📄</div>
          <div>
            <div className="text-sm font-semibold text-[#c4c4d8] mb-1">
              {dragOver ? 'Drop to upload' : 'Upload Resume PDF'}
            </div>
            <div className="text-xs text-[#4b4b6b]">
              Drag & drop or click · PDF only · Max 5MB
            </div>
          </div>
          {status === 'error' && (
            <div className="text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/30">
              ⚠️ {errorMsg}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
