'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

export default function TpcDashboard({ isDemoActive, contextName = 'Rahul' }: { isDemoActive: boolean, contextName?: string }) {
  const [weights, setWeights] = useState<any[]>([]);
  const [recording, setRecording] = useState(false);

  useEffect(() => {
    loadData();
  }, [isDemoActive]);

  const loadData = async () => {
    try {
      const w = await api.getStrategyWeights();
      setWeights(w);
    } catch { /* ignore */ }
  };

  const handleOutcome = async (outcome: string) => {
    setRecording(true);
    try {
      await api.recordOutcome('demo-student-rahul', 'demo-drive-google', outcome);
      await loadData();
    } finally {
      setRecording(false);
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 h-[500px] overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white">TPC Admin Dashboard</h2>
        <span className="text-xs text-gray-500">Live LPU Data</span>
      </div>

      <div className="mb-8">
        <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">Record Outcome ({contextName})</h3>
        <div className="flex gap-3">
          <button 
            onClick={() => handleOutcome('selected')}
            disabled={recording}
            className="flex-1 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 border border-emerald-600/50 py-3 rounded-lg font-semibold transition disabled:opacity-50"
          >
            ✅ Mark Selected
          </button>
          <button 
            onClick={() => handleOutcome('rejected')}
            disabled={recording}
            className="flex-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-600/50 py-3 rounded-lg font-semibold transition disabled:opacity-50"
          >
            ❌ Mark Rejected
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">Recording an outcome triggers the agent's learning loop instantly.</p>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">🧠 Live Strategy Weights</h3>
        <div className="space-y-2">
          {weights?.map((w, i) => (
            <div key={i} className="flex items-center justify-between bg-gray-800 p-3 rounded-lg border border-gray-700">
              <div>
                <div className="text-sm font-medium text-white">{w.strategy}</div>
                <div className="text-xs text-gray-400">{w.student_profile_type}</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-blue-400">{w.weight.toFixed(2)}w</div>
                <div className="text-xs text-gray-500">{w.win_rate.toFixed(1)} win rate ({w.times_successful}/{w.times_used})</div>
              </div>
            </div>
          ))}
          {weights.length === 0 && <div className="text-sm text-gray-500">Loading weights...</div>}
        </div>
      </div>
    </div>
  );
}
