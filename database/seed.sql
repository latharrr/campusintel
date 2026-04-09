-- ============================================================
-- CampusIntel — Seed Data for Demo
-- Run this AFTER schema.sql
-- Run in: Supabase → SQL Editor → New Query
-- ============================================================

-- ── 1. College ────────────────────────────────────────────────
insert into colleges (id, name, short_name, domain, tpc_email, city, state, tier)
values (
  'college-lpu-001',
  'Lovely Professional University',
  'LPU',
  'lpu.in',
  'tpc@lpu.in',
  'Jalandhar',
  'Punjab',
  2
) on conflict (id) do nothing;

-- ── 2. Companies ──────────────────────────────────────────────
insert into companies (id, name, normalized_name, sector, company_type) values
  ('company-google-001',  'Google',  'google',  'tech', 'product'),
  ('company-infosys-001', 'Infosys', 'infosys', 'tech', 'service'),
  ('company-wipro-001',   'Wipro',   'wipro',   'tech', 'service')
on conflict (id) do nothing;

-- ── 3. TPC Admin ──────────────────────────────────────────────
insert into users (id, college_id, name, email, role, branch)
values (
  'tpc-admin-lpu-001',
  'college-lpu-001',
  'TPC Admin LPU',
  'tpc@lpu.in',
  'tpc_admin',
  null
) on conflict (id) do nothing;

-- ── 4. Demo Student — Rahul (Low Confidence, Critical Gap) ───
insert into users (
  id, college_id, name, email, role, branch, batch_year, cgpa,
  current_state, confidence_score, inferred_skills
) values (
  'demo-student-rahul',
  'college-lpu-001',
  'Rahul Sharma',
  'rahul@lpu.in',
  'student',
  'CSE',
  2025,
  7.8,
  'TARGETED',
  0.38,
  '{
    "dsa": 0.55,
    "system_design": 0.15,
    "dbms": 0.70,
    "os": 0.60,
    "sql": 0.80,
    "behavioral": 0.65
  }'::jsonb
) on conflict (id) do nothing;

-- ── 5. Demo Student — Priya (High Confidence, No Gaps) ───────
insert into users (
  id, college_id, name, email, role, branch, batch_year, cgpa,
  current_state, confidence_score, inferred_skills
) values (
  'demo-student-priya',
  'college-lpu-001',
  'Priya Mehta',
  'priya@lpu.in',
  'student',
  'CSE',
  2025,
  9.1,
  'TARGETED',
  0.82,
  '{
    "dsa": 0.85,
    "system_design": 0.80,
    "dbms": 0.90,
    "os": 0.75,
    "sql": 0.88,
    "behavioral": 0.80
  }'::jsonb
) on conflict (id) do nothing;

-- ── 6. Campus Drive (Google, ~68 hours from now) ─────────────
insert into campus_drives (
  id, college_id, company_id, drive_date, roles_offered,
  eligible_branches, min_cgpa, package_offered, round_structure, status
) values (
  'demo-drive-google',
  'college-lpu-001',
  'company-google-001',
  now() + interval '68 hours',
  ARRAY['SDE', 'Software Engineer'],
  ARRAY['CSE', 'ECE', 'IT'],
  7.0,
  '30-40 LPA',
  '[
    {"round":1,"type":"online_test","duration_mins":90},
    {"round":2,"type":"technical_1","duration_mins":45},
    {"round":3,"type":"system_design","duration_mins":60},
    {"round":4,"type":"hr","duration_mins":30}
  ]'::jsonb,
  'upcoming'
) on conflict (id) do nothing;

-- ── 7. Student Registrations ──────────────────────────────────
insert into student_registrations (student_id, drive_id, college_id, status)
values
  ('demo-student-rahul', 'demo-drive-google', 'college-lpu-001', 'registered'),
  ('demo-student-priya', 'demo-drive-google', 'college-lpu-001', 'registered')
on conflict (student_id, drive_id) do nothing;

-- ── 8. Interview Debriefs ─────────────────────────────────────
-- 3 verified for Rahul's path (below threshold=5 → forces fallback)
-- 8 verified for Priya's path (above threshold=5 → no fallback)

-- Rahul's 3 debriefs (from prev students at LPU-Google)
insert into interview_debriefs
(college_id, company_id, round_type, questions_asked, outcome, difficulty_rating,
 extracted_topics, success_factors, is_verified)
