-- ============================================================
-- CampusIntel Demo Seed Data
-- Run this in Supabase SQL Editor before the presentation
-- ============================================================

-- 3 additional students (gives TPC dashboard a realistic spread)
INSERT INTO users (id, college_id, name, email, branch, batch_year, cgpa, 
                   inferred_skills, current_state, confidence_score)
VALUES 
('student-priya-001', 'college-lpu-001', 'Priya Mehta', 'priya@lpu.in',
 'CSE', 2025, 9.1,
 '{"dsa": 0.8, "system_design": 0.75, "dbms": 0.7, "os": 0.65, "sql": 0.9, "behavioral": 0.7}'::jsonb,
 'INTERVIEW_READY', 0.82),

('student-arjun-001', 'college-lpu-001', 'Arjun Patel', 'arjun@lpu.in',
 'ECE', 2025, 7.1,
 '{"dsa": 0.3, "system_design": 0.1, "dbms": 0.5, "os": 0.4, "sql": 0.6, "behavioral": 0.4}'::jsonb,
 'ASSESSED', 0.32),

('student-meera-001', 'college-lpu-001', 'Meera Singh', 'meera@lpu.in',
 'IT', 2025, 7.8,
 '{"dsa": 0.6, "system_design": 0.4, "dbms": 0.8, "os": 0.55, "sql": 0.7, "behavioral": 0.6}'::jsonb,
 'PREPARING', 0.58)
ON CONFLICT (id) DO UPDATE SET
  confidence_score = EXCLUDED.confidence_score,
  current_state = EXCLUDED.current_state,
  inferred_skills = EXCLUDED.inferred_skills;

-- Register all 3 for the Google demo drive
INSERT INTO student_registrations (student_id, drive_id, college_id, status)
VALUES 
('student-priya-001', 'demo-drive-google', 'college-lpu-001', 'registered'),
('student-arjun-001', 'demo-drive-google', 'college-lpu-001', 'registered'),
('student-meera-001', 'demo-drive-google', 'college-lpu-001', 'registered')
ON CONFLICT DO NOTHING;

-- A verified debrief from Priya (makes Campus Pulse have real data)
INSERT INTO interview_debriefs 
(college_id, company_id, student_id, round_type, questions_asked, outcome,
 difficulty_rating, extracted_topics, success_factors, is_verified)
VALUES
('college-lpu-001', 'company-google-001', 'student-priya-001',
 'technical_1',
 'Was asked to implement an LRU Cache. Then a follow up on time complexity. Then a graph problem — shortest path with constraints.',
 'selected', 4,
 '{"technical": ["lru_cache", "graphs", "shortest_path", "time_complexity"]}'::jsonb,
 'Explained approach completely before writing code. Drew the data structure first. Handled follow-up without panicking.',
 true)
ON CONFLICT DO NOTHING;

-- Extra Google debriefs to push debrief_count from 8 to 10 (raises confidence level)
INSERT INTO interview_debriefs 
(college_id, company_id, student_id, round_type, questions_asked, outcome,
 difficulty_rating, extracted_topics, success_factors, is_verified)
VALUES
('college-lpu-001', 'company-google-001', 'student-meera-001',
 'technical_2',
 'System design of URL shortener. Then asked to optimise it for scale. Then a DP problem — longest common subsequence.',
 'rejected', 4,
 '{"technical": ["system_design", "url_shortener", "dp", "lcs"]}'::jsonb,
 NULL,
 true)
ON CONFLICT DO NOTHING;

-- Seed strategy weights so SELECT_STRATEGY step shows real data
INSERT INTO strategy_weights (college_id, company_id, student_profile_type, strategy, weight, win_rate, sample_size)
VALUES
('college-lpu-001', 'company-google-001', 'LOW_CONFIDENCE',    'BRIEF_ASSESS_SESSION', 0.72, 0.58, 12),
('college-lpu-001', 'company-google-001', 'MEDIUM_CONFIDENCE', 'BRIEF_ASSESS',         0.67, 0.64, 18),
('college-lpu-001', 'company-google-001', 'HIGH_CONFIDENCE',   'BRIEF_ONLY',           0.81, 0.79, 9),
('college-lpu-001', 'company-google-001', 'NO_DATA',           'BRIEF_ASSESS_SESSION', 0.55, 0.42, 5)
ON CONFLICT (college_id, company_id, student_profile_type, strategy) 
DO UPDATE SET weight = EXCLUDED.weight, win_rate = EXCLUDED.win_rate;

-- ============================================================
-- Verify your seed worked:
-- SELECT name, current_state, confidence_score FROM users WHERE college_id = 'college-lpu-001';
-- SELECT count(*) FROM interview_debriefs WHERE company_id = 'company-google-001';
-- ============================================================
