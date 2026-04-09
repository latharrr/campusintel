const RAwApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API_URL = RAwApiUrl.replace(/\/+$/, ''); // Remove any trailing slash

async function post(path: string) {
  const res = await fetch(`${API_URL}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
  return res.json();
}

async function get(path: string) {
  const res = await fetch(`${API_URL}${path}`);
  return res.json();
}

export const api = {
  triggerDemo: () => post('/api/agent/trigger-demo'),
  triggerLowData: () => post('/api/agent/trigger-demo-low-data'),
  triggerHighConfidence: () => post('/api/agent/trigger-demo-high-confidence'),
  getAgentLogs: (sessionId: string) => get(`/api/agent/logs/${sessionId}`),
  recordOutcome: (studentId: string, driveId: string, outcome: string) =>
    post(`/api/tpc/record-outcome`),
  getStudents: (collegeId: string) => get(`/api/tpc/students/${collegeId}`),
  getAlerts: (collegeId: string) => get(`/api/tpc/alerts/${collegeId}`),
  getStrategyWeights: () => get(`/api/tpc/strategy-weights/college-lpu-001/company-google-001`),
  getBrief: (studentId: string) => get(`/api/tpc/briefs/${studentId}`),
  getAgentStatus: () => get(`/api/agent/status`),
};