values
(
  'college-lpu-001', 'company-google-001', 'technical_1',
  'Arrays and two pointers. Merge intervals. Optimize from O(n²) to O(n log n).',
  'selected', 4,
  '{"technical":["arrays","two_pointers","sorting"],"difficulty":{"dsa":4}}'::jsonb,
  'Explained approach before coding. Handled edge cases. Discussed time complexity.',
  true
),
(
  'college-lpu-001', 'company-google-001', 'technical_1',
  'Dynamic programming - coin change and LCS. Brief system design at end.',
  'rejected', 4,
  '{"technical":["dp","system_design"],"difficulty":{"dsa":4,"system_design":4}}'::jsonb,
  null, true
),
(
  'college-lpu-001', 'company-google-001', 'system_design',
  'Design Google Drive. Scalability, storage, sharing permissions. 60 mins.',
  'selected', 5,
  '{"technical":["system_design","distributed_systems","storage"],"difficulty":{"system_design":5}}'::jsonb,
  'Drew architecture first. Knew CAP theorem. Discussed trade-offs explicitly.',
  true
);

-- 5 extra debriefs (for Priya's high-confidence path — 8 total verified above threshold)
insert into interview_debriefs
(college_id, company_id, round_type, questions_asked, outcome, difficulty_rating,
 extracted_topics, success_factors, is_verified)
values
(
  'college-lpu-001', 'company-google-001', 'technical_2',
  'Graph traversal BFS/DFS. Shortest path Dijkstra. Detect cycle in directed graph.',
  'selected', 4,
  '{"technical":["graphs","bfs","dfs","dijkstra"],"difficulty":{"dsa":4}}'::jsonb,
  'Strong fundamentals. Coded Dijkstra without hints.',
  true
),
(
  'college-lpu-001', 'company-google-001', 'system_design',
  'Design a rate limiter. Token bucket vs leaky bucket. Redis usage.',
  'selected', 5,
  '{"technical":["system_design","rate_limiting","redis"],"difficulty":{"system_design":5}}'::jsonb,
  'Knew trade-offs between algorithms. Mentioned consistency issues.',
  true
),
(
  'college-lpu-001', 'company-google-001', 'technical_1',
  'Trie implementation. Word search problem. Segment trees intro.',
  'selected', 4,
  '{"technical":["trie","trees","advanced_dsa"],"difficulty":{"dsa":4}}'::jsonb,
  'Clean code. Named variables well. Thought aloud throughout.',
  true
),
(
  'college-lpu-001', 'company-google-001', 'online_test',
  '3 DSA problems in 90 mins. Arrays, DP, graphs. 2 solved fully, 1 partial.',
  'selected', 3,
  '{"technical":["arrays","dp","graphs"],"difficulty":{"online_test":3}}'::jsonb,
  'Time management. Brute force → optimize pattern.',
  true
),
(
  'college-lpu-001', 'company-google-001', 'hr',
  'Why Google? Leadership experience. Project where you failed.',
  'selected', 2,
  '{"behavioral":["leadership","failure_handling","motivation"],"difficulty":{"behavioral":2}}'::jsonb,
  'Authentic answers. Clear STAR format.',
  true
);

-- ── 9. Pre-synthesized Intel (skip synthesis step in demo) ────
insert into college_company_intel (
  college_id, company_id,
  debrief_count, local_debrief_count, global_debrief_count,
  last_synthesized, confidence_level,
  top_topics, selection_rate, avg_rounds
) values (
  'college-lpu-001', 'company-google-001',
  8, 8, 0,
  now(),
  'MEDIUM',
  '[
    {"topic":"system_design","frequency":0.75,"difficulty":4.5,"priority":1},
    {"topic":"dsa","frequency":0.87,"difficulty":3.8,"priority":2},
    {"topic":"arrays","frequency":0.87,"difficulty":3.5,"priority":3},
    {"topic":"graphs","frequency":0.62,"difficulty":4.0,"priority":4},
    {"topic":"dp","frequency":0.50,"difficulty":4.0,"priority":5},
    {"topic":"behavioral","frequency":0.87,"difficulty":2.0,"priority":6}
  ]'::jsonb,
  0.71,
  4
) on conflict (college_id, company_id) do nothing;

-- ── 10. Strategy Weights (pre-populated) ──────────────────────
insert into strategy_weights
(college_id, company_id, strategy, student_profile_type, times_used, times_successful, win_rate, weight)
values
  ('college-lpu-001','company-google-001','BRIEF_ONLY',        'HIGH_CONFIDENCE',  3, 2, 0.667, 2.00),
  ('college-lpu-001','company-google-001','BRIEF_ASSESS',      'MEDIUM_CONFIDENCE',4, 2, 0.500, 1.50),
  ('college-lpu-001','company-google-001','BRIEF_ASSESS_SESSION','LOW_CONFIDENCE', 2, 1, 0.500, 1.50),
  ('college-lpu-001','company-google-001','BRIEF_ONLY',        'NO_DATA',          1, 0, 0.000, 0.50)
on conflict (college_id, company_id, strategy, student_profile_type) do nothing;

-- ============================================================
-- ✅ Seed complete.
-- 
-- Verify with:
--   select count(*) from interview_debriefs;  → should be 8
--   select count(*) from users;               → should be 4
--   select count(*) from strategy_weights;    → should be 4
-- ============================================================
