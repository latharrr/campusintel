// campusintel-frontend/lib/api.ts — Production API client
import { getToken } from './auth';

const RawApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API_URL = RawApiUrl.replace(/\/+$/, '');

function buildHeaders(includeJsonContentType = false) {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (includeJsonContentType) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function post(path: string, body?: object) {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: buildHeaders(true),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

async function get(path: string) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: buildHeaders(false),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  // ── Agent ──────────────────────────────────────────────────────
  triggerDemo: () => post('/api/agent/trigger-demo'),
  getAgentLogs: (sessionId: string) => get(`/api/agent/logs/${sessionId}`),
  getAgentStatus: () => get(`/api/agent/status`),
  triggerAgentForStudent: (studentId: string, driveId: string) =>
    post('/api/agent/trigger', { studentId, driveId }),

  // ── Auth ───────────────────────────────────────────────────────
  login: (email: string) => post('/api/student/login', { email }),
  register: (data: {
    name: string; email: string; collegeId?: string;
    branch?: string; batchYear?: number; cgpa?: number;
  }) => post('/api/student/register', data),

  // ── Student ────────────────────────────────────────────────────
  getStudent: (studentId: string) => get(`/api/student/${studentId}`),
  getStudentRegistrations: (studentId: string) =>
    get(`/api/student/${studentId}/registrations`),
  uploadResume: (studentId: string, pdfBase64: string) =>
    post('/api/student/upload-resume', { studentId, pdfBase64 }),

  // ── Drives ────────────────────────────────────────────────────
  getDrives: (collegeId: string) => get(`/api/drives/${collegeId}`),
  getDriveDetail: (driveId: string) => get(`/api/drives/${driveId}/detail`),
  registerForDrive: (driveId: string, studentId: string) =>
    post(`/api/drives/${driveId}/register`, { studentId }),
  getDriveRegistrations: (driveId: string) =>
    get(`/api/drives/${driveId}/registrations`),

  // ── TPC ───────────────────────────────────────────────────────
  recordOutcome: (studentId: string, driveId: string, outcome: string) =>
    post('/api/tpc/record-outcome', { studentId, driveId, outcome }),
  getStudents: (collegeId: string) => get(`/api/tpc/students/${collegeId}`),
  getAlerts: (collegeId: string) => get(`/api/tpc/alerts/${collegeId}`),
  getStrategyWeights: (
    collegeId = 'college-lpu-001',
    companyId = 'company-google-001'
  ) => get(`/api/tpc/strategy-weights/${collegeId}/${companyId}`),
  getBrief: (studentId: string) => get(`/api/tpc/briefs/${studentId}`),

  // ── Debriefs ──────────────────────────────────────────────────
  submitDebrief: (data: {
    driveId: string; collegeId: string; companyId: string;
    roundType: string; questionsAsked: string; topicsCovered: string[];
    outcome: string; difficultyRating: number; studentId?: string;
  }) => post('/api/debriefs', data),
  getDebriefs: (collegeId: string, companyId: string) =>
    get(`/api/debriefs/${collegeId}/${companyId}`),
};
