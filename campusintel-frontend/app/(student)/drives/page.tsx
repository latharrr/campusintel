'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { getStudent } from '@/lib/auth';
import Link from 'next/link';

interface Drive {
  id: string;
  drive_date: string;
  status: string;
  package_offered?: string;
  roles_offered?: string[];
  eligible_branches?: string[];
  round_structure?: Array<{ round: number; type: string }>;
  company: { id: string; name: string; website?: string; normalized_name?: string };
  registration_status?: string;
}

const STATUS_STYLE: Record<string, string> = {
  'registered': 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
  'upcoming': 'bg-transparent border-[#3a3a4d] text-[#6b7280]',
  'selected': 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400',
  'rejected': 'bg-red-500/10 border-red-500/30 text-red-400',
};

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-[#2a2a3d] rounded-lg ${className}`} />;
}

export default function DrivesPage() {
  const [drives, setDrives] = useState<Drive[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All Status');
  const [registering, setRegistering] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const student = getStudent();
        const collegeId = student?.college_id || 'college-lpu-001';
        const data = await api.getDrives(collegeId);
        if (Array.isArray(data)) {
          // Fetch registration statuses for this student
          if (student?.id) {
            const regs = await api.getStudentRegistrations(student.id);
            const regMap: Record<string, string> = {};
            if (Array.isArray(regs)) {
              for (const r of regs) {
                regMap[r.drive_id] = r.status;
              }
            }
            setDrives(data.map(d => ({
              ...d,
              company: d.companies || d.company || { id: d.company_id, name: 'Unknown' },
              registration_status: regMap[d.id] || d.status || 'upcoming',
            })));
          } else {
            setDrives(data.map(d => ({
              ...d,
              company: d.companies || d.company || { id: d.company_id, name: 'Unknown' },
              registration_status: d.status || 'upcoming',
            })));
          }
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load drives');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleRegister = async (driveId: string) => {
    const student = getStudent();
    if (!student?.id) return;
    setRegistering(driveId);
    try {
      await api.registerForDrive(driveId, student.id);
      setDrives(prev =>
        prev.map(d => d.id === driveId ? { ...d, registration_status: 'registered' } : d)
      );
    } catch (err: any) {
      alert('Registration failed: ' + err.message);
    } finally {
      setRegistering(null);
    }
  };

  const filtered = drives.filter(d => {
    const matchSearch = !search ||
      d.company?.name?.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === 'All Status' ||
      (filter === 'Registered' && d.registration_status === 'registered') ||
      (filter === 'Not Registered' && d.registration_status !== 'registered');
    return matchSearch && matchFilter;
  });

  const daysUntil = (dateStr: string) => {
    const days = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
    return days;
  };

  return (
    <div className="p-8 max-w-[1100px] mx-auto">
      <h1 className="font-display text-3xl text-[#e8e6f8] mb-2">Campus Drives</h1>
      <p className="text-[#6b7280] text-sm mb-8">All upcoming placement drives at your college</p>

      {error && (
        <div className="mb-6 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="flex gap-3 mb-8">
        <input
          placeholder="Search company..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 max-w-xs h-10 rounded-lg bg-[#0f0f1a] border border-[#2a2a3d] px-3 text-sm text-[#e8e6f8] placeholder:text-[#4b4b6b] outline-none focus:border-indigo-500/60 transition"
        />
        {['All Status', 'Registered', 'Not Registered'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 h-10 rounded-lg border text-sm transition ${
              filter === f
                ? 'border-indigo-500/60 text-indigo-300 bg-indigo-500/10'
                : 'border-[#2a2a3d] text-[#6b7280] hover:text-[#c4c4d8] hover:border-indigo-500/40 bg-[#0f0f1a]'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-56 w-full rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-[#4b4b6b]">
          <p className="text-lg mb-2">No drives found</p>
          <p className="text-sm">
            {search ? 'Try a different search term' : 'No upcoming drives scheduled'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {filtered.map(d => {
            const days = daysUntil(d.drive_date);
            const isRegistrationClosed = d.status === 'completed';
            const logoHost = d.company?.website
              ? d.company.website.replace(/^https?:\/\//, '').split('/')[0]
              : `${d.company?.normalized_name || d.company?.name?.toLowerCase()}.com`;

            return (
              <div
                key={d.id}
                className="card-dark rounded-2xl p-5 hover:border-indigo-500/30 hover:bg-indigo-500/[0.03] transition-all"
              >
                <div className="flex items-start gap-3 mb-4">
                  <img
                    src={`https://logo.clearbit.com/${logoHost}`}
                    alt={d.company?.name}
                    className="w-10 h-10 rounded-xl bg-[#2a2a3d]"
                    onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[#e8e6f8]">{d.company?.name}</div>
                    <div className="text-[11px] text-[#6b7280]">
                      {new Date(d.drive_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      {days > 0 ? ` · ${days}d away` : days === 0 ? ' · Today!' : ' · Completed'}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  {d.package_offered && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#6b7280]">Package</span>
                      <span className="text-indigo-300 font-semibold">{d.package_offered}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#6b7280]">Rounds</span>
                    <span className="text-[#c4c4d8]">
                      {d.round_structure?.length || '—'} rounds
                    </span>
                  </div>
                </div>

                {d.eligible_branches && d.eligible_branches.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {d.eligible_branches.slice(0, 4).map(b => (
                      <span
                        key={b}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-[#1a1a2e] border border-[#2a2a3d] text-[#9b9bbb]"
                      >
                        {b}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_STYLE[d.registration_status || 'upcoming'] || STATUS_STYLE.upcoming}`}>
                    {d.registration_status === 'registered' ? 'Registered' : 'Not Registered'}
                  </span>
                  {d.registration_status === 'registered' ? (
                    <Link
                      href={`/briefs/${d.id}`}
                      className="text-xs text-indigo-400 hover:text-indigo-300 transition"
                    >
                      View Brief →
                    </Link>
                  ) : (
                    <button
                      disabled={registering === d.id || isRegistrationClosed}
                      onClick={() => handleRegister(d.id)}
                      className="text-xs text-[#6b7280] hover:text-[#c4c4d8] border border-[#2a2a3d] hover:border-indigo-500/40 px-3 py-1 rounded-lg transition disabled:opacity-50"
                    >
                      {registering === d.id ? 'Registering...' : isRegistrationClosed ? 'Closed' : 'Register →'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
