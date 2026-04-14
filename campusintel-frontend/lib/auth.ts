/**
 * lib/auth.ts
 * Centralised auth state using localStorage.
 * Stores the full student object so pages can read profile without extra API calls.
 */

const STUDENT_KEY = 'ci_student';

export interface StudentProfile {
  id: string;
  name: string;
  email: string;
  college_id: string;
  role: string;
  branch?: string | null;
  cgpa?: number | null;
  batch_year?: number | null;
  current_state?: string;
  confidence_score?: number;
  inferred_skills?: Record<string, number>;
  updated_at?: string;
}

/** Store student profile after login/register */
export function setStudent(student: StudentProfile): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STUDENT_KEY, JSON.stringify(student));
  // Notify any listeners (e.g. dashboard) that profile changed
  window.dispatchEvent(new CustomEvent('ci:profile-updated', { detail: student }));
}

/** Get stored student profile (null if not logged in) */
export function getStudent(): StudentProfile | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(STUDENT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StudentProfile;
  } catch {
    return null;
  }
}

/** Get just the student ID */
export function getStudentId(): string | null {
  return getStudent()?.id ?? null;
}

/** Get the college ID */
export function getCollegeId(): string {
  return getStudent()?.college_id ?? 'college-lpu-001';
}

/** Is the user currently logged in? */
export function isLoggedIn(): boolean {
  return getStudent() !== null;
}

/** Update stored profile fields (e.g. after resume upload) */
export function updateStudentProfile(updates: Partial<StudentProfile>): void {
  const current = getStudent();
  if (!current) return;
  setStudent({ ...current, ...updates }); // setStudent already dispatches the event
}

/** Log out — clear local storage and redirect */
export function logout(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STUDENT_KEY);
  window.location.href = '/login';
}
