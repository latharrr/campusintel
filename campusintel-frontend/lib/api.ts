const RAwApiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://campusintel-production.up.railway.app';
const API_URL = RAwApiUrl.replace(/\/+$/, ''); // Remove any trailing slash

async function post(path: string, body?: object) {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
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
    post(`/api/tpc/record-outcome`, { studentId, driveId, outcome }),
  getStudents: (collegeId: string) => get(`/api/tpc/students/${collegeId}`),
  getAlerts: (collegeId: string) => get(`/api/tpc/alerts/${collegeId}`),
  getStrategyWeights: () => get(`/api/tpc/strategy-weights/college-lpu-001/company-google-001`),
  getBrief: (studentId: string) => get(`/api/tpc/briefs/${studentId}`),
  getAgentStatus: () => get(`/api/agent/status`),

  // New: Debrief submission
  submitDebrief: (data: {
    driveId: string; collegeId: string; companyId: string;
    roundType: string; questionsAsked: string; topicsCovered: string[];
    outcome: string; difficultyRating: number; studentId?: string;
  }) => post('/api/debriefs', data),
  getDebriefs: (collegeId: string, companyId: string) =>
    get(`/api/debriefs/${collegeId}/${companyId}`),

  // New: Resume upload
  uploadResume: (studentId: string, pdfBase64: string) =>
    post('/api/student/upload-resume', { studentId, pdfBase64 }),
  getStudent: (studentId: string) => get(`/api/student/${studentId}`),
};

